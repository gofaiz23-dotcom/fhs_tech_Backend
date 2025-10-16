import Queue from 'bull';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import ProductModel from '../models/Product.js';
import ManagementLogger from '../utils/managementLogger.js';
import { prisma } from '../config/database.js';

class QueueService {
  constructor() {
    // Redis configuration
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxLoadingTimeout: 1000
    };

    this.redis = new Redis(this.redisConfig);
    
    // Initialize queues
    this.queues = {
      productBulk: new Queue('product bulk processing', this.redisConfig),
      pricingBulk: new Queue('pricing bulk processing', this.redisConfig),
      imageBulk: new Queue('image bulk processing', this.redisConfig)
    };

    this.setupQueueProcessors();
    this.setupQueueEvents();
  }

  setupQueueProcessors() {
    // Product bulk processing
    this.queues.productBulk.process('bulk-create-products', 5, async (job) => {
      const { data } = job;
      return await this.processBulkProducts(data);
    });

    // Pricing bulk processing
    this.queues.pricingBulk.process('bulk-update-pricing', 10, async (job) => {
      const { data } = job;
      return await this.processBulkPricing(data);
    });

    // Image bulk processing
    this.queues.imageBulk.process('bulk-upload-images', 3, async (job) => {
      const { data } = job;
      return await this.processBulkImages(data);
    });
  }

  setupQueueEvents() {
    Object.values(this.queues).forEach(queue => {
      queue.on('completed', (job, result) => {
        console.log(`✅ Job ${job.id} completed:`, result.summary);
      });

      queue.on('failed', (job, err) => {
        console.error(`❌ Job ${job.id} failed:`, err.message);
      });

      queue.on('progress', (job, progress) => {
        console.log(`📊 Job ${job.id} progress: ${progress}%`);
      });
    });
  }

  // Add bulk product creation job
  async addBulkProductJob(data, userId) {
    const jobId = uuidv4();
    const job = await this.queues.productBulk.add('bulk-create-products', {
      jobId,
      userId,
      ...data
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 10,
      removeOnFail: 5
    });

    return {
      jobId: job.id,
      status: 'queued',
      message: 'Bulk product creation job queued successfully'
    };
  }

  // Add bulk pricing job
  async addBulkPricingJob(data, userId) {
    const jobId = uuidv4();
    const job = await this.queues.pricingBulk.add('bulk-update-pricing', {
      jobId,
      userId,
      ...data
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 10,
      removeOnFail: 5
    });

    return {
      jobId: job.id,
      status: 'queued',
      message: 'Bulk pricing update job queued successfully'
    };
  }

  // Add bulk image upload job
  async addBulkImageJob(data, userId) {
    const jobId = uuidv4();
    const job = await this.queues.imageBulk.add('bulk-upload-images', {
      jobId,
      userId,
      ...data
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 10,
      removeOnFail: 5
    });

    return {
      jobId: job.id,
      status: 'queued',
      message: 'Bulk image upload job queued successfully'
    };
  }

  // Get job status
  async getJobStatus(queueName, jobId) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return {
        status: 'not_found',
        message: 'Job not found'
      };
    }

    const state = await job.getState();
    const progress = job._progress;

    return {
      jobId: job.id,
      status: state,
      progress: progress,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : null,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : null
    };
  }

  // Get all jobs for a user
  async getUserJobs(userId) {
    const allJobs = [];

    for (const [queueName, queue] of Object.entries(this.queues)) {
      const jobs = await queue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const userJobs = jobs.filter(job => job.data.userId === userId);
      
      for (const job of userJobs) {
        const state = await job.getState();
        allJobs.push({
          jobId: job.id,
          queueName,
          status: state,
          progress: job._progress,
          createdAt: new Date(job.timestamp),
          data: job.data
        });
      }
    }

    return allJobs.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Process bulk products
  async processBulkProducts(data) {
    const { jobId, userId, fileData, userRole } = data;
    
    try {
      console.log(`🚀 Starting bulk product processing - Job ID: ${jobId}`);
      
      const batchSize = 100;
      const totalProducts = fileData.length;
      let processedCount = 0;
      let createdCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;
      const errors = [];
      const duplicates = [];
      const created = [];

      // Process in batches
      for (let i = 0; i < totalProducts; i += batchSize) {
        const batch = fileData.slice(i, i + batchSize);
        const batchResults = await this.processProductBatch(batch, userId, userRole);
        
        processedCount += batch.length;
        createdCount += batchResults.created.length;
        errorCount += batchResults.errors.length;
        duplicateCount += batchResults.duplicates.length;
        
        created.push(...batchResults.created);
        errors.push(...batchResults.errors);
        duplicates.push(...batchResults.duplicates);
        
        const progress = Math.round((processedCount / totalProducts) * 100);
        console.log(`📈 Progress: ${progress}% (${processedCount}/${totalProducts})`);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return {
        jobId,
        summary: {
          total: totalProducts,
          processed: processedCount,
          created: createdCount,
          errors: errorCount,
          duplicates: duplicateCount,
          successRate: `${Math.round((createdCount / totalProducts) * 100)}%`
        },
        results: {
          created: created.slice(0, 10),
          errors: errors.slice(0, 20),
          duplicates: duplicates.slice(0, 10)
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Bulk product processing failed - Job ID: ${jobId}:`, error);
      throw error;
    }
  }

  // Process a batch of products
  async processProductBatch(batch, userId, userRole) {
    const results = { created: [], errors: [], duplicates: [] };

    for (const productData of batch) {
      try {
        const brand = await ProductModel.checkBrandExists(productData.brandId || productData.brandName);
        
        if (!brand) {
          results.errors.push({
            title: productData.title,
            error: `Brand not found: ${productData.brandId || productData.brandName}`
          });
          continue;
        }

        if (userRole !== 'ADMIN') {
          const hasAccess = await prisma.userBrandAccess.findFirst({
            where: { userId, brandId: brand.id, isActive: true }
          });

          if (!hasAccess) {
            results.errors.push({
              title: productData.title,
              error: `Access denied to brand: ${brand.name}`
            });
            continue;
          }
        }

        const existingGroupSku = await ProductModel.checkGroupSkuExists(productData.groupSku);
        if (existingGroupSku) {
          results.duplicates.push({
            title: productData.title,
            groupSku: productData.groupSku,
            error: `Group SKU "${productData.groupSku}" already exists`
          });
          continue;
        }

        if (!productData.subSku || productData.subSku.trim() === '') {
          productData.subSku = productData.groupSku;
        }

        // Validate prices
        let brandRealPrice, brandMiscellaneous, msrp;
        
        try {
          brandRealPrice = this.validatePrice(productData.brandRealPrice, 'Brand Real Price');
          if (brandRealPrice === null) {
            results.errors.push({
              title: productData.title,
              error: 'Brand Real Price is mandatory'
            });
            continue;
          }
          
          brandMiscellaneous = this.validatePrice(productData.brandMiscellaneous, 'Brand Miscellaneous') || 0;
          msrp = this.validatePrice(productData.msrp, 'MSRP');
          
          if (msrp === null) {
            results.errors.push({
              title: productData.title,
              error: 'MSRP is mandatory'
            });
            continue;
          }
        } catch (error) {
          results.errors.push({
            title: productData.title,
            error: error.message
          });
          continue;
        }

        // Process attributes (images handled separately after product creation)
        let finalAttributes = { ...productData.attributes };
        
        Object.keys(finalAttributes).forEach(key => {
          const value = finalAttributes[key];
          if (value === null || value === undefined || value === '' || 
              (Array.isArray(value) && value.length === 0) ||
              (typeof value === 'object' && Object.keys(value).length === 0)) {
            delete finalAttributes[key];
          }
        });

        // Create product
        const product = await ProductModel.create({
          brandId: brand.id,
          title: productData.title,
          groupSku: productData.groupSku,
          subSku: productData.subSku,
          category: productData.category,
          collectionName: productData.collectionName,
          shipTypes: productData.shipTypes,
          singleSetItem: productData.singleSetItem,
          brandRealPrice: brandRealPrice,
          brandMiscellaneous: brandMiscellaneous,
          msrp: msrp,
          shippingPrice: 0,
          commissionPrice: 0,
          profitMarginPrice: 0,
          ecommerceMiscellaneous: 0,
          attributes: finalAttributes
        });

        results.created.push(product);

        await ManagementLogger.logProductAction(
          userId,
          'CREATE_BULK',
          product.id,
          brand.id,
          { oldData: null, newData: product },
          { jobId: data.jobId }
        );

      } catch (error) {
        results.errors.push({
          title: productData.title,
          error: error.message
        });
      }
    }

    return results;
  }

  // Process bulk pricing
  async processBulkPricing(data) {
    const { jobId, userId, pricingData } = data;
    
    try {
      console.log(`🚀 Starting bulk pricing processing - Job ID: ${jobId}`);
      
      const batchSize = 100;
      const totalRecords = pricingData.length;
      let processedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < totalRecords; i += batchSize) {
        const batch = pricingData.slice(i, i + batchSize);
        
        for (const pricingItem of batch) {
          try {
            // Find product by ID, groupSku, or subSku
            let existingProduct;
            if (pricingItem.productId) {
              existingProduct = await ProductModel.findById(pricingItem.productId);
            } else if (pricingItem.subSku) {
              existingProduct = await ProductModel.findBySubSku(pricingItem.subSku);
            } else if (pricingItem.groupSku) {
              existingProduct = await ProductModel.findByGroupSku(pricingItem.groupSku);
            }

            if (!existingProduct) {
              throw new Error(`Product not found: ${pricingItem.productId || pricingItem.subSku || pricingItem.groupSku}`);
            }

            // Calculate new prices
            const newBrandPrice = parseFloat(pricingItem.brandRealPrice || existingProduct.brandRealPrice) + 
                                 parseFloat(pricingItem.brandMiscellaneous || existingProduct.brandMiscellaneous);
            
            const newEcommercePrice = newBrandPrice + 
                                     parseFloat(pricingItem.shippingPrice || existingProduct.shippingPrice) + 
                                     parseFloat(pricingItem.commissionPrice || existingProduct.commissionPrice) + 
                                     parseFloat(pricingItem.profitMarginPrice || existingProduct.profitMarginPrice) + 
                                     parseFloat(pricingItem.ecommerceMiscellaneous || existingProduct.ecommerceMiscellaneous);

            // Update product pricing
            await ProductModel.update(existingProduct.id, {
              brandRealPrice: pricingItem.brandRealPrice !== undefined ? parseFloat(pricingItem.brandRealPrice) : existingProduct.brandRealPrice,
              brandMiscellaneous: pricingItem.brandMiscellaneous !== undefined ? parseFloat(pricingItem.brandMiscellaneous) : existingProduct.brandMiscellaneous,
              brandPrice: newBrandPrice,
              shippingPrice: pricingItem.shippingPrice !== undefined ? parseFloat(pricingItem.shippingPrice) : existingProduct.shippingPrice,
              commissionPrice: pricingItem.commissionPrice !== undefined ? parseFloat(pricingItem.commissionPrice) : existingProduct.commissionPrice,
              profitMarginPrice: pricingItem.profitMarginPrice !== undefined ? parseFloat(pricingItem.profitMarginPrice) : existingProduct.profitMarginPrice,
              ecommerceMiscellaneous: pricingItem.ecommerceMiscellaneous !== undefined ? parseFloat(pricingItem.ecommerceMiscellaneous) : existingProduct.ecommerceMiscellaneous,
              ecommercePrice: newEcommercePrice,
              msrp: pricingItem.msrp !== undefined ? parseFloat(pricingItem.msrp) : existingProduct.msrp
            });

            updatedCount++;
          } catch (error) {
            errorCount++;
            errors.push({
              identifier: pricingItem.productId || pricingItem.subSku || pricingItem.groupSku,
              error: error.message
            });
          }
          processedCount++;
        }

        const progress = Math.round((processedCount / totalRecords) * 100);
        console.log(`📈 Pricing Progress: ${progress}% (${processedCount}/${totalRecords})`);
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return {
        jobId,
        summary: {
          total: totalRecords,
          processed: processedCount,
          updated: updatedCount,
          errors: errorCount,
          successRate: `${Math.round((updatedCount / totalRecords) * 100)}%`
        },
        errors: errors.slice(0, 20),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Bulk pricing processing failed - Job ID: ${jobId}:`, error);
      throw error;
    }
  }

  // Process bulk images
  async processBulkImages(data) {
    const { jobId, userId, imageData } = data;
    
    try {
      console.log(`🚀 Starting bulk image processing - Job ID: ${jobId}`);
      
      const { processImages } = await import('../utils/imageDownloader.js');
      const ProductModel = (await import('../models/Product.js')).default;
      
      const batchSize = 50;
      const totalRecords = imageData.length;
      let processedCount = 0;
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < totalRecords; i += batchSize) {
        const batch = imageData.slice(i, i + batchSize);
        
        for (const imageItem of batch) {
          try {
            const { productId, imageUrls } = imageItem;
            
            if (!productId) {
              throw new Error('Product ID is required');
            }
            
            // Find the product
            const product = await ProductModel.findById(parseInt(productId));
            if (!product) {
              throw new Error(`Product not found: ${productId}`);
            }
            
            // Download images from URLs
            if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
              console.log(`📥 Downloading ${imageUrls.length} images for product ${productId}`);
              
              const downloadedPaths = await processImages(imageUrls);
              
              // Filter successful downloads
              const successfulDownloads = downloadedPaths.filter(path => 
                path && !path.startsWith('http')
              );
              
              if (successfulDownloads.length > 0) {
                // Update product attributes with downloaded images
                const currentAttributes = product.attributes || {};
                const existingImages = currentAttributes.images || [];
                
                const newImages = successfulDownloads.map((path, index) => ({
                  type: 'downloaded',
                  originalUrl: imageUrls[index],
                  filename: path.split('/').pop(),
                  url: path,
                  uploadedAt: new Date().toISOString(),
                  permanent: true
                }));
                
                currentAttributes.images = [...existingImages, ...newImages];
                
                await ProductModel.update(product.id, {
                  attributes: currentAttributes
                });
                
                console.log(`✅ Downloaded ${successfulDownloads.length}/${imageUrls.length} images for product ${productId}`);
              }
            }
            
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push({
              productId: imageItem.productId,
              error: error.message
            });
            console.error(`❌ Failed to process images for product ${imageItem.productId}:`, error.message);
          }
          processedCount++;
        }

        const progress = Math.round((processedCount / totalRecords) * 100);
        console.log(`📈 Image Progress: ${progress}% (${processedCount}/${totalRecords})`);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return {
        jobId,
        summary: {
          total: totalRecords,
          processed: processedCount,
          successful: successCount,
          errors: errorCount,
          successRate: `${Math.round((successCount / totalRecords) * 100)}%`
        },
        errors: errors.slice(0, 20),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Bulk image processing failed - Job ID: ${jobId}:`, error);
      throw error;
    }
  }

  // Helper method for price validation
  validatePrice(value, fieldName) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const valueStr = String(value).trim();
    if (valueStr === '') {
      return null;
    }
    
    const numericValue = parseFloat(valueStr);
    if (isNaN(numericValue) || numericValue < 0) {
      throw new Error(`Invalid ${fieldName}: "${value}" - must be a valid positive number`);
    }
    
    return parseFloat(numericValue.toFixed(2));
  }

  // Clean up completed jobs
  async cleanupJobs(queueName, maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const queue = this.queues[queueName];
    if (!queue) return;

    const jobs = await queue.getJobs(['completed', 'failed']);
    const cutoff = Date.now() - maxAge;
    
    for (const job of jobs) {
      if (job.timestamp < cutoff) {
        await job.remove();
      }
    }
  }

  // Get queue statistics
  async getQueueStats() {
    const stats = {};

    for (const [queueName, queue] of Object.entries(this.queues)) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      stats[queueName] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      };
    }

    return stats;
  }
}

// Singleton instance
const queueService = new QueueService();

export default queueService;
