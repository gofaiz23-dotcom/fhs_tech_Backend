import prisma from '../config/database.js';

class ProductModel {
  // Find all products (filtered by user access for regular users)
  static async findAll(userId = null, userRole = null) {
    if (userRole === 'ADMIN') {
      // Admin sees all products
      return await prisma.product.findMany({
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (userId) {
      // Regular user sees only products from accessible brands
      return await prisma.product.findMany({
        where: {
          brand: {
            userBrandAccess: {
              some: {
                userId: userId,
                isActive: true
              }
            }
          }
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return [];
    }
  }

  // Find product by ID (for update/delete operations)
  static async findById(id) {
    return await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });
  }

  // Create new product
  static async create(productData) {
    // Calculate brand price
    const brandPrice = parseFloat(productData.brandRealPrice) + parseFloat(productData.brandMiscellaneous);
    
    // Calculate ecommerce price
    const ecommercePrice = brandPrice + 
                          parseFloat(productData.shippingPrice) + 
                          parseFloat(productData.commissionPrice) + 
                          parseFloat(productData.profitMarginPrice) + 
                          parseFloat(productData.ecommerceMiscellaneous);

    const finalProductData = {
      ...productData,
      brandPrice: brandPrice,
      ecommercePrice: ecommercePrice
    };

    return await prisma.product.create({
      data: finalProductData,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });
  }

  // Update product
  static async update(id, productData) {
    return await prisma.product.update({
      where: { id: parseInt(id) },
      data: productData,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });
  }

  // Delete product
  static async delete(id) {
    return await prisma.product.delete({
      where: { id: parseInt(id) }
    });
  }

  // Delete all products
  static async deleteAll() {
    return await prisma.product.deleteMany({});
  }

  // Check if brand exists
  static async checkBrandExists(brandIdentifier) {
    if (isNaN(brandIdentifier)) {
      return await prisma.brand.findFirst({
        where: { name: { equals: brandIdentifier, mode: 'insensitive' } }
      });
    } else {
      return await prisma.brand.findUnique({
        where: { id: parseInt(brandIdentifier) }
      });
    }
  }

  // Get product count by brand
  static async getCountByBrand(brandId) {
    return await prisma.product.count({
      where: { brandId: parseInt(brandId) }
    });
  }

}

export default ProductModel;
