// Stub AI Service for compatibility
export class AIService {
  static async generateEmail(prompt: string, options: any = {}) {
    return {
      success: false,
      message: 'AI Service not available - use Python AI Service instead',
      data: null
    }
  }

  static async improveEmail(content: string, instructions: string) {
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

  static async getStatus() {
    return {
      status: 'unavailable',
      message: 'Use Python AI Service instead',
      pythonAIService: process.env.PYTHON_AI_SERVICE_URL || 'not-configured'
    }
  }
}

export default AIService