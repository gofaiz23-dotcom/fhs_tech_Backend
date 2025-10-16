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
          }
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

  // Create default setting
  static async createDefault() {
    return await prisma.setting.create({
      data: {
        inventoryConfig: {
          minValue: 3
        }
      }
    });
  }
}

export default SettingModel;


