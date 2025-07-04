// Stub Queue Service
class QueueService {
  static async addToQueue(_job: any) {
    // Stub implementation
    return {
      success: true,
      message: 'Job added to queue',
      jobId: `job_${Date.now()}`
    }
  }

  static async getQueueStatus() {
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }
  }
}

export default QueueService
