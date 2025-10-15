import ProductModel from '../models/Product.js';
import { prisma } from '../config/database.js';
import ManagementLogger from '../utils/managementLogger.js';
import queueService from '../services/queueService.js';

class ProductPricingController {
  // Helper method for validating and converting price values
  static validatePrice(value, fieldName) {
    // Handle null/undefined/empty
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // Convert to string first to handle all types, then trim
    const valueStr = String(value).trim();
    
    // If empty after trimming, return null
    if (valueStr === '') {
      return null;
    }
    
    // Try to parse as float
    const numericValue = parseFloat(valueStr);
    
    // Check if it's a valid number and not negative
    if (isNaN(numericValue) || numericValue < 0) {
      throw new Error(`Invalid ${fieldName}: "${value}" - must be a valid positive number`);
    }
    
    // Return as decimal with 2 decimal places for consistency
    return parseFloat(numericValue.toFixed(2));
  }

  // Get product with pricing details
  static async getProductPricing(req, res) {
    try {
      const productId = parseInt(req.params.id);
      
      // Check if product exists
      const product = await ProductModel.findById(productId);
      if (!product) {
        return res.status(404).json({
          error: 'Product not found'
        });
      }

      // Check user access to product's brand (for non-admin users)
      if (req.user.role !== 'ADMIN') {
        const hasAccess = await prisma.userBrandAccess.findFirst({
          where: {
            userId: req.user.userId,
            brandId: product.brandId,
            isActive: true
          }
        });

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Access denied',
            message: `You don't have access to products from brand: ${product.brand.name}`
          });
        }
      }

      // Calculate pricing breakdown
      const pricingBreakdown = {
        brandPricing: {
          brandRealPrice: parseFloat(product.brandRealPrice),
          brandMiscellaneous: parseFloat(product.brandMiscellaneous),
          brandPrice: parseFloat(product.brandPrice),
          calculation: {
            formula: 'brandPrice = brandRealPrice + brandMiscellaneous',
            result: parseFloat(product.brandPrice)
          }
        },
        ecommercePricing: {
          basePrice: parseFloat(product.brandPrice),
          shippingPrice: parseFloat(product.shippingPrice),
          commissionPrice: parseFloat(product.commissionPrice),
          profitMarginPrice: parseFloat(product.profitMarginPrice),
          ecommerceMiscellaneous: parseFloat(product.ecommerceMiscellaneous),
          ecommercePrice: parseFloat(product.ecommercePrice),
          calculation: {
            formula: 'ecommercePrice = brandPrice + shippingPrice + commissionPrice + profitMarginPrice + ecommerceMiscellaneous',
            breakdown: {
              brandPrice: parseFloat(product.brandPrice),
              shippingPrice: parseFloat(product.shippingPrice),
              commissionPrice: parseFloat(product.commissionPrice),
              profitMarginPrice: parseFloat(product.profitMarginPrice),
              ecommerceMiscellaneous: parseFloat(product.ecommerceMiscellaneous),
              total: parseFloat(product.ecommercePrice)
            }
          }
        }
      };

      res.json({
        message: 'Product pricing retrieved successfully',
        product: {
          id: product.id,
          title: product.title,
          groupSku: product.groupSku,
          subSku: product.subSku,
          brand: product.brand,
          pricing: pricingBreakdown
        }
      });
    } catch (error) {
      console.error('Get product pricing error:', error);
      res.status(500).json({
        error: 'Failed to retrieve product pricing',
        details: error.message
      });
    }
  }

  // Update product pricing - handles both single and bulk updates (only if product exists)
  static async updateProductPricing(req, res) {
    try {
      // Check if this is bulk pricing update
      if (req.body.pricingData && Array.isArray(req.body.pricingData)) {
        return ProductPricingController.bulkUpdatePricing(req, res);
      }

      // Single product pricing update - productId, groupSku, or subSku must be provided
      const {
        productId,
        groupSku,
        subSku,
        brandRealPrice,
        brandMiscellaneous,
        shippingPrice,
        commissionPrice,
        profitMarginPrice,
        ecommerceMiscellaneous,
        msrp
      } = req.body;

      // Validate at least one identifier is provided
      if (!productId && !groupSku && !subSku) {
        return res.status(400).json({
          error: 'Product identifier required',
          message: 'Provide productId, groupSku, or subSku in request body for single product update'
        });
      }

      // Find product by ID, groupSku, or subSku
      let existingProduct;
      if (productId) {
        existingProduct = await ProductModel.findById(parseInt(productId));
      } else if (subSku) {
        existingProduct = await ProductModel.findBySubSku(subSku);
      } else if (groupSku) {
        existingProduct = await ProductModel.findByGroupSku(groupSku);
      }

      if (!existingProduct) {
        const identifier = productId || subSku || groupSku;
        return res.status(404).json({
          error: 'Product not found',
          message: `Product with identifier ${identifier} does not exist`
        });
      }

      // Check user access to product's brand (for non-admin users)
      if (req.user.role !== 'ADMIN') {
        const hasAccess = await prisma.userBrandAccess.findFirst({
          where: {
            userId: req.user.userId,
            brandId: existingProduct.brandId,
            isActive: true
          }
        });

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Access denied',
            message: `You don't have access to products from brand: ${existingProduct.brand.name}`
          });
        }
      }

      // Calculate new prices
      const newBrandPrice = parseFloat(brandRealPrice || existingProduct.brandRealPrice) + 
                           parseFloat(brandMiscellaneous || existingProduct.brandMiscellaneous);
      
      const newEcommercePrice = newBrandPrice + 
                               parseFloat(shippingPrice || existingProduct.shippingPrice) + 
                               parseFloat(commissionPrice || existingProduct.commissionPrice) + 
                               parseFloat(profitMarginPrice || existingProduct.profitMarginPrice) + 
                               parseFloat(ecommerceMiscellaneous || existingProduct.ecommerceMiscellaneous);

      // Update product pricing
      const updatedProduct = await ProductModel.update(parseInt(productId), {
        brandRealPrice: brandRealPrice !== undefined ? parseFloat(brandRealPrice) : existingProduct.brandRealPrice,
        brandMiscellaneous: brandMiscellaneous !== undefined ? parseFloat(brandMiscellaneous) : existingProduct.brandMiscellaneous,
        brandPrice: newBrandPrice,
        shippingPrice: shippingPrice !== undefined ? parseFloat(shippingPrice) : existingProduct.shippingPrice,
        commissionPrice: commissionPrice !== undefined ? parseFloat(commissionPrice) : existingProduct.commissionPrice,
        profitMarginPrice: profitMarginPrice !== undefined ? parseFloat(profitMarginPrice) : existingProduct.profitMarginPrice,
        ecommerceMiscellaneous: ecommerceMiscellaneous !== undefined ? parseFloat(ecommerceMiscellaneous) : existingProduct.ecommerceMiscellaneous,
        ecommercePrice: newEcommercePrice,
        msrp: msrp !== undefined ? parseFloat(msrp) : existingProduct.msrp
      });

      // Log management action
      await ManagementLogger.logProductAction(
        req.user.userId,
        'UPDATE_PRICING',
        parseInt(productId),
        existingProduct.brandId,
        { 
          oldData: {
            brandRealPrice: existingProduct.brandRealPrice,
            brandMiscellaneous: existingProduct.brandMiscellaneous,
            brandPrice: existingProduct.brandPrice,
            shippingPrice: existingProduct.shippingPrice,
            commissionPrice: existingProduct.commissionPrice,
            profitMarginPrice: existingProduct.profitMarginPrice,
            ecommerceMiscellaneous: existingProduct.ecommerceMiscellaneous,
            ecommercePrice: existingProduct.ecommercePrice,
            msrp: existingProduct.msrp
          }, 
          newData: {
            brandRealPrice: updatedProduct.brandRealPrice,
            brandMiscellaneous: updatedProduct.brandMiscellaneous,
            brandPrice: newBrandPrice,
            shippingPrice: updatedProduct.shippingPrice,
            commissionPrice: updatedProduct.commissionPrice,
            profitMarginPrice: updatedProduct.profitMarginPrice,
            ecommerceMiscellaneous: updatedProduct.ecommerceMiscellaneous,
            ecommercePrice: newEcommercePrice,
            msrp: updatedProduct.msrp
          }
        },
        req
      );

      res.json({
        message: 'Product pricing updated successfully',
        product: {
          id: updatedProduct.id,
          title: updatedProduct.title,
          groupSku: updatedProduct.groupSku,
          subSku: updatedProduct.subSku,
          pricing: {
            brandPricing: {
              brandRealPrice: parseFloat(updatedProduct.brandRealPrice),
              brandMiscellaneous: parseFloat(updatedProduct.brandMiscellaneous),
              brandPrice: parseFloat(updatedProduct.brandPrice)
            },
            ecommercePricing: {
              basePrice: parseFloat(updatedProduct.brandPrice),
              shippingPrice: parseFloat(updatedProduct.shippingPrice),
              commissionPrice: parseFloat(updatedProduct.commissionPrice),
              profitMarginPrice: parseFloat(updatedProduct.profitMarginPrice),
              ecommerceMiscellaneous: parseFloat(updatedProduct.ecommerceMiscellaneous),
              ecommercePrice: parseFloat(updatedProduct.ecommercePrice)
            },
            msrp: parseFloat(updatedProduct.msrp)
          }
        }
      });
    } catch (error) {
      console.error('Update product pricing error:', error);
      res.status(500).json({
        error: 'Failed to update product pricing',
        details: error.message
      });
    }
  }

  // Get all products with pricing summary with pagination
  static async getAllProductsPricing(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      const result = await ProductModel.findAll(req.user.userId, req.user.role, page, limit);

      const productsWithPricing = result.products.map(product => ({
        id: product.id,
        title: product.title,
        groupSku: product.groupSku,
        subSku: product.subSku,
        brand: product.brand,
        pricing: {
          brandPrice: parseFloat(product.brandPrice),
          ecommercePrice: parseFloat(product.ecommercePrice),
          profitMargin: parseFloat(product.ecommercePrice) - parseFloat(product.brandPrice)
        }
      }));

      res.json({
        message: 'Products pricing retrieved successfully',
        products: productsWithPricing,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get all products pricing error:', error);
      res.status(500).json({
        error: 'Failed to retrieve products pricing',
        details: error.message
      });
    }
  }

  // Bulk pricing update - Background processing (for large datasets)
  static async bulkUpdatePricing(req, res) {
    try {
      const { pricingData } = req.body;

      if (!pricingData || !Array.isArray(pricingData)) {
        return res.status(400).json({
          error: 'Invalid request format',
          message: 'Provide "pricingData" array'
        });
      }

      // Validate pricing data structure - each item must have productId, groupSku, or subSku
      const validPricingData = pricingData.filter(item => {
        const hasIdentifier = item.productId || item.groupSku || item.subSku;
        const hasPriceField = (
          item.brandRealPrice !== undefined || 
          item.brandMiscellaneous !== undefined ||
          item.shippingPrice !== undefined ||
          item.commissionPrice !== undefined ||
          item.profitMarginPrice !== undefined ||
          item.ecommerceMiscellaneous !== undefined ||
          item.msrp !== undefined
        );
        return hasIdentifier && hasPriceField;
      });

      if (validPricingData.length === 0) {
        return res.status(400).json({
          error: 'No valid pricing data provided',
          message: 'Each item must have productId/groupSku/subSku and at least one price field'
        });
      }

      // For small datasets, process immediately
      if (validPricingData.length < 1000) {
        const updatedProducts = [];
        const errors = [];

        for (const pricingItem of validPricingData) {
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
              const identifier = pricingItem.productId || pricingItem.subSku || pricingItem.groupSku;
              errors.push({
                identifier: identifier,
                error: 'Product not found'
              });
              continue;
            }

            // Check user access (for non-admin users)
            if (req.user.role !== 'ADMIN') {
              const hasAccess = await prisma.userBrandAccess.findFirst({
                where: {
                  userId: req.user.userId,
                  brandId: existingProduct.brandId,
                  isActive: true
                }
              });

              if (!hasAccess) {
                errors.push({
                  identifier: pricingItem.productId || pricingItem.subSku || pricingItem.groupSku,
                  error: `Access denied to brand: ${existingProduct.brand.name}`
                });
                continue;
              }
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
            const updatedProduct = await ProductModel.update(existingProduct.id, {
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

            updatedProducts.push({
              identifier: pricingItem.productId || pricingItem.subSku || pricingItem.groupSku,
              productId: updatedProduct.id,
              message: 'Pricing updated successfully'
            });

          } catch (error) {
            errors.push({
              identifier: pricingItem.productId || pricingItem.subSku || pricingItem.groupSku,
              error: error.message
            });
          }
        }

        return res.json({
          message: 'Bulk pricing update completed',
          summary: {
            totalProducts: validPricingData.length,
            updated: updatedProducts.length,
            errors: errors.length
          },
          updatedProducts: updatedProducts,
          errors: errors
        });
      }

      // For large datasets, use background processing
      const jobResult = await queueService.addBulkPricingJob({
        pricingData: validPricingData
      }, req.user.userId);

      res.status(202).json({
        message: `Large pricing dataset detected (${validPricingData.length} products). Processing in background.`,
        jobId: jobResult.jobId,
        status: jobResult.status,
        totalProducts: validPricingData.length,
        estimatedTime: `${Math.ceil(validPricingData.length / 200)} minutes`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Bulk pricing update error:', error);
      res.status(500).json({
        error: 'Failed to update pricing',
        details: error.message
      });
    }
  }

}

export default ProductPricingController;
