import { prisma } from '../config/database.js';

class ShippingCalculatorModel {
  // Get LTL values from settings
  static async getLTLValues() {
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
    
    return setting.LTLValues || { githValue: 166, weight: 151 };
  }

  // Get Parcel values from settings
  static async getParcelValues() {
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
    
    return setting.PARCELValues || { githValue: 165, weight: 150 };
  }

  // Get all shipping values (both LTL and Parcel)
  static async getAllShippingValues() {
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
    
    return {
      LTL: setting.LTLValues || { githValue: 166, weight: 151 },
      PARCEL: setting.PARCELValues || { githValue: 165, weight: 150 }
    };
  }

  // Update LTL values
  static async updateLTLValues(githValue, weight) {
    let setting = await prisma.setting.findFirst();
    
    if (!setting) {
      // Create new settings with default values
      setting = await prisma.setting.create({
        data: {
          inventoryConfig: { minValue: 3 },
          ownBrand: {},
          LTLValues: { githValue, weight },
          PARCELValues: { githValue: 165, weight: 150 }
        }
      });
    } else {
      // Update existing settings
      setting = await prisma.setting.update({
        where: { id: setting.id },
        data: {
          LTLValues: { githValue, weight }
        }
      });
    }

    return setting.LTLValues;
  }

  // Update Parcel values
  static async updateParcelValues(githValue, weight) {
    let setting = await prisma.setting.findFirst();
    
    if (!setting) {
      // Create new settings with default values
      setting = await prisma.setting.create({
        data: {
          inventoryConfig: { minValue: 3 },
          ownBrand: {},
          LTLValues: { githValue: 166, weight: 151 },
          PARCELValues: { githValue, weight }
        }
      });
    } else {
      // Update existing settings
      setting = await prisma.setting.update({
        where: { id: setting.id },
        data: {
          PARCELValues: { githValue, weight }
        }
      });
    }

    return setting.PARCELValues;
  }
}

export default ShippingCalculatorModel;
