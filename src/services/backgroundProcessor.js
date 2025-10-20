import jobTracker from './jobTracker.js';

// Process items in background without blocking the main thread
class BackgroundProcessor {
  
  // Process bulk operation in background
  static async processBulk(userId, type, items, processFn, batchSize = 50) {
    // Create job
    const jobId = jobTracker.createJob(userId, type, { total: items.length });
    
    // Process in background (non-blocking)
    setImmediate(async () => {
      try {
        const results = {
          success: [],
          failed: []
        };

        // Process in batches
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          
          for (const item of batch) {
            try {
              const result = await processFn(item);
              results.success.push(result);
            } catch (error) {
              results.failed.push({
                item: item.title || item.sku || item.groupSku || 'unknown',
                error: error.message
              });
            }

            // Update progress
            jobTracker.updateProgress(jobId, {
              processed: i + batch.indexOf(item) + 1,
              success: results.success.length,
              failed: results.failed.length,
              errors: results.failed.slice(-10) // Keep last 10 errors
            });
          }

          // Small delay between batches to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Mark as completed
        jobTracker.completeJob(jobId, {
          success: results.success.length,
          failed: results.failed.length,
          errors: results.failed.slice(0, 20), // Keep first 20 errors
          completed: true
        });

      } catch (error) {
        // Mark as failed
        jobTracker.failJob(jobId, error.message);
      }
    });

    return jobId;
  }

  // Process with custom logic
  static async processCustom(userId, type, data, processFn) {
    const jobId = jobTracker.createJob(userId, type, { total: data.total || 100 });
    
    setImmediate(async () => {
      try {
        await processFn(jobId, jobTracker);
        jobTracker.completeJob(jobId);
      } catch (error) {
        jobTracker.failJob(jobId, error.message);
      }
    });

    return jobId;
  }
}

export default BackgroundProcessor;

