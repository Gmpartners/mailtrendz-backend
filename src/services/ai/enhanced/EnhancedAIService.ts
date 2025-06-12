import { EmailContent, ProjectContext, AIChatResponse } from '../../../types/ai.types'
import { EnhancedEmailContent, SmartEmailRequest, EnhancedChatResponse, PromptAnalysis, UserHistory } from '../../../types/enhanced-ai.types'
import { AI_MODELS, AI_CONFIG } from '../../../utils/constants'
import { logger } from '../../../utils/logger'

interface OpenRouterConfig {
  apiKey: string
  baseURL: string
  defaultModel: string
  fallbackModels: string[]
}

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
    code?: string
  }
}

class EnhancedAIService {
  private config: OpenRouterConfig

  constructor() {
    const fallbackModels = Array.isArray(AI_MODELS?.FALLBACKS) 
      ? [...AI_MODELS.FALLBACKS] 
      : [
          'anthropic/claude-3-sonnet-20240229',
          'anthropic/claude-3-haiku-20240307',
          'openai/gpt-4-turbo',
          'openai/gpt-3.5-turbo'
        ]

    this.config = {
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultModel: 'anthropic/claude-3-sonnet-20240229',
      fallbackModels
    }

    this.validateConfiguration()

    console.log('🧠 [ENHANCED AI] Serviço configurado:', {
      baseURL: this.config.baseURL,
      model: this.config.defaultModel,
      hasApiKey: !!this.config.apiKey,
      fallbackCount: this.config.fallbackModels.length
    })
  }

  private validateConfiguration(): void {
    if (!this.config.apiKey) {
      throw new Error('OPENROUTER_API_KEY é obrigatória nas variáveis de ambiente')
    }

    if (!this.config.apiKey.startsWith('sk-or-v1-')) {
      console.warn('⚠️ [ENHANCED AI] API Key pode estar em formato incorreto')
    }
  }

  async generateSmartEmail(request: SmartEmailRequest): Promise<EnhancedEmailContent> {
    const startTime = Date.now()
    
    console.log('🚀 [ENHANCED AI] Gerando email inteligente:', {
      userId: request.projectContext.userId,
      promptLength: request.prompt.length,
      useEnhanced: request.useEnhanced,
      context: {
        type: request.projectContext.type,
        industry: request.projectContext.industry,
        tone: request.projectContext.tone
      }
    })
    
    try {
      const analysis = await this.analyzePrompt(request.prompt, request.projectContext, request.userHistory)
      const systemPrompt = this.buildSmartEmailPrompt(request.projectContext, analysis)
      const userPrompt = request.prompt

      const response = await this.callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ])

      const emailContent = this.parseEmailResponse(response.content)
      const duration = Date.now() - startTime

      // ✅ CORREÇÃO: ADICIONADA PROPRIEDADE 'text'
      const enhancedContent: EnhancedEmailContent = {
        subject: emailContent.subject,
        previewText: emailContent.previewText || this.generatePreviewText(emailContent.subject),
        html: this.enhanceHTML(emailContent.html, analysis),
        text: emailContent.text || emailContent.html?.replace(/<[^>]*>/g, '') || 'Conteúdo de texto', // ✅ PROPRIEDADE ADICIONADA
        css: this.generateSmartCSS(analysis),
        components: this.extractComponents(emailContent.html),
        analysis,
        metadata: {
          version: '2.0.0-enhanced',
          generated: new Date(),
          model: response.model,
          tokens: response.usage?.total_tokens || 0,
          qualityScore: this.calculateQualityScore(emailContent, analysis),
          compatibilityScore: 0.95,
          accessibilityScore: 0.92,
          estimatedRenderTime: 800,
          supportedClients: ['Gmail', 'Outlook', 'Apple Mail', 'Yahoo', 'Thunderbird'],
          enhancedFeatures: this.getEnhancedFeatures(analysis),
          processingTime: duration
        }
      }
      
      console.log('✅ [ENHANCED AI] Email inteligente gerado:', {
        userId: request.projectContext.userId,
        duration: `${duration}ms`,
        model: response.model,
        tokens: response.usage?.total_tokens || 0,
        qualityScore: enhancedContent.metadata.qualityScore,
        confidence: analysis.confidence
      })
      
