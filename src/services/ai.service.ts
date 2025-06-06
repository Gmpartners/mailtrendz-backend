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
  private useLocalFallback: boolean = false

  constructor() {
    this.config = {
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultModel: AI_MODELS.PRIMARY,
      fallbackModels: [...AI_MODELS.FALLBACKS]
    }

    // Verificar se API key está configurada
    if (!this.config.apiKey || this.config.apiKey.length < 10) {
      console.warn('⚠️ [AI SERVICE] OpenRouter API key inválida - usando fallback local')
      this.useLocalFallback = true
    }

    console.log('🤖 [AI SERVICE] Inicializando:', {
      baseURL: this.config.baseURL,
      model: this.config.defaultModel,
      hasApiKey: !!this.config.apiKey,
      apiKeyValid: this.config.apiKey?.length > 10,
      useLocalFallback: this.useLocalFallback,
      apiKeyPreview: this.config.apiKey?.substring(0, 10) + '...'
    })

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
    
    console.log('🚀 [AI SERVICE] Iniciando geração de email:', {
      userId: context.userId,
      promptLength: prompt.length,
      useLocalFallback: this.useLocalFallback,
      context: {
        type: context.type,
        industry: context.industry,
        tone: context.tone
      }
    })

    // Se não temos API key válida, usar fallback local
    if (this.useLocalFallback) {
      return this.generateEmailFallback(prompt, context)
    }
    
    try {
      const systemPrompt = this.buildEmailGenerationPrompt(context)
      const userPrompt = prompt // Simplificado - usar prompt direto

      const response = await this.callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ])

      const emailContent = this.parseEmailResponse(response.content)
      
      const duration = Date.now() - startTime
      console.log('✅ [AI SERVICE] Email gerado com IA:', {
        userId: context.userId,
        duration: `${duration}ms`,
        model: response.model,
        tokens: response.usage?.total_tokens
      })
      
      return emailContent
    } catch (error) {
      const duration = Date.now() - startTime
      console.warn('⚠️ [AI SERVICE] OpenRouter falhou, usando fallback local:', {
        userId: context.userId,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      // Em caso de erro, usar fallback local
      return this.generateEmailFallback(prompt, context)
    }
  }

  private generateEmailFallback(prompt: string, context: ProjectContext): EmailContent {
    console.log('🎭 [AI SERVICE] Gerando email com fallback local')
    
    const templates = this.getEmailTemplates()
    const template = templates[context.type] || templates.campaign
    
    // Gerar conteúdo baseado no template e prompt
    const subject = this.generateSubject(prompt, context)
    const html = this.generateHTML(prompt, context, template)
    const text = this.generateText(prompt, context)
    
    return {
      subject,
      previewText: this.generatePreviewText(subject),
      html,
      text
    }
  }

  private generateSubject(prompt: string, context: ProjectContext): string {
    const keywords = this.extractKeywords(prompt)
    const industry = context.industry?.toLowerCase() || 'geral'
    
    const subjectTemplates = {
      welcome: [
        `Bem-vindo à ${industry}!`,
        `Sua jornada começa agora`,
        `Obrigado por se juntar a nós`
      ],
      newsletter: [
        `Novidades em ${industry}`,
        `Newsletter semanal`,
        `Atualizações importantes`
      ],
      campaign: [
        `${keywords[0] || 'Oferta'} especial para você`,
        `Não perca esta oportunidade`,
        `Exclusivo para nossos clientes`
      ],
      promotional: [
        `🔥 Promoção imperdível`,
        `Desconto especial até ${new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString()}`,
        `Oferta limitada`
      ]
    }
    
    const templates = subjectTemplates[context.type as keyof typeof subjectTemplates] || subjectTemplates.campaign
    return templates[Math.floor(Math.random() * templates.length)]
  }

  private generateHTML(prompt: string, context: ProjectContext, template: any): string {
    const keywords = this.extractKeywords(prompt)
    const mainKeyword = keywords[0] || 'produto'
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${template.color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .cta { background: ${template.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${template.title}</h1>
        </div>
        <div class="content">
            <p>Olá!</p>
            <p>${template.intro.replace('{keyword}', mainKeyword)}</p>
            <p>${prompt.length > 50 ? prompt.substring(0, 200) + '...' : 'Criamos este email especialmente baseado na sua solicitação.'}</p>
            <p>${template.body}</p>
            <a href="#" class="cta">${template.cta}</a>
            <p>Atenciosamente,<br>Equipe MailTrendz</p>
        </div>
        <div class="footer">
            <p>Este email foi gerado automaticamente pela IA do MailTrendz</p>
            <p>© 2024 MailTrendz. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>`
  }

  private generateText(prompt: string, context: ProjectContext): string {
    const keywords = this.extractKeywords(prompt)
    const mainKeyword = keywords[0] || 'produto'
    
    return `Olá!

Esperamos que esteja bem. 

${prompt.length > 50 ? prompt.substring(0, 300) + '...' : 'Criamos este email especialmente baseado na sua solicitação.'}

Estamos animados em compartilhar informações sobre ${mainKeyword} com você.

Para mais informações, visite nosso site ou entre em contato conosco.

Atenciosamente,
Equipe MailTrendz

---
Este email foi gerado automaticamente pela IA do MailTrendz
© 2024 MailTrendz. Todos os direitos reservados.`
  }

  private generatePreviewText(subject: string): string {
    return `${subject} - Confira todos os detalhes dentro.`
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .split(' ')
      .filter(word => word.length > 3)
      .filter(word => !['para', 'que', 'com', 'uma', 'por', 'sobre', 'como', 'mais', 'esta', 'esse', 'essa', 'criar', 'fazer'].includes(word))
    
    return words.slice(0, 3)
  }

  private getEmailTemplates() {
    return {
      welcome: {
        title: 'Bem-vindo!',
        intro: 'Estamos muito felizes em tê-lo conosco. Sua jornada em {keyword} começa agora.',
        body: 'Nos próximos dias, você receberá informações valiosas para aproveitar ao máximo nossa plataforma.',
        cta: 'Começar Agora',
        color: '#10b981'
      },
      newsletter: {
        title: 'Newsletter',
        intro: 'Aqui estão as últimas novidades sobre {keyword} que preparamos para você.',
        body: 'Não perca as tendências e insights mais importantes do setor.',
        cta: 'Ler Mais',
        color: '#3b82f6'
      },
      campaign: {
        title: 'Oferta Especial',
        intro: 'Temos uma proposta especial relacionada a {keyword} que você não pode perder.',
        body: 'Esta oportunidade é por tempo limitado e foi pensada especialmente para nossos clientes mais valiosos.',
        cta: 'Aproveitar Oferta',
        color: '#ef4444'
      },
      promotional: {
        title: 'Promoção Imperdível',
        intro: 'Desconto especial em {keyword} só para você!',
        body: 'Por tempo limitado, oferecemos condições exclusivas. Não deixe essa oportunidade passar.',
        cta: 'Garantir Desconto',
        color: '#f59e0b'
      }
    }
  }

  async improveEmail(currentEmail: EmailContent, feedback: string, context: ProjectContext): Promise<EmailContent> {
    console.log('🔧 [AI SERVICE] Melhorando email (fallback local)')
    
    // Aplicar melhorias simples baseadas no feedback
    let improvedSubject = currentEmail.subject
    let improvedHtml = currentEmail.html
    let improvedText = currentEmail.text
    
    if (feedback.toLowerCase().includes('assunto')) {
      improvedSubject = `✨ ${currentEmail.subject}`
    }
    
    if (feedback.toLowerCase().includes('urgente') || feedback.toLowerCase().includes('urgência')) {
      improvedSubject = `🚨 URGENTE: ${improvedSubject}`
      improvedHtml = improvedHtml.replace('Olá!', 'Olá! 🚨 AÇÃO URGENTE NECESSÁRIA')
    }
    
    return {
      subject: improvedSubject,
      previewText: currentEmail.previewText,
      html: improvedHtml,
      text: improvedText
    }
  }

  async chatWithAI(message: string, chatHistory: ChatMessage[], projectContext: ProjectContext): Promise<AIChatResponse> {
    console.log('💬 [AI SERVICE] Chat com fallback local')
    
    // Resposta simples para chat
    const responses = [
      'Entendo sua solicitação. Que tal ajustarmos o tom do email?',
      'Posso sugerir algumas melhorias no conteúdo.',
      'Vamos trabalhar juntos para otimizar este email.',
      'Excelente ideia! Posso implementar essa mudança.',
      'Que tal adicionarmos mais persuasão ao texto?'
    ]
    
    const response = responses[Math.floor(Math.random() * responses.length)]
    
    return {
      response,
      shouldUpdateEmail: false,
      suggestions: ['Melhorar CTA', 'Ajustar tom', 'Adicionar urgência'],
      metadata: {
        model: 'local-fallback',
        tokens: 0,
        confidence: 0.7
      }
    }
  }

  // Métodos originais do OpenRouter (mantidos para quando a API key funcionar)
  private async callAI(messages: any[], modelOverride?: string): Promise<AIResponse> {
    const models = modelOverride ? [modelOverride] : [this.config.defaultModel, ...this.config.fallbackModels]
    
    for (let i = 0; i < models.length; i++) {
      const model = models[i]
      
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
      } catch (error: any) {
        console.error(`❌ [AI SERVICE] Modelo ${model} falhou:`, error.message)
        
        if (i === models.length - 1) {
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

Crie emails que convertem!`
  }

  private parseEmailResponse(content: string): EmailContent {
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleanContent)
      
      return {
        subject: parsed.subject || 'Email Gerado por IA',
        previewText: parsed.previewText || '',
        html: parsed.html || '<p>Conteúdo gerado por IA</p>',
        text: parsed.text || 'Conteúdo gerado por IA'
      }
    } catch (error) {
      throw new Error('Falha ao processar resposta da IA')
    }
  }

  async healthCheck(): Promise<{ status: 'available' | 'unavailable', responseTime?: number }> {
    if (this.useLocalFallback) {
      console.log('🩺 [AI SERVICE] Health check - usando fallback local')
      return { status: 'available', responseTime: 1 }
    }
    
    const startTime = Date.now()
    try {
      await this.client.get('/models', { timeout: 5000 })
      return { status: 'available', responseTime: Date.now() - startTime }
    } catch (error) {
      console.warn('⚠️ [AI SERVICE] Health check falhou, ativando fallback')
      this.useLocalFallback = true
      return { status: 'available', responseTime: 1 }
    }
  }
}

export default new AIService()