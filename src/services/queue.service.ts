// Stub Queue Service for compatibility
export class QueueService {
  static async addToQueue(job: any) {
    return {
      success: false,
      message: 'Queue service not implemented'
    }
  }

  static async processQueue() {
    return {
      success: false,
      message: 'Queue service not implemented'
    }
  }
}

export default QueueService