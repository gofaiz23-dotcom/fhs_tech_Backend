import ManagementHistoryModel from '../models/ManagementHistory.js';

class ManagementHistoryController {
  // Get All Management History (Admin Only)
  static async getAllManagementHistory(req, res) {
    try {
      const history = await ManagementHistoryModel.getAllManagementHistory();
      
      // Combine all history and sort by date
      const allHistory = [
        ...history.userManagement,
        ...history.brandManagement,
        ...history.marketplaceManagement,
        ...history.shippingManagement,
        ...history.permissionManagement,
        ...history.userActivities
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json({
        message: 'Management history retrieved successfully',
        summary: {
          totalUserActions: history.userManagement.length,
          totalBrandActions: history.brandManagement.length,
          totalMarketplaceActions: history.marketplaceManagement.length,
          totalShippingActions: history.shippingManagement.length,
          totalPermissionActions: history.permissionManagement.length,
          totalUserActivities: history.userActivities.length,
          totalActions: allHistory.length
        },
        history: allHistory
      });
    } catch (error) {
      console.error('Get management history error:', error);
      res.status(500).json({
        error: 'Failed to retrieve management history',
        details: error.message
      });
    }
  }

  // Get Management History Summary (Admin Only)
  static async getManagementHistorySummary(req, res) {
    try {
      const summary = await ManagementHistoryModel.getManagementHistorySummary();
      
      res.json({
        message: 'Management history summary retrieved successfully',
        summary: summary.summary,
        recentActions: summary.recentActions
      });
    } catch (error) {
      console.error('Get management history summary error:', error);
      res.status(500).json({
        error: 'Failed to retrieve management history summary',
        details: error.message
      });
    }
  }

}

export default ManagementHistoryController;
