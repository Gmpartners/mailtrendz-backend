/**
 * ✅ CLIENTE HTTP PYTHON AI - NODE.JS → PYTHON
 * Cliente para comunicação entre Node.js e microserviço Python
 */

import axios, { AxiosResponse, AxiosError } from 'axios'
import { EmailContent, ProjectContext, AIChatResponse } from '../../types/ai.types'
import { logger } from '../../utils/logger'

interface PythonAIConfig {
  baseURL: string
  timeout: number
  retries: number
  retryDelay: number
}

interface PythonAIResponse {
  success: boolean
  data: any
  metadata: any
  processing_time: number
  timestamp: string
}

interface ChatProcessingRequest {
  message: string
  chat_id: string
  user_id: string
  project_id?: string
}

interface EmailModificationRequest {
  project_id: string
  user_id: string
  instructions: string
  preserve_structure?: boolean
}

interface EmailGenerationRequest {
  prompt: string
  context?: any
  style_preferences?: any
  industry?: string
  tone?: string
  urgency?: string
}

/**
 * ✅ CLIENTE PYTHON AI - COMUNICAÇÃO NODE.JS ↔ PYTHON
 * Substitui completamente o AIService.ts antigo
 * Toda IA agora roda no microserviço Python
 */
class PythonAIClient {
  private config: PythonAIConfig
  private isHealthy: boolean = false
  private lastHealthCheck: Date | null = null
  private healthCheckInterval: number = 60000 // 1 minuto

  constructor() {
    this.config = {
      baseURL: process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000',
      timeout: 45000, // 45 segundos
      retries: 2,
      retryDelay: 3000 // 3 segundos
    }

    this.validateConfiguration()
    this.startHealthMonitoring()
  }

  private validateConfiguration(): void {
    if (!this.config.baseURL) {
      logger.warn('⚠️ PYTHON_AI_SERVICE_URL não configurada, usando localhost:5000')
    }
    
    logger.info(`🐍 Python AI Client configurado: ${this.config.baseURL}`)
  }

  private startHealthMonitoring(): void {
    // Health check inicial
    this.checkHealth()
    
    // Health check periódico
    setInterval(() => {
      this.checkHealth()
    }, this.healthCheckInterval)
  }

