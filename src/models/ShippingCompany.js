import prisma from '../config/database.js';

class ShippingCompanyModel {
  // Create new shipping company
  static async create(shippingData) {
    return await prisma.shippingCompany.create({
      data: shippingData
    });
  }

  // Get all shipping companies
  static async findAll() {
    return await prisma.shippingCompany.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get shipping companies by user access
  static async findByUserAccess(userId) {
    const userAccess = await prisma.userShippingAccess.findMany({
      where: { 
        userId: userId,
        isActive: true 
      },
      include: { shippingCompany: true }
    });
    
    return userAccess.map(access => access.shippingCompany);
  }

  // Find shipping company by ID
  static async findById(id) {
    return await prisma.shippingCompany.findUnique({
      where: { id }
    });
  }

  // Update shipping company
  static async update(id, shippingData) {
    return await prisma.shippingCompany.update({
      where: { id },
      data: shippingData
    });
  }

  // Delete shipping company
  static async delete(id) {
    return await prisma.shippingCompany.delete({
      where: { id }
    });
  }

  // Check if shipping company exists
  static async exists(id) {
    const shippingCompany = await prisma.shippingCompany.findUnique({
      where: { id },
      select: { id: true }
    });
    return !!shippingCompany;
  }
}

export default ShippingCompanyModel;
