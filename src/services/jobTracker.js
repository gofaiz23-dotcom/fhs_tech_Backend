// Simple in-memory job tracker (no Redis, no Database)
class JobTracker {
  constructor() {
    this.jobs = new Map(); // Store jobs in memory
    this.maxJobsToKeep = 100; // Keep last 100 jobs
  }

  // Create a new job
  createJob(userId, type, data) {
    const jobId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      jobId,
      userId,
      type, // 'PRODUCT_CREATE', 'PRODUCT_IMAGE', 'PRICING_UPDATE', 'LISTING_IMAGE', 'INVENTORY_UPDATE'
      status: 'PROCESSING', // PROCESSING, COMPLETED, FAILED
      progress: 0, // 0-100%
      data: {
        total: data.total || 0,
        processed: 0,
        success: 0,
        failed: 0,
        errors: []
      },
      startedAt: new Date(),
      completedAt: null
    };

    this.jobs.set(jobId, job);
    this.cleanupOldJobs();
    
    return jobId;
  }

  // Update job progress
  updateProgress(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    Object.assign(job.data, updates);
    
    // Calculate progress percentage
    if (job.data.total > 0) {
      job.progress = Math.round((job.data.processed / job.data.total) * 100);
    }

    this.jobs.set(jobId, job);
  }

  // Mark job as completed
  completeJob(jobId, finalData = {}) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'COMPLETED';
    job.progress = 100;
    job.completedAt = new Date();
    
    if (finalData) {
      Object.assign(job.data, finalData);
    }

    this.jobs.set(jobId, job);
  }

  // Mark job as failed
  failJob(jobId, error) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'FAILED';
    job.completedAt = new Date();
    job.data.error = error;

    this.jobs.set(jobId, job);
  }

  // Get job by ID
  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  // Get all jobs for a user
  getUserJobs(userId) {
    const userJobs = [];
    for (const job of this.jobs.values()) {
      if (job.userId === userId) {
        userJobs.push(job);
      }
    }
    return userJobs.sort((a, b) => b.startedAt - a.startedAt);
  }

  // Get jobs by type (for specific status endpoints)
  getJobsByType(userId, type) {
    const jobs = [];
    for (const job of this.jobs.values()) {
      if (job.userId === userId && job.type.startsWith(type)) {
        jobs.push(job);
      }
    }
    return jobs.sort((a, b) => b.startedAt - a.startedAt);
  }

  // Get all jobs (admin only)
  getAllJobs() {
    return Array.from(this.jobs.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  // Cleanup old completed jobs (keep last 100)
  cleanupOldJobs() {
    if (this.jobs.size <= this.maxJobsToKeep) return;

    const allJobs = Array.from(this.jobs.entries())
      .sort((a, b) => b[1].startedAt - a[1].startedAt);

    // Keep only the most recent maxJobsToKeep jobs
    const jobsToDelete = allJobs.slice(this.maxJobsToKeep);
    jobsToDelete.forEach(([jobId]) => this.jobs.delete(jobId));
  }

  // Get statistics
  getStats() {
    const stats = {
      total: this.jobs.size,
      processing: 0,
      completed: 0,
      failed: 0
    };

    for (const job of this.jobs.values()) {
      if (job.status === 'PROCESSING') stats.processing++;
      else if (job.status === 'COMPLETED') stats.completed++;
      else if (job.status === 'FAILED') stats.failed++;
    }

    return stats;
  }
}

// Singleton instance
const jobTracker = new JobTracker();

export default jobTracker;

