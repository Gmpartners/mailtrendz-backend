// Main AI Service for compatibility
export class AIService {
  static async generateEmail(_prompt: string, _options: any = {}) {
    return {
      success: false,
      message: 'AI Service not available - use Python AI Service instead',
      data: null
    }
  }

  static async improveEmail(_content: string, _instructions: string) {
    return {
      success: false,
      message: 'AI Service not available - use Python AI Service instead',
      data: null
    }
  }

  static async healthCheck() {
    return {
      status: 'unavailable',
      message: 'Use Python AI Service'
    }
  }
}

export default AIService
