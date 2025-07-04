// Stub AI Service for compatibility with existing code
class AIService {
  static async generateEmail(_prompt: string, _options: any = {}) {
    // Stub implementation - actual functionality is in Python AI Service
    return {
      success: false,
      message: 'Please use Python AI Service integration',
      data: null
    }
  }

  static async improveEmail(_content: string, _instructions: string) {
    // Stub implementation - actual functionality is in Python AI Service
    return {
      success: false,
      message: 'Please use Python AI Service integration',
      data: null
    }
  }
}

export default AIService
