import { prisma } from '../config/database.js';

class SettingModel {
  // Get settings (always returns the first/only row)
  static async get() {
    let setting = await prisma.setting.findFirst();
    
    // If no setting exists, create default
    if (!setting) {
      setting = await prisma.setting.create({
        data: {
          inventoryConfig: {
            minValue: 3
          },
          ownBrand: {}
        }
      });
    }
    
    return setting;
  }

  // Update settings
  static async update(settingId, inventoryConfig) {
    return await prisma.setting.update({
      where: { id: settingId },
      data: {
        inventoryConfig: inventoryConfig
      }
    });
  }

  // Update own brand mappings and apply changes to listings
  static async updateOwnBrand(settingId, ownBrand) {
    // Update settings with new mappings
    const updatedSetting = await prisma.setting.update({
      where: { id: settingId },
      data: {
        ownBrand: ownBrand
      }
    });

    // Apply brand name changes to all listings
    for (const [originalBrandName, customBrandName] of Object.entries(ownBrand)) {
      if (originalBrandName && customBrandName && originalBrandName !== customBrandName) {
        await this.applyBrandNameChange(originalBrandName, customBrandName);
      }
    }

    return updatedSetting;
  }

  // Apply brand name change to listings only
  static async applyBrandNameChange(originalBrandName, customBrandName) {
    // Find the brand by original name
    const originalBrand = await prisma.brand.findFirst({
      where: { name: { equals: originalBrandName, mode: 'insensitive' } }
    });

    if (!originalBrand) {
      return; // Brand not found, skip
    }

    // Check if custom brand name already exists
    let targetBrand = await prisma.brand.findFirst({
      where: { name: { equals: customBrandName, mode: 'insensitive' } }
    });

    // If custom brand doesn't exist, create it
    if (!targetBrand) {
      targetBrand = await prisma.brand.create({
        data: {
          name: customBrandName,
          description: `Mapped from ${originalBrandName}`
        }
      });
    }

    // Update ONLY listings with the original brand to use the new brand
    await prisma.listing.updateMany({
      where: { brandId: originalBrand.id },
      data: { brandId: targetBrand.id }
    });

    // Don't touch products and inventory tables
  }

  // Get all unique brands from Listing table
  static async getUniqueBrands() {
    const brands = await prisma.listing.findMany({
      select: {
        brand: {
          select: {
            id: true,
            name: true
          }
        }
      },
      distinct: ['brandId']
    });
    
    return brands.map(item => ({
      id: item.brand.id,
      name: item.brand.name
    }));
  }

  // Count listings by brand name
  static async countListingsByBrand(brandName) {
    const brand = await prisma.brand.findFirst({
      where: { name: { equals: brandName, mode: 'insensitive' } }
    });

    if (!brand) {
      return 0;
    }

    return await prisma.listing.count({
      where: { brandId: brand.id }
    });
  }

  // Get custom brand mapping for a given brand (returns custom brand or original)
  static async getCustomBrandForListing(originalBrandName) {
    const setting = await this.get();
    const ownBrand = setting.ownBrand || {};
    
    // Check if this brand has a custom mapping
    const customBrandName = ownBrand[originalBrandName];
    
    if (customBrandName && customBrandName !== originalBrandName) {
      // Find or create the custom brand
      let customBrand = await prisma.brand.findFirst({
        where: { name: { equals: customBrandName, mode: 'insensitive' } }
      });

      if (!customBrand) {
        customBrand = await prisma.brand.create({
          data: {
            name: customBrandName,
            description: `Mapped from ${originalBrandName}`
          }
        });
      }

      return customBrand;
    }

    // No custom mapping, return null (use original brand)
    return null;
  }

  // Get all brands from Brand table (for display, no auto-sync)
  static async getAllBrandsFromTable() {
    return await prisma.brand.findMany({
      select: { 
        id: true,
        name: true 
      },
      orderBy: { name: 'asc' }
    });
  }

  // Create default setting
  static async createDefault() {
    return await prisma.setting.create({
      data: {
        inventoryConfig: {
          minValue: 3
        },
        ownBrand: {}
      }
    });
  }
}

export default SettingModel;