  // ================================
  // HEALTH CHECK
  // ================================

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseURL}/health`, {
        timeout: 10000
      })
      
      this.isHealthy = response.status === 200 && response.data.status === 'healthy'
      this.lastHealthCheck = new Date()
      
      if (this.isHealthy) {
        logger.debug('✅ Python AI Service: Healthy')
      } else {
        logger.warn('⚠️ Python AI Service: Degraded')
      }
      
      return this.isHealthy
    } catch (error: any) {
      this.isHealthy = false
      this.lastHealthCheck = new Date()
      logger.warn(`❌ Python AI Service: Unhealthy - ${error.message}`)
      return false
    }
  }

  async healthCheck(): Promise<{ status: string, responseTime?: number, timestamp?: Date }> {
    const startTime = Date.now()
    const isHealthy = await this.checkHealth()
    const responseTime = Date.now() - startTime

    return {
      status: isHealthy ? 'available' : 'unavailable',
      responseTime,
      timestamp: new Date()
    }
  }

  // ================================
  // GERAÇÃO DE EMAIL (MÉTODO PRINCIPAL)
  // ================================

  async generateEmail(prompt: string, context: any): Promise<EmailContent> {
    try {
      console.log('🐍 [PYTHON AI] Gerando email via microserviço Python...')
      
      const request: EmailGenerationRequest = {
        prompt: prompt.trim(),
        context: {
          projectName: context.projectName || 'Email Projeto',
          type: context.type || 'newsletter',
          industry: context.industry || 'geral',
          targetAudience: context.targetAudience || 'Geral',
          tone: context.tone || 'professional',
          userId: context.userId
        },
        industry: context.industry || 'geral',
        tone: context.tone || 'professional',
        urgency: context.urgency || 'medium'
      }

      const response = await this.makeRequest<PythonAIResponse>('POST', '/generate', request)

      if (!response.success) {
        throw new Error('Python AI Service returned unsuccessful response')
      }

      const emailData = response.data
      
      console.log('✅ [PYTHON AI] Email gerado com sucesso:', {
        processingTime: response.processing_time,
        qualityScore: response.metadata?.quality_score,
        htmlLength: emailData?.html?.length || 0
      })

      return {
        subject: emailData.subject || 'Email Gerado por IA',
        previewText: emailData.preview_text || 'Conteúdo criado com IA',
        html: emailData.html || '<p>Erro na geração do conteúdo</p>',
        text: emailData.text || 'Email gerado por IA'
      }
    } catch (error: any) {
      console.error('❌ [PYTHON AI] Erro na geração:', error.message)
      return this.generateFallbackEmail(prompt, context)
    }
  }

  // ================================
  // MELHORIA DE EMAIL (MÉTODO PRINCIPAL)
  // ================================

  async improveEmail(content: any, feedback: string, context: any): Promise<EmailContent> {
    try {
      console.log('🐍 [PYTHON AI] Melhorando email via microserviço Python...')
      
      const request: EmailModificationRequest = {
        project_id: context.projectId || 'temp',
        user_id: context.userId || 'temp',
        instructions: feedback,
        preserve_structure: true
      }

      const response = await this.makeRequest<PythonAIResponse>('POST', '/modify', request)

      if (!response.success) {
        throw new Error('Python AI Service returned unsuccessful response')
      }

      const modifiedData = response.data

      console.log('✅ [PYTHON AI] Email melhorado com sucesso:', {
        processingTime: response.processing_time,
        modificationsApplied: modifiedData?.modifications_applied?.length || 0
      })

      return {
        subject: modifiedData.subject || content.subject,
        previewText: content.previewText,
        html: modifiedData.html || content.html,
        text: modifiedData.text || content.text
      }
    } catch (error: any) {
      console.error('❌ [PYTHON AI] Erro na melhoria:', error.message)
      return content // Retorna conteúdo original em caso de erro
    }
  }

  // ================================
  // CHAT INTELIGENTE (MÉTODO PRINCIPAL)
  // ================================

  async smartChat(message: string, history: any[], context: any): Promise<AIChatResponse> {
    try {
      console.log('🐍 [PYTHON AI] Processando chat via microserviço Python...')
      
      const request: ChatProcessingRequest = {
        message: message.trim(),
        chat_id: context.chatId || 'temp',
        user_id: context.userId || 'temp',
        project_id: context.projectId
      }

      const response = await this.makeRequest<any>('POST', '/chat/process', request)

      if (!response.success) {
        throw new Error('Python AI Service returned unsuccessful response')
      }

      const chatData = response.data

      console.log('✅ [PYTHON AI] Chat processado com sucesso:', {
        processingTime: response.metadata?.processing_time,
        shouldUpdateEmail: chatData?.should_update_email,
        projectUpdated: chatData?.project_updated
      })

      return {
        response: chatData.ai_response || 'Resposta processada com sucesso',
        shouldUpdateEmail: chatData.should_update_email || false,
        suggestions: [],
        metadata: {
          model: response.metadata?.model || 'python-ai-service',
          tokens: 0,
          confidence: response.metadata?.confidence || 0.9
        }
      }
    } catch (error: any) {
      console.error('❌ [PYTHON AI] Erro no chat:', error.message)
      return this.generateFallbackChatResponse(message, context)
    }
  }

  // ================================
  // MÉTODOS DE COMUNICAÇÃO HTTP
  // ================================

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    retryCount: number = 0
  ): Promise<T> {
    try {
      const url = `${this.config.baseURL}${endpoint}`
      
      const config = {
        method,
        url,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MailTrendz-NodeJS-Client/2.0.0'
        },
        ...(data && { data })
      }

      const response: AxiosResponse<T> = await axios(config)
      return response.data
    } catch (error: any) {
      const axiosError = error as AxiosError
      
      // Log do erro
      logger.error(`❌ [PYTHON AI] Request failed: ${method} ${endpoint}`, {
        status: axiosError.response?.status,
        message: axiosError.message,
        retryCount
      })

      // Retry logic
      if (retryCount < this.config.retries && this.shouldRetry(axiosError)) {
        logger.info(`🔄 [PYTHON AI] Retrying request (${retryCount + 1}/${this.config.retries})`)
        
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay))
        return this.makeRequest<T>(method, endpoint, data, retryCount + 1)
      }

      throw new Error(`Python AI Service error: ${axiosError.message}`)
    }
  }

  private shouldRetry(error: AxiosError): boolean {
    // Retry em casos específicos
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true
    }
    
    if (error.response) {
      const status = error.response.status
      // Retry em 5xx errors e 429 (rate limit)
      return status >= 500 || status === 429
    }
    
    return false
  }

  // ================================
  // MÉTODOS DE FALLBACK
  // ================================

  private generateFallbackEmail(prompt: string, context: any): EmailContent {
    console.warn('🔄 [PYTHON AI] Usando fallback local para geração de email')
    
    const industry = context.industry || 'geral'
    const industryIcon = this.getIndustryIcon(industry)
    
    const fallbackHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Gerado por IA</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; line-height: 1.6; color: #374151; }
        .cta { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: 600; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        @media (max-width: 600px) { .container { margin: 0; border-radius: 0; } .header, .content { padding: 20px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${industryIcon} Email Criado por IA</h1>
        </div>
        <div class="content">
            <h2>Baseado em sua solicitação</h2>
            <p><em>"${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"</em></p>
            <p>Este email foi gerado automaticamente usando nosso sistema de IA avançado. O conteúdo foi otimizado para <strong>máxima compatibilidade</strong> e <strong>alta conversão</strong>.</p>
            <a href="#" class="cta">Saiba Mais</a>
            <p><strong>Características do email:</strong></p>
            <ul>
                <li>✅ Design responsivo</li>
                <li>✅ Compatível com todos os email clients</li>
                <li>✅ Otimizado para conversão</li>
                <li>✅ Acessibilidade garantida</li>
            </ul>
        </div>
        <div class="footer">
            <p><strong>MailTrendz</strong> - Emails inteligentes com IA</p>
            <p>Sistema de fallback ativo</p>
        </div>
    </div>
</body>
</html>`

    return {
      subject: `${industryIcon} Email Gerado por IA`,
      previewText: 'Conteúdo criado automaticamente com sistema de fallback',
      html: fallbackHTML,
      text: `Email baseado em: "${prompt}"\n\nEste email foi gerado automaticamente usando nosso sistema de IA.\n\nMailTrendz - Emails inteligentes`
    }
  }

  private generateFallbackChatResponse(message: string, context: any): AIChatResponse {
    console.warn('🔄 [PYTHON AI] Usando fallback local para chat')
    
    let response = `Entendi sua mensagem: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}".`
    
    const messageLower = message.toLowerCase()
    
    if (messageLower.includes('cor') || messageLower.includes('color')) {
      response += '\n\n🎨 **Para alterar cores**, tente:\n• "Mude as cores para azul profissional"\n• "Use tons de verde"\n• "Aplique paleta moderna"'
    } else if (messageLower.includes('botão') || messageLower.includes('cta')) {
      response += '\n\n🔘 **Para modificar botões**, tente:\n• "Mude o texto do botão para..."\n• "Deixe o botão mais moderno"\n• "Altere a cor do CTA"'
    } else if (messageLower.includes('design')) {
      response += '\n\n🎨 **Para ajustar design**, tente:\n• "Deixe mais moderno"\n• "Use layout mais limpo"\n• "Aplique estilo minimalista"'
    } else {
      response += '\n\n💡 **Sistema temporariamente offline**\n\nTente:\n• Recarregar a página\n• Aguardar alguns segundos\n• Ser mais específico nas modificações'
    }

    return {
      response,
      shouldUpdateEmail: false,
      suggestions: [
        'Seja mais específico sobre as mudanças',
        'Tente recarregar a página',
        'Use palavras-chave como "mude", "altere", "troque"'
      ],
      metadata: {
        model: 'fallback-local',
        tokens: 0,
        confidence: 0.6
      }
    }
  }

  private getIndustryIcon(industry: string): string {
    const icons: { [key: string]: string } = {
      'saude': '🏥',
      'tecnologia': '💻',
      'educacao': '📚',
      'ecommerce': '🛍️',
      'financas': '💰',
      'geral': '✨'
    }
    
    return icons[industry] || icons['geral']
  }

  // ================================
  // MÉTODOS DE STATUS
  // ================================

  isServiceHealthy(): boolean {
    return this.isHealthy
  }

  getLastHealthCheck(): Date | null {
    return this.lastHealthCheck
  }

  getServiceInfo(): any {
    return {
      baseURL: this.config.baseURL,
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      timeout: this.config.timeout,
      retries: this.config.retries
    }
  }
}

export default new PythonAIClient()
