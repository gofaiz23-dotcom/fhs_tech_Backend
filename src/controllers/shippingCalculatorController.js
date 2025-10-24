import ShippingCalculatorModel from '../models/ShippingCalculator.js';
import ListingShippingValuesCalculator from '../services/listingShippingValuesCalculator.js';

class ShippingCalculatorController {
  // GET /api/shipping-calculator - Get all shipping values (LTL and PARCEL)
  static async getAllShippingValues(req, res) {
    try {
      const shippingValues = await ShippingCalculatorModel.getAllShippingValues();

      res.json({
        message: 'Shipping values retrieved successfully',
        timestamp: new Date().toISOString(),
        data: shippingValues
      });
    } catch (error) {
      console.error('Get shipping values error:', error);
      res.status(500).json({
        error: 'Failed to retrieve shipping values',
        details: error.message
      });
    }
  }


  // PUT /api/shipping-calculator/ltl - Update LTL values
  static async updateLTLValues(req, res) {
    try {
      const { githValue, weight } = req.body;

      // Validate required fields
      if (githValue === undefined || weight === undefined) {
        return res.status(400).json({
          error: 'Both githValue and weight are required',
          example: {
            githValue: 166,
            weight: 151
          }
        });
      }

      // Validate data types and ensure they are valid numbers (including decimals)
      const parsedGithValue = parseFloat(githValue);
      const parsedWeight = parseFloat(weight);
      
      if (isNaN(parsedGithValue) || isNaN(parsedWeight)) {
        return res.status(400).json({
          error: 'githValue and weight must be valid numbers (decimals supported)'
        });
      }

      // Get current PARCEL values to validate LTL > PARCEL
      const currentParcelValues = await ShippingCalculatorModel.getParcelValues();
      
      // Validate that LTL values are greater than PARCEL values
      if (parsedGithValue <= currentParcelValues.githValue || parsedWeight <= currentParcelValues.weight) {
        return res.status(400).json({
          error: 'LTL values must be greater than PARCEL values',
          currentParcelValues: currentParcelValues,
          providedLTLValues: { githValue: parsedGithValue, weight: parsedWeight },
          message: `LTL githValue (${parsedGithValue}) must be > PARCEL githValue (${currentParcelValues.githValue}) AND LTL weight (${parsedWeight}) must be > PARCEL weight (${currentParcelValues.weight})`
        });
      }

      // Update LTL values
      const updatedValues = await ShippingCalculatorModel.updateLTLValues(parsedGithValue, parsedWeight);

      res.json({
        message: 'LTL values updated successfully',
        timestamp: new Date().toISOString(),
        data: updatedValues
      });
    } catch (error) {
      console.error('Update LTL values error:', error);
      res.status(500).json({
        error: 'Failed to update LTL values',
        details: error.message
      });
    }
  }

  // PUT /api/shipping-calculator/parcel - Update PARCEL values
  static async updateParcelValues(req, res) {
    try {
      const { githValue, weight } = req.body;

      // Validate required fields
      if (githValue === undefined || weight === undefined) {
        return res.status(400).json({
          error: 'Both githValue and weight are required',
          example: {
            githValue: 165,
            weight: 150
          }
        });
      }

      // Validate data types and ensure they are valid numbers (including decimals)
      const parsedGithValue = parseFloat(githValue);
      const parsedWeight = parseFloat(weight);
      
      if (isNaN(parsedGithValue) || isNaN(parsedWeight)) {
        return res.status(400).json({
          error: 'githValue and weight must be valid numbers (decimals supported)'
        });
      }

      // Get current LTL values to validate PARCEL < LTL
      const currentLTLValues = await ShippingCalculatorModel.getLTLValues();
      
      // Validate that PARCEL values are less than LTL values
      if (parsedGithValue >= currentLTLValues.githValue || parsedWeight >= currentLTLValues.weight) {
        return res.status(400).json({
          error: 'PARCEL values must be less than LTL values',
          currentLTLValues: currentLTLValues,
          providedParcelValues: { githValue: parsedGithValue, weight: parsedWeight },
          message: `PARCEL githValue (${parsedGithValue}) must be < LTL githValue (${currentLTLValues.githValue}) AND PARCEL weight (${parsedWeight}) must be < LTL weight (${currentLTLValues.weight})`
        });
      }

      // Update PARCEL values
      const updatedValues = await ShippingCalculatorModel.updateParcelValues(parsedGithValue, parsedWeight);

      res.json({
        message: 'PARCEL values updated successfully',
        timestamp: new Date().toISOString(),
        data: updatedValues
      });
    } catch (error) {
      console.error('Update PARCEL values error:', error);
      res.status(500).json({
        error: 'Failed to update PARCEL values',
        details: error.message
      });
    }
  }

  // GET /api/shipping-calculator/status - Get simple processing status (Admin only)
  static async getStatus(req, res) {
    try {
      // Get processing status
      const processingStatus = await ListingShippingValuesCalculator.getProcessingStatus();

      // Get failed products
      const failedProducts = await ListingShippingValuesCalculator.getFailedProducts();

      res.json({
        message: 'Processing status retrieved successfully',
        timestamp: new Date().toISOString(),
        data: {
          isProcessing: processingStatus.isProcessing,
          totalProducts: processingStatus.totalListings,
          processedProducts: processingStatus.processedCount,
          successCount: processingStatus.successCount,
          failedCount: processingStatus.errorCount,
          successPercentage: processingStatus.totalListings > 0
            ? Math.round((processingStatus.successCount / processingStatus.totalListings) * 100)
            : 0,
          failedPercentage: processingStatus.totalListings > 0
            ? Math.round((processingStatus.errorCount / processingStatus.totalListings) * 100)
            : 0,
          progressPercentage: processingStatus.progress,
          failedProducts: failedProducts
        }
      });
    } catch (error) {
      console.error('Get status error:', error);
      res.status(500).json({
        error: 'Failed to get status information',
        details: error.message
      });
    }
  }

}

export default ShippingCalculatorController;
