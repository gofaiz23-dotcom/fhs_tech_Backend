import { prisma } from '../config/database.js';
import ShippingCalculatorModel from '../models/ShippingCalculator.js';

// Background processing status
let processingStatus = {
  isProcessing: false,
  type: null, // 'all' or 'brand'
  brandId: null,
  totalListings: 0,
  processedCount: 0,
  successCount: 0,
  errorCount: 0,
  startTime: null,
  endTime: null,
  estimatedTime: null
};

class ListingShippingValuesCalculator {
  // Calculate shipping values from listing attributes
  static calculateShippingValues(shippingWidth, shippingHeight, shippingLength, weight) {
    // Ensure all values are numbers and handle decimals properly
    const width = parseFloat(shippingWidth) || 0;
    const height = parseFloat(shippingHeight) || 0;
    const length = parseFloat(shippingLength) || 0;
    const weightValue = parseFloat(weight) || 0;
    
    // Sort dimensions to get max, less1, less2
    const dimensions = [width, height, length].sort((a, b) => b - a);
    
    const max = dimensions[0];      // Largest dimension
    const less1 = dimensions[1];   // Second largest
    const less2 = dimensions[2];   // Smallest
    
    // Apply formula: Gith = 1*max + 2*less1 + 2*less2
    const githValue = (1 * max) + (2 * less1) + (2 * less2);
    
    return {
      githValue: Math.round(githValue * 100) / 100, // Round to 2 decimal places
      weight: Math.round(weightValue * 100) / 100   // Round weight to 2 decimal places
    };
  }

  // Determine shipping type (LTL or PARCEL) based on calculated values
  static async determineShippingType(calculatedGith, calculatedWeight) {
    try {
      // Get current LTL and PARCEL values from settings
      const shippingData = await ShippingCalculatorModel.getAllShippingValues();
      const ltlValues = shippingData.LTL;
      const parcelValues = shippingData.PARCEL;

      // Ensure all values are properly parsed as numbers with decimal support
      const calcGith = parseFloat(calculatedGith) || 0;
      const calcWeight = parseFloat(calculatedWeight) || 0;
      const ltlGith = parseFloat(ltlValues.githValue) || 0;
      const ltlWeight = parseFloat(ltlValues.weight) || 0;
      const parcelGith = parseFloat(parcelValues.githValue) || 0;
      const parcelWeight = parseFloat(parcelValues.weight) || 0;

      // LTL condition: calculated values >= LTL values (any one or both)
      const isLTL = calcGith >= ltlGith || calcWeight >= ltlWeight;
      
      // PARCEL condition: calculated values <= PARCEL values (both must be <=)
      const isParcel = calcGith <= parcelGith && calcWeight <= parcelWeight;

      // Determine shipping type
      if (isLTL) {
        return 'LTL';
      } else if (isParcel) {
        return 'PARCEL';
      } else {
        // If neither condition is met, default to LTL (since it's the higher tier)
        return 'LTL';
      }
    } catch (error) {
      console.error('Error determining shipping type:', error);
      return 'LTL'; // Default to LTL on error
    }
  }

