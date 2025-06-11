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

// ✅ CORREÇÃO: Interface para resposta da API
interface OpenRouterResponse {
  choices?: Array<{
    message: {
      content: string
    }
  }>
  usage?: {
    total_tokens?: number
    prompt_tokens?: number
    completion_tokens?: number
  }
  error?: {
    message: string
    type: string
  }
}

class AIService {
  private client: any
  private config: OpenRouterConfig

  constructor() {
    // ✅ CORREÇÃO: Converter readonly arrays para mutable
    const fallbackModels = Array.isArray(AI_MODELS?.FALLBACKS) 
      ? [...AI_MODELS.FALLBACKS] 
      : ['anthropic/claude-3-sonnet']

    this.config = {
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultModel: AI_MODELS?.PRIMARY || 'anthropic/claude-3-sonnet',
      fallbackModels
    }

    if (!this.config.apiKey || !this.config.apiKey.startsWith('sk-or-v1-')) {
      throw new Error('OpenRouter API key é obrigatória e deve ser válida')
    }

    console.log('🤖 [AI SERVICE] IA configurada:', {
      baseURL: this.config.baseURL,
      model: this.config.defaultModel,
      hasApiKey: !!this.config.apiKey
    })
  }

  async generateEmail(prompt: string, context: ProjectContext): Promise<EmailContent> {
    const startTime = Date.now()
    
    console.log('🚀 [AI SERVICE] Iniciando geração de email:', {
      userId: context.userId,
      promptLength: prompt.length,
      context: {
        type: context.type,
        industry: context.industry,
        tone: context.tone
      }
    })
    
    try {
      const systemPrompt = this.buildEmailGenerationPrompt(context)
      const userPrompt = prompt

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
        tokens: response.usage?.total_tokens || 0
      })
      
