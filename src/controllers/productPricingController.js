import ProductModel from '../models/Product.js';
import { prisma } from '../config/database.js';
import ManagementLogger from '../utils/managementLogger.js';

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

  // Update product pricing
  static async updateProductPricing(req, res) {
    try {
      const productId = parseInt(req.params.id);
      const {
        brandRealPrice,
        brandMiscellaneous,
        shippingPrice,
        commissionPrice,
        profitMarginPrice,
        ecommerceMiscellaneous
      } = req.body;

      // Check if product exists
      const existingProduct = await ProductModel.findById(productId);
      if (!existingProduct) {
        return res.status(404).json({
          error: 'Product not found'
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
      const updatedProduct = await ProductModel.update(productId, {
        brandRealPrice: brandRealPrice || existingProduct.brandRealPrice,
        brandMiscellaneous: brandMiscellaneous || existingProduct.brandMiscellaneous,
        brandPrice: newBrandPrice,
        shippingPrice: shippingPrice || existingProduct.shippingPrice,
        commissionPrice: commissionPrice || existingProduct.commissionPrice,
        profitMarginPrice: profitMarginPrice || existingProduct.profitMarginPrice,
        ecommerceMiscellaneous: ecommerceMiscellaneous || existingProduct.ecommerceMiscellaneous,
        ecommercePrice: newEcommercePrice
      });

      // Log management action
      await ManagementLogger.logProductAction(
        req.user.userId,
        'UPDATE_PRICING',
        productId,
        existingProduct.brandId,
        { 
          oldData: {
            brandPrice: existingProduct.brandPrice,
            ecommercePrice: existingProduct.ecommercePrice
          }, 
          newData: {
            brandPrice: newBrandPrice,
            ecommercePrice: newEcommercePrice
          }
        },
        req
      );

      res.json({
        message: 'Product pricing updated successfully',
        product: {
          id: updatedProduct.id,
          title: updatedProduct.title,
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
            }
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

  // Bulk update ecommerce pricing for all products
  static async updateEcommerceAll(req, res) {
    try {
      const { shippingPrice, commissionPrice, profitMarginPrice, ecommerceMiscellaneous } = req.body;
      
      // Get all products (for bulk operations, we need all products)
      const result = await ProductModel.findAll(req.user.userId, req.user.role, 1, 1000000); // Large limit for bulk operations
      const products = result.products;
      
      const updatedProducts = [];
      const errors = [];
      
      for (const product of products) {
        try {
          // Calculate new ecommerce price with existing brandPrice
          const newEcommercePrice = parseFloat(product.brandPrice) + 
                                   parseFloat(shippingPrice || 0) + 
                                   parseFloat(commissionPrice || 0) + 
                                   parseFloat(profitMarginPrice || 0) + 
                                   parseFloat(ecommerceMiscellaneous || 0);
          
          // Update product
          const updatedProduct = await ProductModel.update(product.id, {
            shippingPrice: shippingPrice !== undefined ? parseFloat(shippingPrice) : product.shippingPrice,
            commissionPrice: commissionPrice !== undefined ? parseFloat(commissionPrice) : product.commissionPrice,
            profitMarginPrice: profitMarginPrice !== undefined ? parseFloat(profitMarginPrice) : product.profitMarginPrice,
            ecommerceMiscellaneous: ecommerceMiscellaneous !== undefined ? parseFloat(ecommerceMiscellaneous) : product.ecommerceMiscellaneous,
            ecommercePrice: newEcommercePrice
          });
          
          updatedProducts.push(updatedProduct);
          
          // Log management action
          await ManagementLogger.logProductAction(
            req.user.userId,
            'BULK_UPDATE_ECOMMERCE',
            product.id,
            product.brandId,
            { 
              oldEcommercePrice: parseFloat(product.ecommercePrice),
              newEcommercePrice: newEcommercePrice,
              updatedFields: {
                shippingPrice: shippingPrice !== undefined ? parseFloat(shippingPrice) : product.shippingPrice,
                commissionPrice: commissionPrice !== undefined ? parseFloat(commissionPrice) : product.commissionPrice,
                profitMarginPrice: profitMarginPrice !== undefined ? parseFloat(profitMarginPrice) : product.profitMarginPrice,
                ecommerceMiscellaneous: ecommerceMiscellaneous !== undefined ? parseFloat(ecommerceMiscellaneous) : product.ecommerceMiscellaneous
              }
            },
            req
          );
          
        } catch (error) {
          errors.push({
            productId: product.id,
            title: product.title,
            error: error.message
          });
        }
      }
      
      res.json({
        message: 'Bulk ecommerce pricing update completed',
        summary: {
          totalProducts: products.length,
          updated: updatedProducts.length,
          errors: errors.length
        },
        updatedProducts: updatedProducts.map(p => ({
          id: p.id,
          title: p.title,
          brandPrice: parseFloat(p.brandPrice),
          ecommercePrice: parseFloat(p.ecommercePrice)
        })),
        errors: errors
      });
      
    } catch (error) {
      console.error('Bulk ecommerce pricing update error:', error);
      res.status(500).json({
        error: 'Failed to update ecommerce pricing',
        details: error.message
      });
    }
  }

  // Bulk update brand miscellaneous for all products
  static async updateBrandMiscAll(req, res) {
    try {
      const { brandMiscellaneous } = req.body;
      
      if (brandMiscellaneous === undefined) {
        return res.status(400).json({
          error: 'brandMiscellaneous is required'
        });
      }
      
      // Get all products (for bulk operations, we need all products)
      const result = await ProductModel.findAll(req.user.userId, req.user.role, 1, 1000000); // Large limit for bulk operations
      const products = result.products;
      
      const updatedProducts = [];
      const errors = [];
      
      for (const product of products) {
        try {
          // Calculate new brand price
          const newBrandPrice = parseFloat(product.brandRealPrice) + parseFloat(brandMiscellaneous);
          
          // Calculate new ecommerce price (update with new brand price)
          const newEcommercePrice = newBrandPrice + 
                                   parseFloat(product.shippingPrice) + 
                                   parseFloat(product.commissionPrice) + 
                                   parseFloat(product.profitMarginPrice) + 
                                   parseFloat(product.ecommerceMiscellaneous);
          
          // Update product
          const updatedProduct = await ProductModel.update(product.id, {
            brandMiscellaneous: parseFloat(brandMiscellaneous),
            brandPrice: newBrandPrice,
            ecommercePrice: newEcommercePrice
          });
          
          updatedProducts.push(updatedProduct);
          
          // Log management action
          await ManagementLogger.logProductAction(
            req.user.userId,
            'BULK_UPDATE_BRAND_MISC',
            product.id,
            product.brandId,
            { 
              oldBrandPrice: parseFloat(product.brandPrice),
              newBrandPrice: newBrandPrice,
              oldEcommercePrice: parseFloat(product.ecommercePrice),
              newEcommercePrice: newEcommercePrice,
              brandMiscellaneous: parseFloat(brandMiscellaneous)
            },
            req
          );
          
        } catch (error) {
          errors.push({
            productId: product.id,
            title: product.title,
            error: error.message
          });
        }
      }
      
      res.json({
        message: 'Bulk brand miscellaneous pricing update completed',
        summary: {
          totalProducts: products.length,
          updated: updatedProducts.length,
          errors: errors.length
        },
        updatedProducts: updatedProducts.map(p => ({
          id: p.id,
          title: p.title,
          brandRealPrice: parseFloat(p.brandRealPrice),
          brandMiscellaneous: parseFloat(p.brandMiscellaneous),
          brandPrice: parseFloat(p.brandPrice),
          ecommercePrice: parseFloat(p.ecommercePrice)
        })),
        errors: errors
      });
      
    } catch (error) {
      console.error('Bulk brand miscellaneous pricing update error:', error);
      res.status(500).json({
        error: 'Failed to update brand miscellaneous pricing',
        details: error.message
      });
    }
  }
}

export default ProductPricingController;
