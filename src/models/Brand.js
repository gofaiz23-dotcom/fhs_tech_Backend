import prisma from '../config/database.js';

class BrandModel {
  // Create new brand
  static async create(brandData) {
    return await prisma.brand.create({
      data: brandData
    });
  }

  // Get all brands
  static async findAll() {
    return await prisma.brand.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get all brands with pagination
  static async findAllWithPagination(offset, limit) {
    const [brands, totalCount] = await Promise.all([
      prisma.brand.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.brand.count()
    ]);

    return {
      brands,
      totalCount
    };
  }

  // Get brands by user access
  static async findByUserAccess(userId) {
    const userAccess = await prisma.userBrandAccess.findMany({
      where: { 
        userId: userId,
        isActive: true 
      },
      include: { brand: true }
    });
    
    return userAccess.map(access => access.brand);
  }

  // Get brands by user access with pagination
  static async findByUserAccessWithPagination(userId, offset, limit) {
    const [userAccess, totalCount] = await Promise.all([
      prisma.userBrandAccess.findMany({
        where: { 
          userId: userId,
          isActive: true 
        },
        include: { brand: true },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.userBrandAccess.count({
        where: { 
          userId: userId,
          isActive: true 
        }
      })
    ]);
    
    return {
      brands: userAccess.map(access => access.brand),
      totalCount
    };
  }

  // Find brand by ID
  static async findById(id) {
    return await prisma.brand.findUnique({
      where: { id }
    });
  }

  // Update brand
  static async update(id, brandData) {
    return await prisma.brand.update({
      where: { id },
      data: brandData
    });
  }

  // Delete brand
  static async delete(id) {
    return await prisma.brand.delete({
      where: { id }
    });
  }

  // Check if brand exists
  static async exists(id) {
    const brand = await prisma.brand.findUnique({
      where: { id },
      select: { id: true }
    });
    return !!brand;
  }
}

export default BrandModel;
