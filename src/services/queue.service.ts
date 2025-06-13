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

// Export for project queue compatibility
export const projectQueue = {
  add: async (job: any) => {
    return QueueService.addToQueue(job)
  },
  process: async () => {
    return QueueService.processQueue()
  }
}

export default QueueService