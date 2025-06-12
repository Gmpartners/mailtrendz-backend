import EnhancedAIService from './ai/enhanced/EnhancedAIService'

class AIService {
  async healthCheck() {
    try {
      return {
        status: 'ok',
        timestamp: new Date(),
        service: 'ai',
        enhanced: true
      }
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date(),
        service: 'ai',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async improveEmail(content: any, feedback: string, context: any) {
    return EnhancedAIService.improveEmailContent(content, feedback, context)
  }

  async generateEmail(prompt: string, context: any) {
    return EnhancedAIService.generateEmailFromPrompt(prompt, context)
  }

  async smartChat(message: string, history: any[], context: any) {
    return EnhancedAIService.smartChatWithAI(message, history, context)
  }
}

export default new AIService()
