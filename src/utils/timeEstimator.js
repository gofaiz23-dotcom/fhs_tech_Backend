/**
 * Industry-level time estimation utility
 * Provides accurate time estimates for background processing jobs
 * Uses smart overhead factors based on batch size
 */

class TimeEstimator {
  /**
   * Estimate processing time based on item count and operation type
   * @param {number} itemCount - Number of items to process
   * @param {string} operationType - Type of operation (product, listing, inventory, image)
   * @returns {string} Human-readable time estimate
   */
  static estimate(itemCount, operationType = 'product') {
    if (itemCount <= 0) return '0 seconds';
    
    // Industry standards (items per second)
    const rates = {
      product: 2,      // 2 products/second (database + images + calculations)
      listing: 3,      // 3 listings/second (simpler structure)
      inventory: 5,    // 5 inventory updates/second (lightweight)
      image: 0.5       // 0.5 images/second (slow download + processing)
    };
    
    const baseRate = rates[operationType] || rates.product;
    
    // Smart overhead factors based on batch size
    let overheadFactor = 1.0;
    
    if (itemCount <= 10) {
      // Small batches: Add 50% overhead (job setup, initial processing)
      overheadFactor = 1.5;
    } else if (itemCount <= 100) {
      // Medium batches: Normal rate (optimal efficiency)
      overheadFactor = 1.0;
    } else {
      // Large batches: Add 20% overhead (memory management, batch processing)
      overheadFactor = 1.2;
    }
    
    // Calculate actual seconds with overhead
    const seconds = Math.ceil((itemCount / baseRate) * overheadFactor);
    
    // Format based on duration
    if (seconds < 5) {
      return '< 5 seconds';
    } else if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 120) {
      return '~1 minute';
    } else {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }
  
  /**
   * Estimate time for product creation
   */
  static estimateProducts(productCount) {
    return this.estimate(productCount, 'product');
  }
  
  /**
   * Estimate time for listing creation
   */
  static estimateListings(listingCount) {
    return this.estimate(listingCount, 'listing');
  }
  
  /**
   * Estimate time for inventory updates
   */
  static estimateInventory(inventoryCount) {
    return this.estimate(inventoryCount, 'inventory');
  }
  
  /**
   * Estimate time for image processing
   */
  static estimateImages(imageCount) {
    return this.estimate(imageCount, 'image');
  }
}

export default TimeEstimator;

