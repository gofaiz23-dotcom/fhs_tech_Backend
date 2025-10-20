import SettingModel from '../models/Setting.js';

class SettingController {
  // API 1: Get settings
  static async getSettings(req, res) {
    try {
      const setting = await SettingModel.get();

      res.json({
        message: 'Settings retrieved successfully',
        timestamp: new Date().toISOString(),
        settings: {
          id: setting.id,
          inventoryConfig: setting.inventoryConfig,
          createdAt: setting.createdAt,
          updatedAt: setting.updatedAt
        }
      });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({
        error: 'Failed to retrieve settings',
        details: error.message
      });
    }
  }

  // API 2: Update settings (Admin only)
  static async updateSettings(req, res) {
    try {
      const { inventoryConfig } = req.body;

      if (!inventoryConfig) {
        return res.status(400).json({
          error: 'inventoryConfig is required',
          example: {
            inventoryConfig: {
              minValue: 5,
              maxValue: null
            }
          }
        });
      }

      // Validate inventoryConfig structure
      if (typeof inventoryConfig !== 'object' || inventoryConfig === null) {
        return res.status(400).json({
          error: 'inventoryConfig must be an object',
          expected: {
            minValue: 'number'
          }
        });
      }

      if (typeof inventoryConfig.minValue !== 'number') {
        return res.status(400).json({
          error: 'minValue must be a number'
        });
      }

      // Get current setting
      const currentSetting = await SettingModel.get();

      // Update setting
      const updatedSetting = await SettingModel.update(currentSetting.id, inventoryConfig);

      res.json({
        message: 'Settings updated successfully',
        timestamp: new Date().toISOString(),
        settings: {
          id: updatedSetting.id,
          inventoryConfig: updatedSetting.inventoryConfig,
          createdAt: updatedSetting.createdAt,
          updatedAt: updatedSetting.updatedAt
        }
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({
        error: 'Failed to update settings',
        details: error.message
      });
    }
  }

  // API 3: Get all brands from Brand table with mappings
  static async getBrands(req, res) {
    try {
      // Auto-cleanup redundant mappings on every GET request
      await SettingModel.cleanupRedundantMappings();

      // Get all brands from Brand table
      const allBrands = await SettingModel.getAllBrandsFromTable();

      // Get current settings with brand mappings (after cleanup)
      const setting = await SettingModel.get();
      const ownBrandMappings = setting.ownBrand || {};

      // Build response showing only changed brands
      const changedBrands = Object.entries(ownBrandMappings)
        .filter(([originalBrand, customBrand]) => originalBrand !== customBrand)
        .map(([originalBrand, customBrand]) => ({
          originalBrand: originalBrand,
          customBrand: customBrand,
          isChanged: true
        }));

      // Also show all available brands that can be mapped
      const availableBrands = allBrands.map(brand => brand.name);

      res.json({
        message: 'Brands retrieved successfully',
        timestamp: new Date().toISOString(),
        totalAvailableBrands: availableBrands.length,
        totalChangedBrands: changedBrands.length,
        availableBrands: availableBrands,
        changedBrands: changedBrands
      });
    } catch (error) {
      console.error('Get brands error:', error);
      res.status(500).json({
        error: 'Failed to retrieve brands',
        details: error.message
      });
    }
  }

  // API 4: Update brand name mappings and apply to all listings (Admin only)
  static async updateBrands(req, res) {
    try {
      const { originalBrand, customBrand } = req.body;

      if (!originalBrand || !customBrand) {
        return res.status(400).json({
          error: 'Both originalBrand and customBrand are required',
          example: {
            originalBrand: "Furniture of America",
            customBrand: "Faiz"
          }
        });
      }

      // Validate input types
      if (typeof originalBrand !== 'string' || typeof customBrand !== 'string') {
        return res.status(400).json({
          error: 'originalBrand and customBrand must be strings'
        });
      }

      // Get current setting
      const currentSetting = await SettingModel.get();
      const currentMappings = currentSetting.ownBrand || {};

      // If original = custom, delete the mapping (no need to store)
      if (originalBrand === customBrand) {
        // Remove from mappings
        const updatedMappings = { ...currentMappings };
        delete updatedMappings[originalBrand];

        // Update settings
        await SettingModel.updateOwnBrand(currentSetting.id, updatedMappings);

        return res.json({
          message: 'Brand mapping removed (original = custom)',
          timestamp: new Date().toISOString(),
          originalBrand: originalBrand,
          customBrand: customBrand,
          note: 'No mapping needed when original equals custom brand name'
        });
      }

      // Add/Update the mapping only if different
      const updatedMappings = {
        ...currentMappings,
        [originalBrand]: customBrand
      };

      // Clean up any mappings where original = custom
      Object.keys(updatedMappings).forEach(key => {
        if (key === updatedMappings[key]) {
          delete updatedMappings[key];
        }
      });

      // Update ownBrand mappings and automatically apply changes to all listings
      const updatedSetting = await SettingModel.updateOwnBrand(currentSetting.id, updatedMappings);

      // Count how many listings were affected
      const affectedCount = await SettingModel.countListingsByBrand(customBrand);

      res.json({
        message: 'Brand mapping updated successfully and applied to all listings',
        timestamp: new Date().toISOString(),
        originalBrand: originalBrand,
        customBrand: customBrand,
        affectedListings: affectedCount,
        allMappings: updatedSetting.ownBrand,
        note: `All listings with "${originalBrand}" have been changed to "${customBrand}"`
      });
    } catch (error) {
      console.error('Update brand mappings error:', error);
      res.status(500).json({
        error: 'Failed to update brand mappings',
        details: error.message
      });
    }
  }
}

export default SettingController;