      return emailContent
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('❌ [AI SERVICE] Erro na geração:', error)
      throw error
    }
  }

  async improveEmail(currentEmail: EmailContent, feedback: string, context: ProjectContext): Promise<EmailContent> {
    console.log('🔧 [AI SERVICE] Melhorando email com IA REAL')
    
    try {
      const systemPrompt = `Você é um especialista em email marketing. Melhore o email baseado no feedback do usuário.

EMAIL ATUAL:
- Assunto: ${currentEmail.subject}
- Preview: ${currentEmail.previewText || 'N/A'}
- Tipo: ${context.type}
- Indústria: ${context.industry}

FEEDBACK: ${feedback}

INSTRUÇÕES:
1. Mantenha a estrutura HTML existente
2. Melhore APENAS os elementos mencionados no feedback
3. Retorne JSON no formato exato:
{
  "subject": "novo assunto",
  "previewText": "novo preview",
  "html": "html melhorado",
  "text": "versão texto"
}

IMPORTANTE: Retorne apenas o JSON, sem explicações.`

      const userPrompt = `Melhore este email: ${feedback}`
      
      const response = await this.callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ])

      const improvedEmail = this.parseEmailResponse(response.content)
      
      console.log('✅ [AI SERVICE] Email melhorado:', {
        oldSubject: currentEmail.subject,
        newSubject: improvedEmail.subject,
        model: response.model
      })
      
      return improvedEmail
    } catch (error) {
      console.error('❌ [AI SERVICE] Erro ao melhorar email:', error)
      return this.applySimpleImprovements(currentEmail, feedback)
    }
  }

  // 🔥 FUNÇÃO PRINCIPAL: Chat simples e funcional
  async chatWithAI(message: string, chatHistory: ChatMessage[], projectContext: ProjectContext): Promise<AIChatResponse> {
    console.log('💬 [AI SERVICE] Chat com IA:', {
      messageLength: message.length,
      historyCount: chatHistory.length
    })
    
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
      
      // 🔥 DETECÇÃO SIMPLES: verifica se usuário quer modificar algo
      const shouldUpdateEmail = this.detectSimpleIntent(message)
      
      console.log('🎯 [AI SERVICE] Detecção de intenção:', {
        message: message.substring(0, 50),
        shouldUpdateEmail
      })
      
      return {
        response: response.content,
        shouldUpdateEmail,
        suggestions: this.extractSuggestions(response.content),
        metadata: {
          model: response.model,
          tokens: response.usage?.total_tokens || 0,
          confidence: shouldUpdateEmail ? 0.9 : 0.1
        }
      }
    } catch (error) {
      console.error('❌ [AI SERVICE] Erro na IA:', error)
      throw error
    }
  }

  // 🔥 DETECÇÃO SIMPLES DE INTENÇÃO
  private detectSimpleIntent(message: string): boolean {
    const lowerMessage = message.toLowerCase()
    
    // Palavras que indicam modificação
    const modifyWords = [
      'mude', 'altere', 'modifique', 'troque', 'substitua',
      'adicione', 'inclua', 'coloque', 'insira',
      'remova', 'retire', 'delete', 'tire',
      'melhore', 'otimize', 'aprimore',
      'corrija', 'ajuste', 'atualize'
    ]
    
    // Verifica se tem palavra de modificação
    const hasModifyWord = modifyWords.some(word => lowerMessage.includes(word))
    
    // Verifica se menciona elementos do email
    const emailElements = ['título', 'assunto', 'botão', 'texto', 'conteúdo', 'cor', 'fonte']
    const mentionsEmailElement = emailElements.some(element => lowerMessage.includes(element))
    
    const shouldModify = hasModifyWord && mentionsEmailElement
    
    console.log('🔍 [AI SERVICE] Análise simples:', {
      hasModifyWord,
      mentionsEmailElement,
      shouldModify
    })
    
    return shouldModify
  }

  private async callAI(messages: any[], modelOverride?: string): Promise<any> {
    const model = modelOverride || this.config.defaultModel
    
    try {
      // ✅ CORREÇÃO: Usar AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT || 45000)

      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
          'X-Title': 'MailTrendz AI Email Generator'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: false
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`)
      }

      const data: OpenRouterResponse = await response.json()
      
      // ✅ CORREÇÃO: Verificar se as propriedades existem
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Resposta inválida da API')
      }
      
      return {
        content: data.choices[0].message.content,
        model,
        usage: data.usage || { total_tokens: 0 }
      }
    } catch (error: any) {
      console.error(`❌ [AI SERVICE] Modelo ${model} falhou:`, error.message)
      throw error
    }
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

  private buildChatPrompt(context: ProjectContext): string {
    return `Você é um assistente especialista em email marketing integrando com o sistema MailTrendz.

CONTEXTO DO PROJETO:
- Nome: ${context.projectName}
- Tipo: ${context.type}
- Indústria: ${context.industry}
- Tom: ${context.tone}

INSTRUÇÕES:
1. Responda de forma conversacional e útil
2. Quando o usuário pedir para alterar/melhorar o email, sempre responda que vai fazer as alterações
3. Seja específico sobre as mudanças que está fazendo
4. Use frases como "Vou alterar o assunto para...", "Melhorei o CTA para...", etc.

COMANDOS QUE DEVEM ALTERAR O EMAIL:
- "melhore o assunto"
- "altere o tom"  
- "adicione urgência"
- "mude o CTA"
- "personalize para..."
- Qualquer pedido de modificação no email

Responda sempre em português brasileiro de forma profissional.`
  }

  private extractSuggestions(aiResponse: string): string[] {
    const suggestions = []
    
    if (aiResponse.includes('assunto')) suggestions.push('Melhorar Assunto')
    if (aiResponse.includes('urgência')) suggestions.push('Adicionar Urgência') 
    if (aiResponse.includes('cta') || aiResponse.includes('botão')) suggestions.push('Otimizar CTA')
    if (aiResponse.includes('personaliz')) suggestions.push('Personalizar Mais')
    
    return suggestions.length > 0 ? suggestions : ['Continuar Conversa', 'Exportar Email', 'Nova Versão']
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

  private applySimpleImprovements(currentEmail: EmailContent, feedback: string): EmailContent {
    console.log('🛠️ [AI SERVICE] Aplicando melhorias simples')
    
    let improvedSubject = currentEmail.subject
    let improvedHtml = currentEmail.html
    
    const feedbackLower = feedback.toLowerCase()
    
    if (feedbackLower.includes('urgência') || feedbackLower.includes('urgente')) {
      improvedSubject = `🚨 URGENTE: ${improvedSubject}`
    }
    
    if (feedbackLower.includes('assunto') || feedbackLower.includes('título')) {
      improvedSubject = improvedSubject.includes('✨') ? improvedSubject : `✨ ${improvedSubject}`
    }
    
    if (feedbackLower.includes('cta') || feedbackLower.includes('botão')) {
      improvedHtml = improvedHtml.replace(
        /class="cta"/g,
        'class="cta" style="background: linear-gradient(45deg, #6366f1, #8b5cf6); transform: scale(1.05);"'
      )
    }
    
    return {
      subject: improvedSubject,
      previewText: currentEmail.previewText || '',
      html: improvedHtml,
      text: currentEmail.text || ''
    }
  }

  async healthCheck(): Promise<{ status: 'available' | 'unavailable', responseTime?: number }> {
    const startTime = Date.now()
    try {
      // ✅ CORREÇÃO: Usar AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const testResponse = await fetch(`${this.config.baseURL}/models`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return { status: 'available', responseTime: Date.now() - startTime }
    } catch (error) {
      console.error('⚠️ [AI SERVICE] Health check falhou:', error)
      return { status: 'unavailable', responseTime: Date.now() - startTime }
    }
  }
}

export default new AIService()