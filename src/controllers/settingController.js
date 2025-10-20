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

  // API 3: Get all brands with mappings
  static async getBrands(req, res) {
    try {
      // Initialize brand mappings (adds any new brands from Brand table)
      await SettingModel.initializeBrandMappings();

      // Get current settings with all brand mappings
      const setting = await SettingModel.get();
      const ownBrandMappings = setting.ownBrand || {};

      // Build response with all brands and their mappings
      const brands = Object.entries(ownBrandMappings).map(([originalBrand, customBrand]) => ({
        originalBrand: originalBrand,
        customBrand: customBrand,
        isChanged: originalBrand !== customBrand
      }));

      res.json({
        message: 'Brands retrieved successfully',
        timestamp: new Date().toISOString(),
        totalBrands: brands.length,
        brands: brands
      });
    } catch (error) {
      console.error('Get brands error:', error);
      res.status(500).json({
        error: 'Failed to retrieve brands',
        details: error.message
      });
    }
  }

  // API 4: Update brand name mapping (Admin only)
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

      // Update the mapping
      const updatedMappings = {
        ...currentMappings,
        [originalBrand]: customBrand
      };

      // Update settings
      const updatedSetting = await SettingModel.updateOwnBrand(currentSetting.id, updatedMappings);

      res.json({
        message: 'Brand mapping updated successfully',
        timestamp: new Date().toISOString(),
        originalBrand: originalBrand,
        customBrand: customBrand,
        allMappings: updatedSetting.ownBrand,
        note: 'Future listings will use the custom brand name automatically'
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