      return enhancedContent
    } catch (error: any) {
      console.error('❌ [ENHANCED AI] Erro na geração inteligente:', {
        message: error.message,
        userId: request.projectContext.userId,
        promptLength: request.prompt.length
      })
      
      throw new Error(`Falha na geração inteligente: ${error.message}`)
    }
  }

  async smartChatWithAI(
    message: string,
    chatHistory: any[],
    projectContext: ProjectContext,
    userHistory?: UserHistory
  ): Promise<EnhancedChatResponse> {
    console.log('💬 [ENHANCED AI] Chat inteligente iniciado:', {
      messageLength: message.length,
      historyCount: chatHistory.length,
      hasProjectContent: projectContext.hasProjectContent
    })
    
    try {
      const analysis = await this.analyzePrompt(message, projectContext, userHistory)
      const systemPrompt = this.buildSmartChatPrompt(projectContext, analysis)
      
      const contextualSystemPrompt = this.enrichSystemPromptWithProject(systemPrompt, projectContext)
      
      const messages = [
        { role: 'system', content: contextualSystemPrompt },
        ...chatHistory.slice(-10).map(msg => ({
          role: msg.role || (msg.type === 'user' ? 'user' : 'assistant'),
          content: msg.content
        })),
        { role: 'user', content: message }
      ]

      const response = await this.callAI(messages)
      const shouldUpdateEmail = this.detectSmartIntent(message, analysis, projectContext)
      
      let enhancedContent = undefined
      
      if (shouldUpdateEmail && projectContext.hasProjectContent) {
        enhancedContent = await this.generateUpdatedEmailContent(
          message, 
          projectContext, 
          analysis
        )
      }
      
      const enhancedResponse: EnhancedChatResponse = {
        response: response.content,
        shouldUpdateEmail,
        analysis,
        suggestions: this.generateSmartSuggestions(message, analysis, projectContext),
        enhancedContent,
        metadata: {
          model: response.model,
          tokens: response.usage?.total_tokens || 0,
          confidence: analysis.confidence,
          enhancedFeatures: [
            'smart-intent-detection', 
            'contextual-suggestions', 
            'project-context-awareness',
            shouldUpdateEmail ? 'content-modification' : 'conversational-response'
          ],
          processingTime: Date.now() - Date.now()
        }
      }
      
      console.log('✅ [ENHANCED AI] Chat inteligente processado:', {
        shouldUpdateEmail,
        confidence: Math.round(analysis.confidence * 100) + '%',
        hasEnhancedContent: !!enhancedResponse.enhancedContent,
        suggestions: enhancedResponse.suggestions.length,
        projectContextUsed: projectContext.hasProjectContent
      })
      
      return enhancedResponse
    } catch (error: any) {
      console.error('❌ [ENHANCED AI] Erro no chat inteligente:', error.message)
      
      // ✅ NOVO: Fallback em caso de erro
      return this.createFallbackResponse(message, projectContext, error)
    }
  }

  // ✅ NOVO: Método de fallback para quando a IA falha
  private createFallbackResponse(
    message: string, 
    projectContext: ProjectContext, 
    originalError: Error
  ): EnhancedChatResponse {
    console.log('🔄 [ENHANCED AI] Criando resposta de fallback:', {
      messageLength: message.length,
      hasProject: projectContext.hasProjectContent,
      errorType: originalError.name
    })

    // Resposta contextual baseada no projeto
    let fallbackResponse = `Entendi sua mensagem sobre "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}".`

    if (projectContext.hasProjectContent) {
      fallbackResponse += `\n\nVejo que você está trabalhando no projeto "${projectContext.projectName}". `
      
      // Detectar intenção básica mesmo sem IA
      if (message.toLowerCase().includes('cor') || message.toLowerCase().includes('color')) {
        fallbackResponse += 'Para alterar cores, você pode ser mais específico sobre qual elemento e qual cor deseja. Exemplo: "mude o botão para azul" ou "altere o fundo para verde".'
      } else if (message.toLowerCase().includes('botão') || message.toLowerCase().includes('cta')) {
        fallbackResponse += 'Para modificar botões, especifique o que deseja alterar: cor, texto, tamanho ou posição.'
      } else if (message.toLowerCase().includes('título') || message.toLowerCase().includes('assunto')) {
        fallbackResponse += 'Para alterar o título ou assunto, me diga como gostaria que ficasse o novo texto.'
      } else {
        fallbackResponse += 'Tente ser mais específico sobre o que deseja modificar no email.'
      }
    } else {
      fallbackResponse += '\n\nNo momento estou com dificuldades técnicas, mas posso ajudar assim que o serviço for restabelecido.'
    }

    fallbackResponse += '\n\n⚠️ Houve um problema temporário com o serviço de IA. Tente novamente em alguns momentos.'

    return {
      response: fallbackResponse,
      shouldUpdateEmail: false,
      analysis: {
        intentions: [],
        visualRequirements: {},
        contentRequirements: {
          tone: 'professional',
          length: 'medium',
          focus: ['information'],
          urgency: 'medium',
          personalization: 'none'
        },
        confidence: 0.3, // Baixa confiança para fallback
        processingTime: 0,
        originalPrompt: message
      },
      suggestions: [
        'Tente reformular sua pergunta',
        'Seja mais específico sobre o que deseja',
        'Aguarde alguns momentos e tente novamente'
      ],
      enhancedContent: undefined,
      metadata: {
        model: 'fallback-service',
        tokens: 0,
        confidence: 0.3,
        enhancedFeatures: ['fallback-response', 'basic-intent-detection'],
        processingTime: 100
      }
    }
  }

  private enrichSystemPromptWithProject(basePrompt: string, projectContext: ProjectContext): string {
    if (!projectContext.hasProjectContent || !projectContext.currentEmailContent) {
      return basePrompt
    }

    const emailContext = `

CONTEXTO DO EMAIL ATUAL:
- Assunto: "${projectContext.currentEmailContent.subject || 'Não definido'}"
- Preview: "${projectContext.currentEmailContent.previewText || 'Não definido'}"
- Conteúdo HTML: ${projectContext.currentEmailContent.html ? 'Disponível' : 'Não disponível'}
- Prompt Original: "${projectContext.originalPrompt || 'Não disponível'}"

INSTRUÇÕES PARA MODIFICAÇÕES:
1. Quando o usuário pedir para alterar algo, analise o conteúdo atual
2. Faça modificações específicas baseadas no pedido
3. Mantenha a estrutura geral do email
4. Use o tom e estilo consistentes com o projeto
5. Para mudanças de cores, use CSS inline
6. Para mudanças de texto, altere diretamente o HTML
7. Para mudanças estruturais, reorganize os elementos
`

    return basePrompt + emailContext
  }

  private async generateUpdatedEmailContent(
    message: string, 
    projectContext: ProjectContext, 
    analysis: PromptAnalysis
  ): Promise<any> {
    try {
      console.log('🔧 [ENHANCED AI] Gerando conteúdo atualizado baseado na mensagem...')

      const modificationPrompt = this.buildModificationPrompt(message, projectContext, analysis)
      
      const response = await this.callAI([
        { role: 'system', content: modificationPrompt },
        { role: 'user', content: message }
      ])

      const updatedContent = this.parseEmailResponse(response.content)
      
      return {
        subject: updatedContent.subject || projectContext.currentEmailContent?.subject,
        previewText: updatedContent.previewText || projectContext.currentEmailContent?.previewText,
        html: updatedContent.html || projectContext.currentEmailContent?.html,
        text: updatedContent.text || updatedContent.html?.replace(/<[^>]*>/g, '') || projectContext.currentEmailContent?.text,
        metadata: {
          modifiedBy: message,
          modificationTimestamp: new Date(),
          analysisUsed: analysis,
          originalContent: projectContext.currentEmailContent
        }
      }
    } catch (error: any) {
      console.error('❌ [ENHANCED AI] Erro ao gerar conteúdo atualizado:', error.message)
      return undefined
    }
  }

  private buildModificationPrompt(message: string, projectContext: ProjectContext, analysis: PromptAnalysis): string {
    return `Você é um especialista em modificação de emails que deve alterar o conteúdo atual baseado na solicitação do usuário.

CONTEXTO DO PROJETO:
- Nome: ${projectContext.projectName}
- Tipo: ${projectContext.type}
- Indústria: ${projectContext.industry}
- Tom: ${projectContext.tone}

EMAIL ATUAL:
- Assunto: "${projectContext.currentEmailContent?.subject}"
- HTML: ${projectContext.currentEmailContent?.html}

SOLICITAÇÃO DE MODIFICAÇÃO: "${message}"

ANÁLISE DA INTENÇÃO:
${analysis.intentions.map(i => `- ${i.action} em ${i.target}`).join('\n')}

INSTRUÇÕES:
1. Analise o pedido específico do usuário
2. Faça APENAS as modificações solicitadas
3. Mantenha todo o resto do email igual
4. Use HTML válido e responsivo
5. Para cores, use valores hexadecimais ou nomes válidos
6. Para textos, mantenha o tom do projeto
7. Retorne o email completo modificado

FORMATO OBRIGATÓRIO (JSON válido):
{
  "subject": "Assunto (modificado se solicitado)",
  "previewText": "Preview (modificado se solicitado)",
  "html": "HTML completo com as modificações aplicadas",
  "text": "Versão texto das modificações"
}

Responda APENAS com o JSON válido, sem explicações.`
  }

  async analyzePrompt(
    prompt: string,
    projectContext?: ProjectContext,
    userHistory?: UserHistory
  ): Promise<PromptAnalysis> {
    console.log('🔍 [ENHANCED AI] Analisando prompt:', {
      promptLength: prompt.length,
      hasContext: !!projectContext,
      hasProject: !!projectContext?.hasProjectContent
    })

    try {
      const intentions = this.extractIntentions(prompt, projectContext)
      const visualRequirements = this.extractVisualRequirements(prompt)
      const contentRequirements = this.extractContentRequirements(prompt, projectContext)
      const confidence = this.calculateConfidence(prompt, intentions, visualRequirements, projectContext)

      const analysis: PromptAnalysis = {
        intentions,
        visualRequirements,
        contentRequirements,
        confidence,
        processingTime: 50,
        originalPrompt: prompt
      }

      console.log('✅ [ENHANCED AI] Análise concluída:', {
        confidence: Math.round(confidence * 100) + '%',
        intentions: intentions.length,
        hasVisualReqs: Object.keys(visualRequirements).length > 0,
        hasProjectContext: !!projectContext?.hasProjectContent
      })

      return analysis
    } catch (error: any) {
      console.error('❌ [ENHANCED AI] Erro na análise:', error.message)
      
      return {
        intentions: [],
        visualRequirements: {},
        contentRequirements: {
          tone: 'professional',
          length: 'medium',
          focus: ['information'],
          urgency: 'medium',
          personalization: 'none'
        },
        confidence: 0.5,
        processingTime: 0,
        originalPrompt: prompt
      }
    }
  }

  async healthCheck(): Promise<{ status: 'available' | 'unavailable', responseTime?: number }> {
    const startTime = Date.now()
    try {
      // ✅ NOVO: Health check mais robusto
      if (!this.config.apiKey) {
        console.warn('⚠️ [ENHANCED AI] API Key não configurada')
        return { status: 'unavailable', responseTime: 0 }
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // Timeout reduzido

      const testResponse = await fetch(`${this.config.baseURL}/models`, {
        headers: { 
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime
      
      if (testResponse.ok) {
        console.log('✅ [ENHANCED AI] Health check bem-sucedido')
        return { status: 'available', responseTime }
      } else {
        console.warn('⚠️ [ENHANCED AI] Health check retornou status não-OK:', testResponse.status)
        return { status: 'unavailable', responseTime }
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      console.error('⚠️ [ENHANCED AI] Health check falhou:', {
        message: error.message,
        responseTime,
        isTimeout: error.name === 'AbortError'
      })
      return { status: 'unavailable', responseTime }
    }
  }

  private async callAI(messages: any[], modelOverride?: string): Promise<any> {
    let lastError: any
    const modelsToTry = modelOverride ? [modelOverride] : [this.config.defaultModel, ...this.config.fallbackModels]
    
    for (const model of modelsToTry) {
      try {
        console.log(`🤖 [ENHANCED AI] Tentando modelo: ${model}`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // Timeout reduzido

        const requestBody = {
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        }

        const response = await fetch(`${this.config.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'HTTP-Referer': process.env.FRONTEND_URL || 'https://mailtrendz-frontend.onrender.com',
            'X-Title': 'MailTrendz Enhanced AI'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          let errorData: any = {}
          
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { message: errorText }
          }
          
          throw new Error(`OpenRouter API error (${response.status}): ${errorData.error?.message || errorData.message || 'Unknown error'}`)
        }

        const data: OpenRouterResponse = await response.json()
        
        if (data.error) {
          throw new Error(`OpenRouter API error: ${data.error.message}`)
        }
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Resposta inválida da OpenRouter API - formato inesperado')
        }
        
        console.log('✅ [ENHANCED AI] Resposta recebida com sucesso:', {
          model,
          tokensUsed: data.usage?.total_tokens || 0,
          contentLength: data.choices[0].message.content.length
        })
        
        return {
          content: data.choices[0].message.content,
          model,
          usage: data.usage || { total_tokens: 0 }
        }
      } catch (error: any) {
        lastError = error
        console.error(`❌ [ENHANCED AI] Modelo ${model} falhou:`, {
          message: error.message,
          isTimeout: error.name === 'AbortError'
        })
        
        continue
      }
    }
    
    console.error('❌ [ENHANCED AI] Todos os modelos falharam')
    throw new Error(`Falha em todos os modelos AI: ${lastError?.message || 'Erro desconhecido'}`)
  }

  private buildSmartEmailPrompt(context: ProjectContext, analysis: PromptAnalysis): string {
    return `Você é um especialista em email marketing com IA avançada, criando emails personalizados e de alta conversão.

CONTEXTO DO PROJETO:
- Nome: ${context.projectName}
- Tipo: ${context.type}
- Indústria: ${context.industry}
- Público-alvo: ${context.targetAudience || 'Geral'}
- Tom: ${context.tone || 'Profissional'}
- Status: ${context.status}

ANÁLISE DO PROMPT:
- Intenções detectadas: ${analysis.intentions.map(i => i.action).join(', ') || 'Criação de email'}
- Confiança: ${Math.round(analysis.confidence * 100)}%
- Requisitos visuais: ${Object.keys(analysis.visualRequirements).length > 0 ? 'Detectados' : 'Padrão'}
- Tom solicitado: ${analysis.contentRequirements.tone}
- Foco: ${analysis.contentRequirements.focus.join(', ')}

FORMATO OBRIGATÓRIO (JSON válido):
{
  "subject": "Assunto inteligente e otimizado",
  "previewText": "Preview complementar estratégico",
  "html": "HTML responsivo e inteligente completo",
  "text": "Versão texto plano otimizada"
}

Responda APENAS com o JSON válido, sem explicações adicionais.`
  }

  private buildSmartChatPrompt(context: ProjectContext, analysis: PromptAnalysis): string {
    return `Você é um assistente de IA especializado em email marketing, integrado ao MailTrendz com capacidades avançadas.

CONTEXTO DO PROJETO:
- Nome: ${context.projectName}
- Tipo: ${context.type}
- Indústria: ${context.industry}
- Tom: ${context.tone}
- Status: ${context.status}
- Tem Conteúdo: ${context.hasProjectContent ? 'Sim' : 'Não'}

Responda sempre em português brasileiro de forma inteligente e contextual.`
  }

  private extractIntentions(prompt: string, projectContext?: ProjectContext): any[] {
    const intentions = []
    const promptLower = prompt.toLowerCase()

    const intentionPatterns = [
      { keywords: ['criar', 'gerar', 'fazer', 'novo'], action: 'create', target: 'content' },
      { keywords: ['mudar', 'alterar', 'modificar', 'trocar'], action: 'modify', target: 'existing' },
      { keywords: ['melhorar', 'otimizar'], action: 'improve', target: 'quality' },
      { keywords: ['cor', 'cores'], action: 'customize', target: 'colors' },
      { keywords: ['botão', 'cta'], action: 'modify', target: 'cta' }
    ]

    intentionPatterns.forEach(pattern => {
      const hasKeyword = pattern.keywords.some(keyword => promptLower.includes(keyword))
      if (hasKeyword) {
        const confidence = projectContext?.hasProjectContent ? 0.9 : 0.7
        intentions.push({
          action: pattern.action,
          target: pattern.target,
          confidence,
          projectAware: !!projectContext?.hasProjectContent
        })
      }
    })

    return intentions
  }

  private extractVisualRequirements(prompt: string): any {
    const requirements: any = {}
    const promptLower = prompt.toLowerCase()

    if (promptLower.includes('cor') || promptLower.includes('color')) {
      requirements.colorScheme = {
        primary: this.extractColor(prompt) || '#3b82f6',
        detected: true,
        source: 'user_prompt'
      }
    }

    return requirements
  }

  private extractColor(prompt: string): string | null {
    const colorMap: { [key: string]: string } = {
      'azul': '#3b82f6',
      'vermelho': '#ef4444',
      'verde': '#10b981',
      'amarelo': '#f59e0b',
      'roxo': '#8b5cf6'
    }

    const promptLower = prompt.toLowerCase()
    for (const [color, hex] of Object.entries(colorMap)) {
      if (promptLower.includes(color)) {
        return hex
      }
    }

    return null
  }

  private extractContentRequirements(prompt: string, context?: ProjectContext): any {
    const promptLower = prompt.toLowerCase()
    
    const tone = context?.tone || 'professional'
    const length = promptLower.includes('longo') ? 'long' : 'medium'
    const urgency = promptLower.includes('urgente') ? 'high' : 'medium'

    return {
      tone,
      length,
      focus: ['information'],
      urgency,
      personalization: 'basic'
    }
  }

  private calculateConfidence(prompt: string, intentions: any[], visualReqs: any, projectContext?: ProjectContext): number {
    let confidence = 0.3

    if (prompt.length > 20) confidence += 0.1
    if (intentions.length > 0) confidence += 0.2
    if (Object.keys(visualReqs).length > 0) confidence += 0.1

    if (projectContext?.hasProjectContent) {
      confidence += 0.2
      const hasModificationIntent = intentions.some(i => 
        ['modify', 'edit', 'improve', 'customize'].includes(i.action)
      )
      if (hasModificationIntent) confidence += 0.15
    }

    return Math.min(confidence, 1.0)
  }

  private detectSmartIntent(message: string, analysis: PromptAnalysis, projectContext?: ProjectContext): boolean {
    if (!projectContext?.hasProjectContent) return false
    
    const modificationIntents = ['modify', 'edit', 'improve', 'customize']
    const hasModificationIntent = analysis.intentions.some(intent => 
      modificationIntents.includes(intent.action)
    )
    
    const modificationKeywords = ['mude', 'altere', 'modifique', 'cor', 'botão']
    const hasModificationKeywords = modificationKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    )
    
    return hasModificationIntent || hasModificationKeywords
  }

  private generateSmartSuggestions(message: string, analysis: PromptAnalysis, projectContext?: ProjectContext): string[] {
    const suggestions = []
    
    if (analysis.confidence < 0.6) {
      suggestions.push('Seja mais específico sobre o que deseja modificar')
    }
    
    if (projectContext?.hasProjectContent) {
      suggestions.push('Posso aplicar mudanças automaticamente')
    }
    
    suggestions.push('Ver prévia do resultado')
    
    return suggestions.slice(0, 3)
  }

  private enhanceHTML(html: string, analysis: PromptAnalysis): string {
    return html
  }

  private generateSmartCSS(analysis: PromptAnalysis): string {
    return `.email-table { width: 100%; max-width: 600px; margin: 0 auto; }`
  }

  private generatePreviewText(subject: string): string {
    return `${subject} - Confira os detalhes dentro!`
  }

  private extractComponents(html: string): any[] {
    return []
  }

  private calculateQualityScore(email: EmailContent, analysis: PromptAnalysis): number {
    return 0.8
  }

  private getEnhancedFeatures(analysis: PromptAnalysis): string[] {
    return ['smart-generation', 'intent-analysis']
  }

  private parseEmailResponse(content: string): EmailContent {
    try {
      let cleanContent = content.trim()
      cleanContent = cleanContent.replace(/```json\n?|\n?```/g, '')
      
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanContent = jsonMatch[0]
      }
      
      const parsed = JSON.parse(cleanContent)
      
      return {
        subject: parsed.subject || 'Email Inteligente Gerado',
        previewText: parsed.previewText || '',
        html: parsed.html || '<p>Conteúdo gerado por IA</p>',
        text: parsed.text || parsed.html?.replace(/<[^>]*>/g, '') || 'Conteúdo gerado por IA'
      }
    } catch (error: any) {
      return {
        subject: 'Email Gerado por IA',
        previewText: 'Conteúdo criado automaticamente',
        html: '<p>Conteúdo gerado por IA</p>',
        text: 'Conteúdo gerado por IA'
      }
    }
  }

  private validateHTML(html: string): string {
    if (!html || typeof html !== 'string') {
      return '<p>Conteúdo não disponível</p>'
    }
    return html
  }

  private createFallbackHTML(content: string): string {
    return `<p>${content}</p>`
  }

  private extractSpecification(prompt: string, keywords: string[]): string {
    return 'Modificação solicitada'
  }

  private calculatePriority(prompt: string, keywords: string[]): number {
    return 0.7
  }
}

export default new EnhancedAIService()
