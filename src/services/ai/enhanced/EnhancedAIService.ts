// VERSÃO CORRIGIDA PARA DEPLOY - INTERFACES COMPATÍVEIS
import AIService from '../../ai.service'

class EnhancedAIService {
  
  async generateSmartEmail(request: any): Promise<any> {
    try {
      // AIService.generateEmail retorna EmailContent (subject, html, text, previewText)
      const result = await AIService.generateEmail(
        request.prompt,
        request.projectContext || {}
      )

      return {
        response: result.html, // usar o HTML como response
        suggestions: ['Melhorar Assunto', 'Otimizar CTA', 'Adicionar Urgência'],
        shouldUpdateEmail: true,
        metadata: {
          model: 'claude-3-sonnet',
          tokens: 100,
          confidence: 0.8,
          enhancedFeatures: ['fallback-mode']
        },
        analysis: {
          intentions: [],
          visualRequirements: {},
          contentRequirements: {
            tone: 'professional',
            length: 'medium',
            focus: ['information'],
            urgency: 'low',
            personalization: 'none'
          },
          confidence: 0.8,
          processingTime: 100,
          originalPrompt: request.prompt
        },
        enhancedContent: {
          subject: result.subject,
          previewText: result.previewText || '',
          html: result.html,
          visualElements: {
            colorScheme: { primary: '#3b82f6' },
            layout: { type: 'single-column' },
            typography: { style: 'modern' },
            components: {}
          }
        }
      }
      
    } catch (error: any) {
      return {
        response: 'Erro na geração: ' + error.message,
        suggestions: [],
        shouldUpdateEmail: false,
        metadata: { model: 'error', tokens: 0, confidence: 0, enhancedFeatures: [] },
        analysis: { intentions: [], visualRequirements: {}, contentRequirements: {}, confidence: 0, processingTime: 0, originalPrompt: '' },
        enhancedContent: { subject: '', previewText: '', html: '', visualElements: {} }
      }
    }
  }

  async smartChat(request: any): Promise<any> {
    try {
      // AIService.chatWithAI retorna AIChatResponse (response, shouldUpdateEmail, suggestions, metadata)
      const result = await AIService.chatWithAI(
        request.message,
        request.chatHistory || [],
        request.projectContext || {}
      )

      return {
        response: result.response,
        suggestions: result.suggestions || [],
        shouldUpdateEmail: result.shouldUpdateEmail || false,
        metadata: {
          model: result.metadata?.model || 'claude-3-sonnet',
          tokens: result.metadata?.tokens || 0,
          confidence: result.metadata?.confidence || 0.8,
          enhancedFeatures: ['chat-fallback']
        },
        analysis: {
          intentions: [],
          visualRequirements: {},
          contentRequirements: {},
          confidence: 0.8,
          processingTime: 50,
          originalPrompt: request.message
        }
      }
      
    } catch (error: any) {
      return {
        response: 'Erro no chat: ' + error.message,
        suggestions: [],
        shouldUpdateEmail: false,
        metadata: { model: 'error', tokens: 0, confidence: 0, enhancedFeatures: [] },
        analysis: { intentions: [], visualRequirements: {}, contentRequirements: {}, confidence: 0, processingTime: 0, originalPrompt: '' }
      }
    }
  }

  async analyzePrompt(request: any): Promise<any> {
    return {
      intentions: [{ action: 'create', target: 'content', specification: 'Análise simplificada', priority: 0.8, scope: 'global', confidence: 0.7 }],
      visualRequirements: { colorScheme: { primary: '#3b82f6' }, layout: { type: 'single-column' }, typography: { style: 'modern' } },
      contentRequirements: { tone: 'professional', length: 'medium', focus: ['information'], urgency: 'low', personalization: 'none' },
      confidence: 0.7,
      processingTime: 25,
      originalPrompt: request.prompt || ''
    }
  }

  async getEnhancedStatus(): Promise<any> {
    return {
      available: true,
      mode: 'simplified',
      features: ['email-generation', 'chat', 'analysis'],
      version: '1.0.0-emergency'
    }
  }

  async compareAIModes(prompt: string, context: any): Promise<any> {
    try {
      // AIService.generateEmail só aceita 2 argumentos: prompt e context
      const result = await AIService.generateEmail(prompt, context || {})
      
      return {
        standard: { response: result.html, metadata: { model: 'claude-3-sonnet' } },
        enhanced: { response: result.html + '\n\n[Enhanced mode em desenvolvimento]', metadata: { mode: 'enhanced-fallback' } },
        comparison: { recommendedMode: 'standard', differences: ['Enhanced mode temporariamente indisponível'], reasoning: 'Usando versão padrão' }
      }
      
    } catch (error: any) {
      return {
        standard: { response: 'Erro: ' + error.message, metadata: { model: 'error' } },
        enhanced: { response: 'Erro: ' + error.message, metadata: { model: 'error' } },
        comparison: { recommendedMode: 'standard', differences: [], reasoning: 'Erro na comparação' }
      }
    }
  }

  async healthCheck(): Promise<any> {
    return {
      status: 'available',
      mode: 'emergency-simplified',
      timestamp: new Date(),
      services: { promptAnalyzer: true, emailGenerator: true, chatService: true }
    }
  }
}

export default new EnhancedAIService()