  // Process a single listing
  static async processListing(listingId) {
    try {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId }
      });

      if (!listing) {
        throw new Error(`Listing with ID ${listingId} not found`);
      }

      // Extract shipping dimensions from attributes
      const attributes = listing.attributes;
      const shippingWidth = attributes?.shippingWidth;
      const shippingHeight = attributes?.shippingHeight;
      const shippingLength = attributes?.shippingLength;
      const weight = attributes?.weight;

      // Validate required fields and ensure they are valid numbers
      if (!shippingWidth || !shippingHeight || !shippingLength || !weight) {
        console.warn(`Listing ${listingId} missing shipping dimensions or weight`);
        return null;
      }

      // Validate that all values are valid numbers (including decimals)
      const width = parseFloat(shippingWidth);
      const height = parseFloat(shippingHeight);
      const length = parseFloat(shippingLength);
      const weightValue = parseFloat(weight);

      if (isNaN(width) || isNaN(height) || isNaN(length) || isNaN(weightValue)) {
        console.warn(`Listing ${listingId} has invalid shipping dimensions or weight values`);
        return null;
      }

      // Calculate shipping values
      const calculatedValues = this.calculateShippingValues(
        shippingWidth, 
        shippingHeight, 
        shippingLength, 
        weight
      );

      // Determine shipping type
      const shippingType = await this.determineShippingType(
        calculatedValues.githValue, 
        calculatedValues.weight
      );

      // Update listing with calculated shipping type
      const updatedListing = await prisma.listing.update({
        where: { id: listingId },
        data: {
          shipTypes: shippingType
        }
      });

      return {
        listingId,
        calculatedValues,
        shippingType,
        updated: true
      };
    } catch (error) {
      console.error(`Error processing listing ${listingId}:`, error);
      return {
        listingId,
        error: error.message,
        updated: false
      };
    }
  }

  // Process all listings (background processing)
  static async processAllListings() {
    try {
      console.log('Starting bulk processing of all listings...');
      
      // Get all listings that have shipping dimensions
      const listings = await prisma.listing.findMany({
        where: {
          attributes: {
            path: ['shippingWidth'],
            not: null
          }
        },
        select: {
          id: true,
          attributes: true
        }
      });

      console.log(`Found ${listings.length} listings to process`);

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const listing of listings) {
        const result = await this.processListing(listing.id);
        results.push(result);
        
        if (result?.updated) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      console.log(`Processing complete: ${successCount} successful, ${errorCount} errors`);

      return {
        totalListings: listings.length,
        successCount,
        errorCount,
        results
      };
    } catch (error) {
      console.error('Error processing all listings:', error);
      throw error;
    }
  }

  // Start background processing for all listings
  static async startBulkProcessing() {
    if (processingStatus.isProcessing) {
      throw new Error('Processing is already in progress');
    }

    // Reset status
    processingStatus = {
      isProcessing: true,
      type: 'all',
      brandId: null,
      totalListings: 0,
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      startTime: new Date(),
      endTime: null,
      estimatedTime: null
    };

    // Start background processing
    setImmediate(async () => {
      try {
        const result = await this.processAllListings();
        
        processingStatus.totalListings = result.totalListings;
        processingStatus.successCount = result.successCount;
        processingStatus.errorCount = result.errorCount;
        processingStatus.processedCount = result.totalListings;
        processingStatus.endTime = new Date();
        processingStatus.isProcessing = false;
        
        console.log('Background processing completed');
      } catch (error) {
        console.error('Background processing failed:', error);
        processingStatus.isProcessing = false;
        processingStatus.endTime = new Date();
      }
    });

    return {
      totalListings: 0, // Will be updated when processing starts
      estimatedTime: 'Calculating...'
    };
  }

  // Start background processing for brand
  static async startBrandProcessing(brandId) {
    if (processingStatus.isProcessing) {
      throw new Error('Processing is already in progress');
    }

    // Reset status
    processingStatus = {
      isProcessing: true,
      type: 'brand',
      brandId: brandId,
      totalListings: 0,
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      startTime: new Date(),
      endTime: null,
      estimatedTime: null
    };

    // Start background processing
    setImmediate(async () => {
      try {
        const result = await this.processBrandListings(brandId);
        
        processingStatus.totalListings = result.totalListings;
        processingStatus.successCount = result.successCount;
        processingStatus.errorCount = result.errorCount;
        processingStatus.processedCount = result.totalListings;
        processingStatus.endTime = new Date();
        processingStatus.isProcessing = false;
        
        console.log(`Background processing for brand ${brandId} completed`);
      } catch (error) {
        console.error(`Background processing for brand ${brandId} failed:`, error);
        processingStatus.isProcessing = false;
        processingStatus.endTime = new Date();
      }
    });

    return {
      totalListings: 0, // Will be updated when processing starts
      estimatedTime: 'Calculating...'
    };
  }

  // Get processing status
  static async getProcessingStatus() {
    return {
      ...processingStatus,
      progress: processingStatus.totalListings > 0 
        ? Math.round((processingStatus.processedCount / processingStatus.totalListings) * 100)
        : 0
    };
  }

  // Get failed products (simple list for admin)
  static async getFailedProducts() {
    try {
      // Get listings that don't have shipping dimensions (failed to process)
      const failedListings = await prisma.listing.findMany({
        where: {
          OR: [
            {
              attributes: {
                path: ['shippingWidth'],
                equals: null
              }
            },
            {
              attributes: {
                path: ['shippingHeight'],
                equals: null
              }
            },
            {
              attributes: {
                path: ['shippingLength'],
                equals: null
              }
            },
            {
              attributes: {
                path: ['weight'],
                equals: null
              }
            }
          ]
        },
        select: {
          id: true,
          title: true,
          sku: true,
          brandId: true,
          shipTypes: true,
          attributes: true
        },
        take: 20 // Limit to 20 failed products for admin view
      });

      return failedListings.map(listing => ({
        id: listing.id,
        title: listing.title,
        sku: listing.sku,
        brandId: listing.brandId,
        shipTypes: listing.shipTypes,
        missingFields: this.getMissingFields(listing.attributes)
      }));
    } catch (error) {
      console.error('Error getting failed products:', error);
      return [];
    }
  }

  // Helper method to identify missing fields
  static getMissingFields(attributes) {
    const missing = [];
    if (!attributes?.shippingWidth) missing.push('shippingWidth');
    if (!attributes?.shippingHeight) missing.push('shippingHeight');
    if (!attributes?.shippingLength) missing.push('shippingLength');
    if (!attributes?.weight) missing.push('weight');
    return missing;
  }

  // Manual override for shipTypes (e.g., "Faiz", "Custom", etc.)
  static async setManualShipType(listingId, shipType) {
    try {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId }
      });

      if (!listing) {
        throw new Error(`Listing with ID ${listingId} not found`);
      }

      // Update listing with manual shipType
      const updatedListing = await prisma.listing.update({
        where: { id: listingId },
        data: {
          shipTypes: shipType
        }
      });

      return {
        listingId,
        shipType: shipType,
        updated: true,
        message: `ShipType manually set to "${shipType}"`
      };
    } catch (error) {
      console.error(`Error setting manual shipType for listing ${listingId}:`, error);
      return {
        listingId,
        error: error.message,
        updated: false
      };
    }
  }

  // Process listings for a specific brand
  static async processBrandListings(brandId) {
    try {
      console.log(`Processing listings for brand ${brandId}...`);
      
      const listings = await prisma.listing.findMany({
        where: {
          brandId: brandId,
          attributes: {
            path: ['shippingWidth'],
            not: null
          }
        },
        select: {
          id: true,
          attributes: true
        }
      });

      console.log(`Found ${listings.length} listings for brand ${brandId}`);

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const listing of listings) {
        const result = await this.processListing(listing.id);
        results.push(result);
        
        if (result?.updated) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      console.log(`Brand processing complete: ${successCount} successful, ${errorCount} errors`);

      return {
        brandId,
        totalListings: listings.length,
        successCount,
        errorCount,
        results
      };
    } catch (error) {
      console.error(`Error processing brand ${brandId} listings:`, error);
      throw error;
    }
  }

  // Get shipping calculation details for a listing (without updating)
  static async getShippingCalculationDetails(listingId) {
    try {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId }
      });

      if (!listing) {
        throw new Error(`Listing with ID ${listingId} not found`);
      }

      const attributes = listing.attributes;
      const shippingWidth = attributes?.shippingWidth;
      const shippingHeight = attributes?.shippingHeight;
      const shippingLength = attributes?.shippingLength;
      const weight = attributes?.weight;

      if (!shippingWidth || !shippingHeight || !shippingLength || !weight) {
        return {
          listingId,
          error: 'Missing shipping dimensions or weight',
          hasRequiredData: false
        };
      }

      // Calculate shipping values
      const calculatedValues = this.calculateShippingValues(
        shippingWidth, 
        shippingHeight, 
        shippingLength, 
        weight
      );

      // Get current shipping type
      const currentShippingType = listing.shipTypes;

      // Determine what shipping type should be
      const recommendedShippingType = await this.determineShippingType(
        calculatedValues.githValue, 
        calculatedWeight
      );

      return {
        listingId,
        hasRequiredData: true,
        dimensions: {
          shippingWidth,
          shippingHeight,
          shippingLength,
          weight
        },
        calculatedValues,
        currentShippingType,
        recommendedShippingType,
        needsUpdate: currentShippingType !== recommendedShippingType
      };
    } catch (error) {
      console.error(`Error getting shipping calculation details for listing ${listingId}:`, error);
      return {
        listingId,
        error: error.message,
        hasRequiredData: false
      };
    }
  }
}

export default ListingShippingValuesCalculator;
