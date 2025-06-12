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

    console.log('🧠 [ENHANCED AI] IA Inteligente configurada:', {
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
      console.warn('⚠️ [ENHANCED AI] API Key não parece ser válida, mas tentando continuar...')
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

      const enhancedContent: EnhancedEmailContent = {
        subject: emailContent.subject,
        previewText: emailContent.previewText || this.generatePreviewText(emailContent.subject),
        html: this.enhanceHTML(emailContent.html, analysis),
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
        promptLength: request.prompt.length,
        stack: error.stack?.substring(0, 200)
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
    console.log('💬 [ENHANCED AI] Chat inteligente:', {
      messageLength: message.length,
      historyCount: chatHistory.length
    })
    
    try {
      const analysis = await this.analyzePrompt(message, projectContext, userHistory)
      const systemPrompt = this.buildSmartChatPrompt(projectContext, analysis)
      const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-10).map(msg => ({
          role: msg.role || (msg.type === 'user' ? 'user' : 'assistant'),
          content: msg.content
        })),
        { role: 'user', content: message }
      ]

      const response = await this.callAI(messages)
      const shouldUpdateEmail = this.detectSmartIntent(message, analysis)
      
      const enhancedResponse: EnhancedChatResponse = {
        response: response.content,
        shouldUpdateEmail,
        analysis,
        suggestions: this.generateSmartSuggestions(message, analysis),
        enhancedContent: shouldUpdateEmail ? await this.generateContentSuggestion(message, projectContext) : undefined,
        metadata: {
          model: response.model,
          tokens: response.usage?.total_tokens || 0,
          confidence: analysis.confidence,
          enhancedFeatures: ['smart-intent-detection', 'contextual-suggestions', 'intelligent-content-generation'],
          processingTime: Date.now() - Date.now()
        }
      }
      
      console.log('✅ [ENHANCED AI] Chat inteligente processado:', {
        shouldUpdateEmail,
        confidence: Math.round(analysis.confidence * 100) + '%',
        hasEnhancedContent: !!enhancedResponse.enhancedContent,
        suggestions: enhancedResponse.suggestions.length
      })
      
      return enhancedResponse
    } catch (error: any) {
      console.error('❌ [ENHANCED AI] Erro no chat inteligente:', error.message)
      throw new Error(`Falha no chat inteligente: ${error.message}`)
    }
  }

  async analyzePrompt(
    prompt: string,
    projectContext?: ProjectContext,
    userHistory?: UserHistory
  ): Promise<PromptAnalysis> {
    console.log('🔍 [ENHANCED AI] Analisando prompt:', {
      promptLength: prompt.length,
      hasContext: !!projectContext
    })

    try {
      const intentions = this.extractIntentions(prompt)
      const visualRequirements = this.extractVisualRequirements(prompt)
      const contentRequirements = this.extractContentRequirements(prompt, projectContext)
      const confidence = this.calculateConfidence(prompt, intentions, visualRequirements)

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
        hasVisualReqs: Object.keys(visualRequirements).length > 0
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
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

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
      console.error('⚠️ [ENHANCED AI] Health check falhou:', error.message)
      return { status: 'unavailable', responseTime: Date.now() - startTime }
    }
  }

  private async callAI(messages: any[], modelOverride?: string): Promise<any> {
    let lastError: any
    const modelsToTry = modelOverride ? [modelOverride] : [this.config.defaultModel, ...this.config.fallbackModels]
    
    for (const model of modelsToTry) {
      try {
        console.log(`🤖 [ENHANCED AI] Tentando modelo: ${model}`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        const requestBody = {
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature: 0.7,
          max_tokens: 1500,
          stream: false
        }

        console.log('📤 [ENHANCED AI] Enviando requisição:', {
          model,
          messagesCount: messages.length,
          temperature: 0.7,
          maxTokens: 1500
        })

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
          isTimeout: error.name === 'AbortError',
          isNetworkError: error.message.includes('fetch')
        })
        
        if (error.name === 'AbortError') {
          console.log('🕐 [ENHANCED AI] Timeout detectado, tentando próximo modelo...')
        }
        
        continue
      }
    }
    
    console.error('❌ [ENHANCED AI] Todos os modelos falharam')
    throw new Error(`Falha em todos os modelos AI: ${lastError?.message || 'Erro desconhecido'}`)
  }

  private buildSmartEmailPrompt(context: ProjectContext, analysis: PromptAnalysis): string {
    return `Você é um especialista em email marketing com IA avançada, criando emails personalizados e de alta conversão.

CONTEXTO DO PROJETO:
- Tipo: ${context.type}
- Indústria: ${context.industry}
- Público-alvo: ${context.targetAudience || 'Geral'}
- Tom: ${context.tone || 'Profissional'}

ANÁLISE DO PROMPT:
- Intenções detectadas: ${analysis.intentions.map(i => i.action).join(', ') || 'Geral'}
- Confiança: ${Math.round(analysis.confidence * 100)}%
- Requisitos visuais: ${Object.keys(analysis.visualRequirements).length > 0 ? 'Sim' : 'Não'}

DIRETRIZES INTELIGENTES:
1. Use a análise de intenção para personalizar o conteúdo
2. Aplique elementos visuais detectados nos requisitos
3. Otimize para o tom e audiência específicos
4. Gere HTML responsivo e acessível
5. Inclua micro-interações quando apropriado
6. Assunto persuasivo (30-50 caracteres)
7. Preview text estratégico
8. CTA contextual e persuasivo

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

ANÁLISE INTELIGENTE:
- Confiança: ${Math.round(analysis.confidence * 100)}%
- Intenções: ${analysis.intentions.map(i => i.action).join(', ') || 'Nenhuma detectada'}
- Foco: ${analysis.contentRequirements.focus.join(', ')}

CAPACIDADES AVANÇADAS:
1. Detectar intenções complexas de modificação
2. Sugerir melhorias específicas baseadas em dados
3. Personalizar respostas por contexto e histórico
4. Gerar conteúdo inteligente quando solicitado
5. Oferecer insights de performance e otimização

INSTRUÇÕES:
- Seja conversacional mas preciso
- Use análise de intenção para respostas contextuais
- Quando detectar pedido de modificação, confirme especificamente
- Ofereça sugestões proativas baseadas no contexto
- Mantenha consistência com o tom do projeto

Responda sempre em português brasileiro de forma inteligente e contextual.`
  }

  private extractIntentions(prompt: string): any[] {
    const intentions = []
    const promptLower = prompt.toLowerCase()

    const intentionPatterns = [
      { keywords: ['criar', 'gerar', 'fazer'], action: 'create', target: 'content' },
      { keywords: ['mudar', 'alterar', 'modificar'], action: 'modify', target: 'existing' },
      { keywords: ['melhorar', 'otimizar', 'aperfeiçoar'], action: 'improve', target: 'quality' },
      { keywords: ['cor', 'color', 'cores'], action: 'customize', target: 'colors' },
      { keywords: ['layout', 'design', 'visual'], action: 'redesign', target: 'layout' },
      { keywords: ['urgente', 'rápido', 'imediato'], action: 'prioritize', target: 'urgency' }
    ]

    intentionPatterns.forEach(pattern => {
      const hasKeyword = pattern.keywords.some(keyword => promptLower.includes(keyword))
      if (hasKeyword) {
        intentions.push({
          action: pattern.action,
          target: pattern.target,
          specification: this.extractSpecification(prompt, pattern.keywords),
          priority: this.calculatePriority(prompt, pattern.keywords),
          scope: 'specific',
          confidence: 0.8
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
        detected: true
      }
    }

    if (promptLower.includes('layout') || promptLower.includes('design')) {
      requirements.layout = {
        type: promptLower.includes('coluna') ? 'multi-column' : 'single-column',
        style: 'modern'
      }
    }

    if (promptLower.includes('fonte') || promptLower.includes('font')) {
      requirements.typography = {
        style: promptLower.includes('moderno') ? 'modern' : 'classic',
        emphasis: promptLower.includes('negrito') ? 'bold' : 'normal'
      }
    }

    return requirements
  }

  private extractContentRequirements(prompt: string, context?: ProjectContext): any {
    const promptLower = prompt.toLowerCase()
    
    const tone = context?.tone || 
      (promptLower.includes('formal') ? 'formal' :
       promptLower.includes('casual') ? 'casual' :
       promptLower.includes('urgente') ? 'urgent' : 'professional')

    const length = promptLower.includes('longo') ? 'long' :
                  promptLower.includes('curto') ? 'short' : 'medium'

    const urgency = promptLower.includes('urgente') || promptLower.includes('imediato') ? 'high' :
                   promptLower.includes('relaxado') ? 'low' : 'medium'

    const focus = []
    if (promptLower.includes('venda')) focus.push('conversion')
    if (promptLower.includes('informação')) focus.push('information')
    if (promptLower.includes('promocao')) focus.push('conversion')
    if (promptLower.includes('engajamento')) focus.push('engagement')
    if (promptLower.includes('marca')) focus.push('branding')
    if (focus.length === 0) focus.push('information')

    return {
      tone,
      length,
      focus,
      urgency,
      personalization: promptLower.includes('personaliz') ? 'advanced' : 'none'
    }
  }

  private calculateConfidence(prompt: string, intentions: any[], visualReqs: any): number {
    let confidence = 0.3

    if (prompt.length > 20) confidence += 0.2
    if (intentions.length > 0) confidence += 0.3
    if (Object.keys(visualReqs).length > 0) confidence += 0.2
    if (prompt.includes('?')) confidence += 0.1

    return Math.min(confidence, 1.0)
  }

  private detectSmartIntent(message: string, analysis: PromptAnalysis): boolean {
    const modificationIntents = ['modify', 'improve', 'customize', 'redesign']
    return analysis.intentions.some(intent => modificationIntents.includes(intent.action))
  }

  private generateSmartSuggestions(message: string, analysis: PromptAnalysis): string[] {
    const suggestions = []
    
    if (analysis.confidence < 0.6) {
      suggestions.push('Ser mais específico sobre o que deseja')
    }
    
    if (analysis.intentions.length === 0) {
      suggestions.push('Adicionar ação clara (criar, modificar, melhorar)')
    }
    
    if (Object.keys(analysis.visualRequirements).length === 0) {
      suggestions.push('Incluir detalhes visuais (cores, layout)')
    }
    
    suggestions.push('Ver análise detalhada do prompt')
    suggestions.push('Gerar nova versão do email')
    suggestions.push('Exportar email atual')
    
    return suggestions.slice(0, 4)
  }

  private enhanceHTML(html: string, analysis: PromptAnalysis): string {
    let enhanced = html

    if (analysis.visualRequirements.colorScheme) {
      const color = analysis.visualRequirements.colorScheme.primary
      enhanced = enhanced.replace(
        /style="[^"]*background[^"]*"/g,
        `style="background: linear-gradient(135deg, ${color}, ${color}cc);"`
      )
    }

    enhanced = enhanced.replace(
      /<table/g,
      '<table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 0 auto;"'
    )

    return enhanced
  }

  private generateSmartCSS(analysis: PromptAnalysis): string {
    const primaryColor = analysis.visualRequirements.colorScheme?.primary || '#3b82f6'
    
    return `
/* MailTrendz Enhanced CSS */
.email-container { 
  max-width: 600px; 
  margin: 0 auto; 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #ffffff;
}

.cta-button {
  background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd);
  color: #ffffff;
  padding: 14px 28px;
  border-radius: 8px;
  text-decoration: none;
  display: inline-block;
  font-weight: 600;
  transition: transform 0.2s ease;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px ${primaryColor}40;
}

@media only screen and (max-width: 600px) {
  .responsive-hide { display: none !important; }
  .responsive-stack { 
    display: block !important; 
    width: 100% !important; 
  }
  .email-container { margin: 0 10px; }
}

.smart-spacing { margin: 20px 0; }
.highlight-text { color: ${primaryColor}; font-weight: 600; }
`
  }

  private generatePreviewText(subject: string): string {
    return `${subject} - Confira os detalhes dentro!`
  }

  private extractComponents(html: string): any[] {
    const components = []
    
    if (html.includes('button') || html.includes('cta')) {
      components.push({ type: 'cta', detected: true })
    }
    
    if (html.includes('img')) {
      components.push({ type: 'image', detected: true })
    }
    
    return components
  }

  private calculateQualityScore(email: EmailContent, analysis: PromptAnalysis): number {
    let score = 0.5

    if (email.subject.length >= 20 && email.subject.length <= 50) score += 0.2
    if (email.previewText && email.previewText.length > 0) score += 0.1
    if (analysis.confidence > 0.7) score += 0.2
    if (email.html.includes('cta') || email.html.includes('button')) score += 0.1

    return Math.min(score, 1.0)
  }

  private getEnhancedFeatures(analysis: PromptAnalysis): string[] {
    const features = ['smart-generation', 'intent-analysis']
    
    if (Object.keys(analysis.visualRequirements).length > 0) {
      features.push('visual-optimization')
    }
    
    if (analysis.confidence > 0.7) {
      features.push('high-confidence-output')
    }
    
    features.push('responsive-design', 'accessibility-optimized')
    
    return features
  }

  private parseEmailResponse(content: string): EmailContent {
    try {
      console.log('🔍 [ENHANCED AI] Parsing resposta:', content.substring(0, 200) + '...')
      
      let cleanContent = content.trim()
      
      cleanContent = cleanContent.replace(/```json\n?|\n?```/g, '')
      cleanContent = cleanContent.replace(/^```|```$/g, '')
      
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanContent = jsonMatch[0]
      }
      
      const parsed = JSON.parse(cleanContent)
      
      const result = {
        subject: parsed.subject || 'Email Inteligente Gerado',
        previewText: parsed.previewText || '',
        html: parsed.html || '<p>Conteúdo inteligente gerado por IA</p>',
        text: parsed.text || parsed.html?.replace(/<[^>]*>/g, '') || 'Conteúdo inteligente gerado por IA'
      }
      
      console.log('✅ [ENHANCED AI] Parse bem-sucedido:', {
        hasSubject: !!result.subject,
        hasHtml: !!result.html,
        htmlLength: result.html.length
      })
      
      return result
    } catch (error: any) {
      console.error('❌ [ENHANCED AI] Erro no parse:', {
        error: error.message,
        contentPreview: content.substring(0, 100)
      })
      
      return {
        subject: 'Email Gerado por IA',
        previewText: 'Conteúdo criado automaticamente',
        html: `<div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2>Email Gerado por IA</h2>
          <p>${content.replace(/[<>]/g, '').substring(0, 500)}</p>
        </div>`,
        text: content.replace(/[<>]/g, '').substring(0, 500)
      }
    }
  }

  private extractSpecification(prompt: string, keywords: string[]): string {
    const sentences = prompt.split(/[.!?]+/)
    for (const sentence of sentences) {
      if (keywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        return sentence.trim().substring(0, 100)
      }
    }
    return 'Modificação solicitada'
  }

  private calculatePriority(prompt: string, keywords: string[]): number {
    const urgentWords = ['urgente', 'rápido', 'imediato', 'agora']
    const isUrgent = urgentWords.some(word => prompt.toLowerCase().includes(word))
    return isUrgent ? 0.9 : 0.7
  }

  private extractColor(prompt: string): string | null {
    const colorMap: { [key: string]: string } = {
      'azul': '#3b82f6',
      'vermelho': '#ef4444',
      'verde': '#10b981',
      'amarelo': '#f59e0b',
      'roxo': '#8b5cf6',
      'laranja': '#f97316',
      'rosa': '#ec4899',
      'preto': '#000000',
      'branco': '#ffffff'
    }

    const promptLower = prompt.toLowerCase()
    for (const [color, hex] of Object.entries(colorMap)) {
      if (promptLower.includes(color)) {
        return hex
      }
    }

    const hexMatch = prompt.match(/#[0-9a-fA-F]{6}/)
    return hexMatch ? hexMatch[0] : null
  }

  private async generateContentSuggestion(message: string, context: ProjectContext): Promise<any> {
    return {
      subject: 'Sugestão inteligente baseada na conversa',
      previewText: 'Conteúdo otimizado por IA',
      html: '<p>Sugestão inteligente será implementada aqui</p>',
      visualElements: {
        colorScheme: { primary: '#3b82f6' },
        layout: { type: 'smart-responsive' },
        typography: { style: 'modern' },
        components: {}
      }
    }
  }
}

export default new EnhancedAIService()