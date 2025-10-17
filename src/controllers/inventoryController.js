import InventoryModel from '../models/Inventory.js';
import { prisma } from '../config/database.js';

class InventoryController {
  // API 1: Get all inventory (based on user access)
  static async getInventory(req, res) {
    try {
      console.log('🔍 User Access Check:', {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email
      });

      const inventory = await InventoryModel.findAll(req.user.userId, req.user.role);

      console.log('📦 Inventory Found:', {
        totalItems: inventory.length,
        userRole: req.user.role,
        userId: req.user.userId
      });

      res.json({
        message: 'Inventory retrieved successfully',
        userAccess: {
          userId: req.user.userId,
          role: req.user.role,
          email: req.user.email
        },
        timestamp: new Date().toISOString(),
        totalItems: inventory.length,
        inventory: inventory
      });
    } catch (error) {
      console.error('Get inventory error:', error);
      res.status(500).json({
        error: 'Failed to retrieve inventory',
        details: error.message
      });
    }
  }

  // API 2: Update inventory (quantity and ETA)
  static async updateInventory(req, res) {
    try {
      const inventoryId = parseInt(req.params.id);
      const { quantity, eta } = req.body;

      // Check if inventory item exists
      const existingItem = await prisma.inventory.findUnique({
        where: { id: inventoryId },
        include: {
          brand: true,
          listing: true
        }
      });

      if (!existingItem) {
        return res.status(404).json({
          error: 'Inventory item not found'
        });
      }

      // Check user access to brand (for non-admin users)
      if (req.user.role !== 'ADMIN') {
        const hasAccess = await prisma.userBrandAccess.findFirst({
          where: {
            userId: req.user.userId,
            brandId: existingItem.brandId,
            isActive: true
          }
        });

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Access denied',
            message: `You don't have access to inventory from brand: ${existingItem.brand.name}`
          });
        }
      }

      const updateData = {};
      if (quantity !== undefined) updateData.quantity = quantity;
      if (eta !== undefined) updateData.eta = eta;

      const updatedItem = await InventoryModel.update(inventoryId, updateData);

      res.json({
        message: 'Inventory updated successfully',
        timestamp: new Date().toISOString(),
        inventory: updatedItem
      });
    } catch (error) {
      console.error('Update inventory error:', error);
      res.status(500).json({
        error: 'Failed to update inventory',
        details: error.message
      });
    }
  }

  // API 3: Bulk update inventory - Excel/CSV with unlimited records and background processing
  static async bulkUpdateInventory(req, res) {
    try {
      console.log('📦 Bulk Inventory Update Started');
      console.log('🔍 Request Content-Type:', req.get('Content-Type'));
      
      let inventoryData = [];
      
      // Check if Excel/CSV file was uploaded
      if (req.file) {
        console.log('📁 Excel File Upload Detected:', {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: req.file.path
        });

        // Process Excel/CSV file from disk
        const FileProcessor = (await import('../utils/fileProcessor.js')).default;
        const fs = await import('fs');
        
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileData = await FileProcessor.processFileBuffer(fileBuffer, req.file.originalname);
        
        console.log('📊 Excel Data Processed:', {
          totalRows: fileData.length,
          sampleRow: fileData[0] || null
        });
        
        if (fileData.length === 0) {
          return res.status(400).json({
            error: 'Excel file is empty or contains no valid data'
          });
        }

        // Transform Excel data to inventoryData format
        // Expected columns: subSku, quantity, eta (optional)
        inventoryData = fileData.map(row => {
          // Helper to get field value case-insensitively
          const getFieldValue = (obj, fieldName) => {
            if (!obj) return undefined;
            const lowerFieldName = fieldName.toLowerCase();
            for (const key in obj) {
              if (key.toLowerCase() === lowerFieldName) {
                return obj[key];
              }
            }
            return undefined;
          };

          const subSku = getFieldValue(row, 'subSku');
          const quantity = getFieldValue(row, 'quantity');
          const eta = getFieldValue(row, 'eta');
          
          return {
            subSku: subSku,
            quantity: quantity !== undefined && quantity !== null && quantity !== '' ? parseInt(quantity) : undefined,
            eta: eta || null
          };
        }).filter(item => item.subSku); // Only include rows with subSku
        
        console.log('✅ Transformed to inventoryData:', {
          totalRecords: inventoryData.length,
          sample: inventoryData[0]
        });
        
      } else if (req.body.inventoryData && Array.isArray(req.body.inventoryData)) {
        // JSON bulk upload
        inventoryData = req.body.inventoryData;
      } else {
        return res.status(400).json({
          error: 'Invalid request format',
          message: 'Provide either an Excel/CSV file or JSON inventoryData array',
          examples: {
            excelUpload: 'Upload Excel with columns: subSku, quantity, eta',
            jsonUpload: '{ "inventoryData": [{ "subSku": "SKU-001-A", "quantity": 100, "eta": "2025-12-31" }] }'
          }
        });
      }
      
      // Validate inventoryData
      if (inventoryData.length === 0) {
        return res.status(400).json({
          error: 'No valid inventory data provided',
          message: 'Excel must contain subSku column with quantity/eta values'
        });
      }

      // For small datasets (< 100), process immediately
      if (inventoryData.length < 100) {
        console.log('📦 Small dataset detected, processing immediately...');
        return InventoryController.processInventoryDataSync(req, res, inventoryData);
      }

      // For large datasets, use background processing
      console.log('🚀 Large dataset detected, using background processing...');
      const queueService = (await import('../services/queueService.js')).default;
      const jobResult = await queueService.addBulkInventoryJob({
        inventoryData: inventoryData,
        userId: req.user.userId
      }, req.user.userId);

      res.status(202).json({
        message: `Large inventory dataset detected (${inventoryData.length} items). Processing in background.`,
        jobId: jobResult.jobId,
        status: jobResult.status,
        totalItems: inventoryData.length,
        estimatedTime: `${Math.ceil(inventoryData.length / 50)} minutes`,
        note: 'Use GET /api/inventory/inventory/status to check progress',
        timestamp: new Date().toISOString(),
        fileInfo: req.file ? {
          originalName: req.file.originalname,
          storedName: req.file.filename,
          path: req.file.path,
          size: req.file.size
        } : null
      });

    } catch (error) {
      console.error('❌ Bulk inventory update error:', error);
      res.status(500).json({
        error: 'Failed to update inventory',
        details: error.message
      });
    }
  }

  // Process inventory data synchronously (for small datasets)
  static async processInventoryDataSync(req, res, inventoryData) {
    try {
      let results = {
        updated: [],
        errors: [],
        notFound: []
      };

      for (const item of inventoryData) {
        try {
          // Find inventory by subSku (now unique - faster lookup)
          const inventory = await prisma.inventory.findUnique({
            where: { subSku: item.subSku },
            include: {
              brand: true,
              listing: true
            }
          });

          if (!inventory) {
            results.notFound.push({
              subSku: item.subSku,
              error: 'Inventory item not found'
            });
            continue;
          }

          // Check user access (for non-admin users)
          if (req.user.role !== 'ADMIN') {
            const hasAccess = await prisma.userBrandAccess.findFirst({
              where: {
                userId: req.user.userId,
                brandId: inventory.brandId,
                isActive: true
              }
            });

            if (!hasAccess) {
              results.errors.push({
                subSku: item.subSku,
                error: 'Access denied to this inventory brand'
              });
              continue;
            }
          }

          // Prepare update data
          const updateData = {};
          if (item.quantity !== undefined) {
            updateData.quantity = item.quantity;
          }
          if (item.eta !== undefined) {
            updateData.eta = item.eta ? new Date(item.eta) : null;
          }

          // Update inventory
          const updatedInventory = await prisma.inventory.update({
            where: { id: inventory.id },
            data: updateData,
            include: {
              brand: true,
              listing: true
            }
          });

          results.updated.push({
            subSku: item.subSku,
            inventoryId: inventory.id,
            quantity: updatedInventory.quantity,
            eta: updatedInventory.eta,
            listingId: updatedInventory.listingId
          });

        } catch (error) {
          results.errors.push({
            subSku: item.subSku,
            error: error.message
          });
        }
      }

      res.json({
        message: `Processed ${inventoryData.length} inventory item(s) for update`,
        summary: {
          total: inventoryData.length,
          updated: results.updated.length,
          notFound: results.notFound.length,
          errors: results.errors.length
        },
        timestamp: new Date().toISOString(),
        results: {
          updated: results.updated,
          notFound: results.notFound,
          errors: results.errors
        }
      });

    } catch (error) {
      console.error('Process inventory data sync error:', error);
      res.status(500).json({
        error: 'Failed to process inventory data',
        details: error.message
      });
    }
  }

  // API 4: Get bulk processing status (for inventory)
  static async getBulkStatus(req, res) {
    try {
      const queueService = (await import('../services/queueService.js')).default;
      const { jobId, queueName } = req.query;

      // If specific job ID provided
      if (jobId && queueName) {
        const jobStatus = await queueService.getJobStatus(queueName, jobId);
        return res.json({
          message: 'Inventory job status retrieved successfully',
          jobStatus,
          timestamp: new Date().toISOString()
        });
      }

      // Get user's jobs
      const userJobs = await queueService.getUserJobs(req.user.userId);

      // If admin, also get queue statistics
      let queueStats = null;
      if (req.user.role === 'ADMIN') {
        queueStats = await queueService.getQueueStats();
      }

      res.json({
        message: 'Inventory bulk processing status retrieved successfully',
        userRole: req.user.role,
        userJobs: userJobs,
        ...(queueStats && { queueStats }),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get inventory bulk status error:', error);
      res.status(500).json({
        error: 'Failed to get inventory bulk processing status',
        details: error.message
      });
    }
  }
}

export default InventoryController;

