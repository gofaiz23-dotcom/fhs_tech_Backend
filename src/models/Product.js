import { prisma } from '../config/database.js';

class ProductModel {
  // Find all products with pagination (filtered by user access for regular users)
  static async findAll(userId = null, userRole = null, page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;
    
    // Build where clause based on user role and filters
    let whereClause = {};
    
    if (userRole === 'ADMIN') {
      // Admin sees all products, apply filters
      whereClause = this.buildWhereClause(filters);
    } else if (userId) {
      // Regular user sees only products from accessible brands
      whereClause = {
        AND: [
          {
            brand: {
              userBrandAccess: {
                some: {
                  userId: userId,
                  isActive: true
                }
              }
            }
          },
          this.buildWhereClause(filters)
        ]
      };
    } else {
      return { products: [], pagination: { totalCount: 0, totalPages: 0, currentPage: page, hasNextPage: false, hasPrevPage: false } };
    }

    // Get total count for pagination
    const totalCount = await prisma.product.count({ where: whereClause });
    
    // Get paginated products
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: skip,
      take: limit
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      products: products,
      pagination: {
        totalCount: totalCount,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage
      }
    };
  }

  // Build where clause from filters
  static buildWhereClause(filters) {
    const whereClause = {};
    
    if (filters.brandId) {
      whereClause.brandId = parseInt(filters.brandId);
    }
    
    if (filters.category) {
      whereClause.category = {
        contains: filters.category,
        mode: 'insensitive'
      };
    }
    
    if (filters.minPrice || filters.maxPrice) {
      whereClause.ecommercePrice = {};
      if (filters.minPrice) {
        whereClause.ecommercePrice.gte = parseFloat(filters.minPrice);
      }
      if (filters.maxPrice) {
        whereClause.ecommercePrice.lte = parseFloat(filters.maxPrice);
      }
    }
    
    if (filters.search) {
      whereClause.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { groupSku: { contains: filters.search, mode: 'insensitive' } },
        { subSku: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    return whereClause;
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

  // Check if Group SKU already exists
  static async checkGroupSkuExists(groupSku) {
    return await prisma.product.findUnique({
      where: { groupSku: groupSku }
    });
  }

  // Check if Sub SKU already exists (for reference only - no duplicate prevention)
  static async checkSubSkuExists(subSku) {
    if (!subSku || subSku.trim() === '') {
      return null; // Allow null/empty subSku
    }

    // Find any existing product with this subSku (for reference only)
    return await prisma.product.findFirst({
      where: {
        OR: [
          { subSku: subSku },
          { subSku: { contains: subSku } } // Check if SKU exists in comma-separated list
        ]
      }
    });
  }

  // Get individual SKUs from comma-separated string
  static parseSubSkus(subSku) {
    if (!subSku || subSku.trim() === '') {
      return [];
    }
    
    return subSku.split(',')
      .map(sku => sku.trim())
      .filter(sku => sku.length > 0);
  }

  // Search products by individual SKU (handles comma-separated)
  static async findBySubSku(sku) {
    if (!sku || sku.trim() === '') {
      return null;
    }

    const trimmedSku = sku.trim();
    
    return await prisma.product.findFirst({
      where: {
        OR: [
          { subSku: trimmedSku },
          { subSku: { startsWith: trimmedSku + ',' } },
          { subSku: { endsWith: ',' + trimmedSku } },
          { subSku: { contains: ',' + trimmedSku + ',' } }
        ]
      },
      include: { brand: true }
    });
  }

}

export default ProductModel;
