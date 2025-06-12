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
    try {
      const enhancedResponse = await EnhancedAIService.smartChatWithAI(
        `Melhore este email com base no feedback: ${feedback}`,
        [],
        context
      )

      if (enhancedResponse.enhancedContent) {
        return {
          subject: enhancedResponse.enhancedContent.subject,
          previewText: enhancedResponse.enhancedContent.previewText,
          html: enhancedResponse.enhancedContent.html,
          text: enhancedResponse.enhancedContent.html?.replace(/<[^>]*>/g, '') || ''
        }
      }

      return content
    } catch (error) {
      console.error('❌ [AI SERVICE] Erro ao melhorar email:', error)
      throw error
    }
  }

  async generateEmail(prompt: string, context: any) {
    try {
      const smartRequest = {
        prompt,
        projectContext: context,
        useEnhanced: true
      }

      const enhancedContent = await EnhancedAIService.generateSmartEmail(smartRequest)

      return {
        subject: enhancedContent.subject,
        previewText: enhancedContent.previewText,
        html: enhancedContent.html,
        text: enhancedContent.html.replace(/<[^>]*>/g, '')
      }
    } catch (error) {
      console.error('❌ [AI SERVICE] Erro ao gerar email:', error)
      throw error
    }
  }

  async smartChat(message: string, history: any[], context: any) {
    try {
      return await EnhancedAIService.smartChatWithAI(message, history, context)
    } catch (error) {
      console.error('❌ [AI SERVICE] Erro no chat inteligente:', error)
      throw error
    }
  }
}

export default new AIService()
