import { prisma } from '../config/database.js';

class ShippingCalculatorModel {
  // Helper method to get or create the single settings record
  static async getOrCreateSettings() {
    let setting = await prisma.setting.findFirst();
    
    // If no setting exists, create default
    if (!setting) {
      setting = await prisma.setting.create({
        data: {
          inventoryConfig: { minValue: 3 },
          ownBrand: {},
          LTLValues: { githValue: 166, weight: 151 },
          PARCELValues: { githValue: 165, weight: 150 }
        }
      });
    }
    
    return setting;
  }

  // Get LTL values from settings
  static async getLTLValues() {
    const setting = await this.getOrCreateSettings();
    return setting.LTLValues || { githValue: 166, weight: 151 };
  }

  // Get Parcel values from settings
  static async getParcelValues() {
    const setting = await this.getOrCreateSettings();
    return setting.PARCELValues || { githValue: 165, weight: 150 };
  }

  // Get all shipping values (both LTL and Parcel)
  static async getAllShippingValues() {
    const setting = await this.getOrCreateSettings();
    return {
      LTL: setting.LTLValues || { githValue: 166, weight: 151 },
      PARCEL: setting.PARCELValues || { githValue: 165, weight: 150 }
    };
  }

  // Update LTL values
  static async updateLTLValues(githValue, weight) {
    const setting = await this.getOrCreateSettings();
    
    // Update existing settings
    const updatedSetting = await prisma.setting.update({
      where: { id: setting.id },
      data: {
        LTLValues: { githValue, weight }
      }
    });

    return updatedSetting.LTLValues;
  }

  // Update Parcel values
  static async updateParcelValues(githValue, weight) {
    const setting = await this.getOrCreateSettings();
    
    // Update existing settings
    const updatedSetting = await prisma.setting.update({
      where: { id: setting.id },
      data: {
        PARCELValues: { githValue, weight }
      }
    });

    return updatedSetting.PARCELValues;
  }
}

export default ShippingCalculatorModel;
