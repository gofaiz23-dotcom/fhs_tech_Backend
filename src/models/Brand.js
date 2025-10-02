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
