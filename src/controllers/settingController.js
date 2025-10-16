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
            minValue: 'number',
            maxValue: 'number or null (for unlimited/greater than minValue)'
          }
        });
      }

      if (typeof inventoryConfig.minValue !== 'number') {
        return res.status(400).json({
          error: 'minValue must be a number'
        });
      }

      if (inventoryConfig.maxValue !== null && typeof inventoryConfig.maxValue !== 'number') {
        return res.status(400).json({
          error: 'maxValue must be a number or null (null = greater than minValue)'
        });
      }

      if (inventoryConfig.maxValue !== null && inventoryConfig.maxValue <= inventoryConfig.minValue) {
        return res.status(400).json({
          error: 'maxValue must be greater than minValue',
          provided: {
            minValue: inventoryConfig.minValue,
            maxValue: inventoryConfig.maxValue
          }
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
}

export default SettingController;


