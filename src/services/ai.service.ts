import axios, { AxiosInstance } from 'axios'
import { EmailContent, ProjectContext, AIResponse, ChatMessage, AIChatResponse } from '../types/ai.types'
import { AI_MODELS, AI_CONFIG } from '../utils/constants'
import { logger, loggerHelpers } from '../utils/logger'
import { createExternalServiceError } from '../middleware/error.middleware'

interface OpenRouterConfig {
  apiKey: string
  baseURL: string
  defaultModel: string
  fallbackModels: string[]
}

class AIService {
  private client: AxiosInstance
  private config: OpenRouterConfig

  constructor() {
    this.config = {
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultModel: AI_MODELS.PRIMARY,
      fallbackModels: AI_MODELS.FALLBACKS
    }

    this.client = axios.create({
      baseURL: this.config.baseURL,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL,
        'X-Title': 'MailTrendz AI Email Generator'
      },
      timeout: AI_CONFIG.TIMEOUT
    })
  }

  async generateEmail(prompt: string, context: ProjectContext): Promise<EmailContent> {
    const startTime = Date.now()
    
    try {
      const systemPrompt = this.buildEmailGenerationPrompt(context)
      const userPrompt = this.enhanceUserPrompt(prompt, context)

      const response = await this.callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ])

      const emailContent = this.parseEmailResponse(response.content)
      
      loggerHelpers.ai.generation(
        context.userId, 
        prompt, 
        response.model, 
        response.usage?.total_tokens
      )

      return emailContent
    } catch (error) {
      loggerHelpers.ai.error(context.userId, 'email_generation', error as Error)
      throw createExternalServiceError('OpenRouter', error as Error)
    }
  }

  async improveEmail(currentEmail: EmailContent, feedback: string, context: ProjectContext): Promise<EmailContent> {
    try {
      const systemPrompt = this.buildImprovementPrompt()
      const userPrompt = `
EMAIL ATUAL:
Assunto: ${currentEmail.subject}
Preview: ${currentEmail.previewText || ''}
HTML: ${currentEmail.html}
Texto: ${currentEmail.text}

FEEDBACK: ${feedback}

Melhore o email baseado no feedback mantendo a estrutura.`

      const response = await this.callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ])

      const improvedEmail = this.parseEmailResponse(response.content)
      
      loggerHelpers.ai.improvement(
        context.userId, 
        context.projectName, 
        feedback, 
        response.model
      )

      return improvedEmail
    } catch (error) {
      loggerHelpers.ai.error(context.userId, 'email_improvement', error as Error)
      throw createExternalServiceError('OpenRouter', error as Error)
    }
  }

  async chatWithAI(message: string, chatHistory: ChatMessage[], projectContext: ProjectContext): Promise<AIChatResponse> {
    try {
      const systemPrompt = this.buildChatPrompt(projectContext)
      const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-10).map(msg => ({ 
          role: msg.type === 'user' ? 'user' : 'assistant', 
          content: msg.content 
        })),
        { role: 'user', content: message }
      ]

      const response = await this.callAI(messages)
      
      const shouldUpdateEmail = this.detectEmailUpdateIntent(message, response.content)
      const suggestions = this.extractSuggestions(response.content)

      loggerHelpers.ai.chat(
        projectContext.userId, 
        projectContext.projectName, 
        response.model, 
        response.usage?.total_tokens
      )

      return {
        response: response.content,
        shouldUpdateEmail,
        suggestions,
        metadata: {
          model: response.model,
          tokens: response.usage?.total_tokens || 0,
          confidence: this.calculateConfidence(response.content)
        }
      }
    } catch (error) {
      loggerHelpers.ai.error(projectContext.userId, 'ai_chat', error as Error)
      throw createExternalServiceError('OpenRouter', error as Error)
    }
  }

  private async callAI(messages: any[], modelOverride?: string): Promise<AIResponse> {
    const models = modelOverride ? [modelOverride] : [this.config.defaultModel, ...this.config.fallbackModels]
    
    for (const model of models) {
      try {
        const response = await this.client.post('/chat/completions', {
          model,
          messages,
          temperature: AI_CONFIG.DEFAULT_TEMPERATURE,
          max_tokens: AI_CONFIG.MAX_TOKENS,
          stream: false
        })

        return {
          content: response.data.choices[0].message.content,
          model,
          usage: response.data.usage
        }
      } catch (error) {
        logger.warn(`Model ${model} failed, trying next...`, { error: (error as Error).message })
        if (model === models[models.length - 1]) {
          throw error
        }
      }
    }
    
    throw new Error('Todos os modelos de IA falharam')
  }

  private buildEmailGenerationPrompt(context: ProjectContext): string {
    return `Você é um especialista em email marketing com 15 anos de experiência criando emails de alta conversão.

CONTEXTO DO PROJETO:
- Tipo: ${context.type}
- Indústria: ${context.industry}
- Público-alvo: ${context.targetAudience || 'Geral'}
- Tom: ${context.tone || 'Profissional e amigável'}

DIRETRIZES OBRIGATÓRIAS:
1. SEMPRE retorne JSON no formato exato abaixo
2. HTML responsivo compatível com clientes de email
3. Assunto otimizado para abertura (30-50 caracteres)
4. Preview text complementar ao assunto
5. Use técnicas de copywriting comprovadas
6. CTA claro e persuasivo
7. Evite palavras que ativam spam filters

FORMATO OBRIGATÓRIO:
{
  "subject": "Assunto otimizado",
  "previewText": "Preview complementar",
  "html": "HTML responsivo completo",
  "text": "Versão texto plano"
}

ESPECIALIDADES POR TIPO:
- welcome: Onboarding, primeiras impressões
- newsletter: Valor informativo, engajamento
- campaign: Persuasão, urgência, benefícios
- promotional: Ofertas, escassez, prova social
- announcement: Novidades, entusiasmo
- follow-up: Relacionamento, valor agregado

Crie emails que convertem!`
  }

  private buildImprovementPrompt(): string {
    return `Você é um consultor de email marketing especializado em otimização.

Analise o email e implemente as melhorias solicitadas mantendo:
- Estrutura HTML responsiva
- Compatibilidade com clientes de email
- Boas práticas de deliverability
- Técnicas de copywriting persuasivo

SEMPRE retorne JSON no formato:
{
  "subject": "Assunto melhorado",
  "previewText": "Preview otimizado", 
  "html": "HTML melhorado",
  "text": "Texto melhorado"
}

Foque em conversão e resultados mensuráveis.`
  }

  private buildChatPrompt(context: ProjectContext): string {
    return `Você é um assistente especializado em email marketing para o projeto "${context.projectName}".

PROJETO ATUAL:
- Tipo: ${context.type}
- Indústria: ${context.industry}
- Status: ${context.status}

SUAS CAPACIDADES:
1. Sugerir melhorias no email
2. Responder dúvidas sobre email marketing
3. Propor variações e testes A/B
4. Otimizar para conversão
5. Adaptar para segmentos

Seja consultivo, prático e focado em resultados. Quando mencionar mudanças no email, indique que pode implementá-las.`
  }

  private enhanceUserPrompt(prompt: string, context: ProjectContext): string {
    const enhancements = []
    
    if (context.industry) enhancements.push(`Indústria: ${context.industry}`)
    if (context.targetAudience) enhancements.push(`Público: ${context.targetAudience}`)
    if (context.tone) enhancements.push(`Tom: ${context.tone}`)

    return enhancements.length > 0 
      ? `${prompt}\n\nContexto: ${enhancements.join(', ')}`
      : prompt
  }

  private parseEmailResponse(content: string): EmailContent {
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleanContent)
      
      if (!parsed.subject || !parsed.html || !parsed.text) {
        throw new Error('Resposta incompleta da IA')
      }

      return {
        subject: parsed.subject,
        previewText: parsed.previewText || '',
        html: this.sanitizeHTML(parsed.html),
        text: parsed.text
      }
    } catch (error) {
      logger.error('Failed to parse AI response', { content, error: (error as Error).message })
      return this.createFallbackEmail(content)
    }
  }

  private sanitizeHTML(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }

  private createFallbackEmail(content: string): EmailContent {
    return {
      subject: 'Email Gerado por IA',
      previewText: 'Confira este email criado especialmente para você',
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Email Gerado por IA</h1>
        <p style="color: #666; line-height: 1.6;">${content.substring(0, 200)}...</p>
        <a href="#" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Ação</a>
      </div>`,
      text: content.substring(0, 500)
    }
  }

  private detectEmailUpdateIntent(userMessage: string, aiResponse: string): boolean {
    const updateKeywords = ['mudar', 'alterar', 'modificar', 'atualizar', 'corrigir', 'melhorar']
    return updateKeywords.some(keyword => userMessage.toLowerCase().includes(keyword))
  }

  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = []
    const lines = content.split('\n')
    
    for (const line of lines) {
      if (line.includes('sugest') || line.includes('recomend') || line.includes('consider')) {
        suggestions.push(line.trim())
      }
    }
    
    return suggestions.slice(0, 3)
  }

  private calculateConfidence(content: string): number {
    // Heurística simples para calcular confiança baseada no tamanho e estrutura da resposta
    const length = content.length
    const hasStructure = content.includes('email') || content.includes('assunto') || content.includes('conteúdo')
    
    let confidence = Math.min(length / 200, 1) * 0.8
    if (hasStructure) confidence += 0.2
    
    return Math.min(confidence, 1)
  }

  async healthCheck(): Promise<{ status: 'available' | 'unavailable', responseTime?: number }> {
    const startTime = Date.now()
    
    try {
      await this.client.get('/models', { timeout: 5000 })
      return { 
        status: 'available', 
        responseTime: Date.now() - startTime 
      }
    } catch (error) {
      logger.error('AI service health check failed:', error)
      return { status: 'unavailable' }
    }
  }
}

export default new AIService()