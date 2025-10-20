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

  // Update own brand mappings (simple - just update settings)
  static async updateOwnBrand(settingId, ownBrand) {
    return await prisma.setting.update({
      where: { id: settingId },
      data: {
        ownBrand: ownBrand
      }
    });
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

  // Initialize brand mappings from Brand table (all brands with default = original name)
  static async initializeBrandMappings() {
    const setting = await this.get();
    const currentMappings = setting.ownBrand || {};

    // Get all brands from Brand table
    const allBrands = await prisma.brand.findMany({
      select: { name: true }
    });

    // Create mappings for brands that don't have one yet (default = original name)
    const updatedMappings = { ...currentMappings };
    allBrands.forEach(brand => {
      if (!updatedMappings[brand.name]) {
        updatedMappings[brand.name] = brand.name; // Default to original name
      }
    });

    // Update settings
    return await prisma.setting.update({
      where: { id: setting.id },
      data: { ownBrand: updatedMappings }
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


