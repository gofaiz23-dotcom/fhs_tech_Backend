import { prisma } from '../config/database.js';

class ListingModel {
  // Find all listings with pagination (filtered by user access for regular users)
  static async findAll(userId = null, userRole = null, page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;
    
    // Build where clause based on user role and filters
    let whereClause = {};
    
    if (userRole === 'ADMIN') {
      // Admin sees all listings, apply filters
      whereClause = this.buildWhereClause(filters);
    } else if (userId) {
      // Regular user sees only listings from accessible brands
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
      return { listings: [], pagination: { totalCount: 0, totalPages: 0, currentPage: page, hasNextPage: false, hasPrevPage: false } };
    }

    // Get total count for pagination
    const totalCount = await prisma.listing.count({ where: whereClause });
    
    // Get paginated listings with inventory
    const listings = await prisma.listing.findMany({
      where: whereClause,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        inventory: {
          select: {
            id: true,
            subSku: true,
            quantity: true,
            eta: true,
            createdAt: true,
            updatedAt: true
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
      listings: listings,
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
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { subSku: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    return whereClause;
  }

  // Find listing by ID (for update/delete operations)
  static async findById(id) {
    return await prisma.listing.findUnique({
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

  // Find listing by SKU
  static async findBySku(sku) {
    return await prisma.listing.findFirst({
      where: { sku: sku },
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

  // Search listings by individual SKU (handles comma-separated subSku)
  static async findBySubSku(sku) {
    if (!sku || sku.trim() === '') {
      return null;
    }

    const trimmedSku = sku.trim();
    
    return await prisma.listing.findFirst({
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

  // Create new listing
  static async create(listingData) {
    // Calculate brand price
    const brandPrice = parseFloat(listingData.brandRealPrice) + parseFloat(listingData.brandMiscellaneous);
    
    // Calculate ecommerce price
    const ecommercePrice = brandPrice + 
                          parseFloat(listingData.shippingPrice) + 
                          parseFloat(listingData.commissionPrice) + 
                          parseFloat(listingData.profitMarginPrice) + 
                          parseFloat(listingData.ecommerceMiscellaneous);

    const finalListingData = {
      ...listingData,
      brandPrice: brandPrice,
      ecommercePrice: ecommercePrice
    };

    return await prisma.listing.create({
      data: finalListingData,
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

  // Update listing
  static async update(id, listingData) {
    return await prisma.listing.update({
      where: { id: parseInt(id) },
      data: listingData,
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

  // Delete listing
  static async delete(id) {
    return await prisma.listing.delete({
      where: { id: parseInt(id) }
    });
  }

  // Delete all listings
  static async deleteAll() {
    return await prisma.listing.deleteMany({});
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

  // Check if product exists (by ID or groupSku)
  static async checkProductExists(productIdentifier) {
    if (isNaN(productIdentifier)) {
      // Search by groupSku
      return await prisma.product.findUnique({
        where: { groupSku: productIdentifier },
        include: {
          brand: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    } else {
      // Search by ID
      return await prisma.product.findUnique({
        where: { id: parseInt(productIdentifier) },
        include: {
          brand: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    }
  }

  // Check if SKU already exists
  static async checkSkuExists(sku) {
    return await prisma.listing.findFirst({
      where: { sku: sku }
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

  // Get listing count by brand
  static async getCountByBrand(brandId) {
    return await prisma.listing.count({
      where: { brandId: parseInt(brandId) }
    });
  }
}

export default ListingModel;

