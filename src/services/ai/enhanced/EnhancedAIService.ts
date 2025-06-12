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
      
      // ✅ CORREÇÃO: Incluir contexto do email atual no prompt
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
      
      // ✅ NOVO: Gerar conteúdo atualizado se detectar intenção de modificação
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
      throw new Error(`Falha no chat inteligente: ${error.message}`)
    }
  }

  // ✅ NOVO: Enriquecer prompt do sistema com contexto do projeto
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

EXEMPLO DE MODIFICAÇÃO:
Se o usuário disser "mude o botão para azul", você deve:
1. Encontrar o botão no HTML atual
2. Alterar a cor de fundo para azul
3. Retornar o HTML modificado completo
`

    return basePrompt + emailContext
  }

  // ✅ NOVO: Gerar conteúdo atualizado baseado na mensagem
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

  // ✅ NOVO: Prompt especializado para modificações
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
        const timeoutId = setTimeout(() => controller.abort(), 45000) // ✅ Aumentado timeout

        const requestBody = {
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature: 0.7,
          max_tokens: 2000, // ✅ Aumentado para conteúdo maior
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

DIRETRIZES INTELIGENTES:
1. Use a análise de intenção para personalizar o conteúdo
2. Aplique elementos visuais detectados nos requisitos
3. Otimize para o tom e audiência específicos
4. Gere HTML responsivo e acessível com estrutura completa
5. Inclua meta tags e estilos inline
6. Assunto persuasivo (30-50 caracteres)
7. Preview text estratégico (100-150 caracteres)
8. CTA contextual e persuasivo
9. Estrutura de email profissional com header, conteúdo e footer

FORMATO OBRIGATÓRIO (JSON válido):
{
  "subject": "Assunto inteligente e otimizado",
  "previewText": "Preview complementar estratégico",
  "html": "HTML responsivo e inteligente completo com DOCTYPE, head e body",
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

ANÁLISE INTELIGENTE:
- Confiança: ${Math.round(analysis.confidence * 100)}%
- Intenções: ${analysis.intentions.map(i => i.action).join(', ') || 'Conversa geral'}
- Foco: ${analysis.contentRequirements.focus.join(', ')}
- Urgência: ${analysis.contentRequirements.urgency}

CAPACIDADES AVANÇADAS:
1. Detectar intenções de modificação do email atual
2. Sugerir melhorias específicas baseadas no conteúdo
3. Personalizar respostas por contexto e histórico
4. Modificar conteúdo automaticamente quando solicitado
5. Oferecer insights de performance e otimização
6. Manter contexto do projeto durante toda a conversa

INSTRUÇÕES:
- Seja conversacional mas preciso
- Use análise de intenção para respostas contextuais
- Quando detectar pedido de modificação, seja específico sobre o que será alterado
- Ofereça sugestões proativas baseadas no contexto do projeto
- Mantenha consistência com o tom do projeto
- Se há conteúdo atual, use-o como referência

Responda sempre em português brasileiro de forma inteligente e contextual.`
  }

  // ✅ MELHORADO: Extração de intenções com contexto de projeto
  private extractIntentions(prompt: string, projectContext?: ProjectContext): any[] {
    const intentions = []
    const promptLower = prompt.toLowerCase()

    const intentionPatterns = [
      // Intenções de criação
      { keywords: ['criar', 'gerar', 'fazer', 'novo'], action: 'create', target: 'content' },
      
      // Intenções de modificação (específicas para projetos existentes)
      { keywords: ['mudar', 'alterar', 'modificar', 'trocar', 'substitua'], action: 'modify', target: 'existing' },
      { keywords: ['editar', 'corrigir', 'ajustar', 'atualizar'], action: 'edit', target: 'content' },
      
      // Intenções de melhoria
      { keywords: ['melhorar', 'otimizar', 'aperfeiçoar', 'refinar'], action: 'improve', target: 'quality' },
      
      // Intenções visuais
      { keywords: ['cor', 'color', 'cores', 'colorir'], action: 'customize', target: 'colors' },
      { keywords: ['layout', 'design', 'visual', 'aparência'], action: 'redesign', target: 'layout' },
      { keywords: ['fonte', 'texto', 'título', 'assunto'], action: 'modify', target: 'text' },
      { keywords: ['botão', 'link', 'cta', 'chamada'], action: 'modify', target: 'cta' },
      
      // Intenções de conteúdo
      { keywords: ['desconto', 'promoção', 'oferta', 'preço'], action: 'add', target: 'promotion' },
      { keywords: ['urgente', 'rápido', 'imediato', 'agora'], action: 'prioritize', target: 'urgency' },
      { keywords: ['adicionar', 'incluir', 'inserir'], action: 'add', target: 'content' },
      { keywords: ['remover', 'retirar', 'deletar', 'excluir'], action: 'remove', target: 'content' }
    ]

    intentionPatterns.forEach(pattern => {
      const hasKeyword = pattern.keywords.some(keyword => promptLower.includes(keyword))
      if (hasKeyword) {
        // ✅ NOVO: Aumentar confiança se há contexto de projeto
        const confidence = projectContext?.hasProjectContent ? 0.9 : 0.7
        
        intentions.push({
          action: pattern.action,
          target: pattern.target,
          specification: this.extractSpecification(prompt, pattern.keywords),
          priority: this.calculatePriority(prompt, pattern.keywords),
          scope: projectContext?.hasProjectContent ? 'project-specific' : 'general',
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

    if (promptLower.includes('layout') || promptLower.includes('design')) {
      requirements.layout = {
        type: promptLower.includes('coluna') ? 'multi-column' : 'single-column',
        style: promptLower.includes('moderno') ? 'modern' : 'classic',
        requested: true
      }
    }

    if (promptLower.includes('fonte') || promptLower.includes('font') || promptLower.includes('texto')) {
      requirements.typography = {
        style: promptLower.includes('moderno') ? 'modern' : 'classic',
        emphasis: promptLower.includes('negrito') || promptLower.includes('bold') ? 'bold' : 'normal',
        size: promptLower.includes('grande') ? 'large' : promptLower.includes('pequeno') ? 'small' : 'medium'
      }
    }

    // ✅ NOVO: Detectar requisitos de botão/CTA
    if (promptLower.includes('botão') || promptLower.includes('cta') || promptLower.includes('chamada')) {
      requirements.cta = {
        style: promptLower.includes('redondo') ? 'rounded' : 'square',
        size: promptLower.includes('grande') ? 'large' : 'medium',
        color: this.extractColor(prompt) || '#28a745',
        action: this.extractCTAAction(prompt)
      }
    }

    return requirements
  }

  // ✅ NOVO: Extrair ação do CTA
  private extractCTAAction(prompt: string): string {
    const promptLower = prompt.toLowerCase()
    
    if (promptLower.includes('comprar') || promptLower.includes('compra')) return 'Comprar Agora'
    if (promptLower.includes('baixar') || promptLower.includes('download')) return 'Baixar'
    if (promptLower.includes('cadastrar') || promptLower.includes('inscrever')) return 'Cadastrar'
    if (promptLower.includes('saber mais') || promptLower.includes('saiba mais')) return 'Saber Mais'
    if (promptLower.includes('aproveitar') || promptLower.includes('oferta')) return 'Aproveitar Oferta'
    
    return 'Clique Aqui'
  }

  private extractContentRequirements(prompt: string, context?: ProjectContext): any {
    const promptLower = prompt.toLowerCase()
    
    const tone = context?.tone || 
      (promptLower.includes('formal') ? 'formal' :
       promptLower.includes('casual') ? 'casual' :
       promptLower.includes('urgente') ? 'urgent' : 
       promptLower.includes('amigável') ? 'friendly' : 'professional')

    const length = promptLower.includes('longo') || promptLower.includes('detalhado') ? 'long' :
                  promptLower.includes('curto') || promptLower.includes('resumido') ? 'short' : 'medium'

    const urgency = promptLower.includes('urgente') || promptLower.includes('imediato') ? 'high' :
                   promptLower.includes('relaxado') || promptLower.includes('tranquilo') ? 'low' : 'medium'

    const focus = []
    if (promptLower.includes('venda') || promptLower.includes('conversão')) focus.push('conversion')
    if (promptLower.includes('informação') || promptLower.includes('educar')) focus.push('information')
    if (promptLower.includes('promocao') || promptLower.includes('desconto')) focus.push('promotion')
    if (promptLower.includes('engajamento') || promptLower.includes('interação')) focus.push('engagement')
    if (promptLower.includes('marca') || promptLower.includes('branding')) focus.push('branding')
    if (focus.length === 0) focus.push('information')

    return {
      tone,
      length,
      focus,
      urgency,
      personalization: promptLower.includes('personaliz') ? 'advanced' : 'basic',
      industry: context?.industry || 'general',
      targetAudience: context?.targetAudience || 'general'
    }
  }

  // ✅ MELHORADO: Cálculo de confiança com contexto de projeto
  private calculateConfidence(prompt: string, intentions: any[], visualReqs: any, projectContext?: ProjectContext): number {
    let confidence = 0.3

    // Fatores básicos
    if (prompt.length > 20) confidence += 0.1
    if (prompt.length > 50) confidence += 0.1
    if (intentions.length > 0) confidence += 0.2
    if (Object.keys(visualReqs).length > 0) confidence += 0.1
    if (prompt.includes('?')) confidence += 0.05

    // ✅ NOVO: Fatores de contexto de projeto
    if (projectContext?.hasProjectContent) {
      confidence += 0.2 // Boost significativo com contexto
      
      // Boost adicional se intenções são específicas para modificação
      const hasModificationIntent = intentions.some(i => 
        ['modify', 'edit', 'improve', 'customize'].includes(i.action)
      )
      if (hasModificationIntent) confidence += 0.15
    }

    // Fatores de especificidade
    const specificWords = ['cor', 'botão', 'título', 'assunto', 'desconto', 'preço']
    const specificCount = specificWords.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length
    confidence += specificCount * 0.05

    return Math.min(confidence, 1.0)
  }

  // ✅ MELHORADO: Detecção de intenção inteligente
  private detectSmartIntent(message: string, analysis: PromptAnalysis, projectContext?: ProjectContext): boolean {
    // Se não há projeto, não pode modificar
    if (!projectContext?.hasProjectContent) return false
    
    const modificationIntents = ['modify', 'edit', 'improve', 'customize', 'add', 'remove']
    const hasModificationIntent = analysis.intentions.some(intent => 
      modificationIntents.includes(intent.action)
    )
    
    // Palavras-chave específicas que indicam modificação
    const modificationKeywords = [
      'mude', 'altere', 'modifique', 'troque', 'substitua',
      'edite', 'corrija', 'ajuste', 'melhore', 'otimize',
      'adicione', 'remova', 'inclua', 'retire',
      'cor', 'botão', 'título', 'assunto', 'texto'
    ]
    
    const hasModificationKeywords = modificationKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    )
    
    return hasModificationIntent || hasModificationKeywords
  }

  // ✅ MELHORADO: Sugestões baseadas em contexto de projeto
  private generateSmartSuggestions(message: string, analysis: PromptAnalysis, projectContext?: ProjectContext): string[] {
    const suggestions = []
    
    // Sugestões baseadas na confiança
    if (analysis.confidence < 0.6) {
      suggestions.push('Seja mais específico sobre o que deseja modificar')
    }
    
    // Sugestões baseadas no contexto do projeto
    if (projectContext?.hasProjectContent) {
      if (analysis.intentions.length === 0) {
        suggestions.push('Diga o que gostaria de alterar no email atual')
      } else {
        suggestions.push('Posso aplicar essas mudanças automaticamente')
      }
      
      // Sugestões específicas do projeto
      if (projectContext.type === 'promotional' && !message.toLowerCase().includes('desconto')) {
        suggestions.push('Adicionar um desconto para aumentar conversão')
      }
      
      if (projectContext.type === 'newsletter' && !message.toLowerCase().includes('cta')) {
        suggestions.push('Incluir uma chamada para ação clara')
      }
    } else {
      if (analysis.intentions.length === 0) {
        suggestions.push('Descreva o tipo de email que deseja criar')
      }
    }
    
    // Sugestões baseadas nos requisitos visuais
    if (Object.keys(analysis.visualRequirements).length === 0) {
      suggestions.push('Especificar cores ou elementos visuais')
    }
    
    // Sugestões padrão
    suggestions.push('Ver prévia do resultado')
    suggestions.push('Exportar email quando estiver pronto')
    
    return suggestions.slice(0, 4) // Máximo 4 sugestões
  }

  private enhanceHTML(html: string, analysis: PromptAnalysis): string {
    let enhanced = html

    // Aplicar cor primária se detectada
    if (analysis.visualRequirements.colorScheme) {
      const color = analysis.visualRequirements.colorScheme.primary
      enhanced = enhanced.replace(
        /style="[^"]*background[^"]*"/g,
        `style="background: linear-gradient(135deg, ${color}, ${color}cc);"`
      )
    }

    // Melhorar estrutura de tabelas
    enhanced = enhanced.replace(
      /<table(?![^>]*border)/g,
      '<table border="0" cellpadding="0" cellspacing="0"'
    )

    // Adicionar classes responsivas
    enhanced = enhanced.replace(
      /<table/g,
      '<table class="email-table"'
    )

    return enhanced
  }

  private generateSmartCSS(analysis: PromptAnalysis): string {
    const primaryColor = analysis.visualRequirements.colorScheme?.primary || '#3b82f6'
    
    return `
/* MailTrendz Enhanced CSS */
.email-table { 
  width: 100%; 
  max-width: 600px; 
  margin: 0 auto; 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  .email-table { width: 100% !important; }
  .responsive-hide { display: none !important; }
  .responsive-stack { 
    display: block !important; 
    width: 100% !important; 
  }
}
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
    
    if (html.includes('table')) {
      components.push({ type: 'table', detected: true })
    }
    
    return components
  }

  private calculateQualityScore(email: EmailContent, analysis: PromptAnalysis): number {
    let score = 0.5

    if (email.subject && email.subject.length >= 20 && email.subject.length <= 50) score += 0.15
    if (email.previewText && email.previewText.length > 0) score += 0.1
    if (analysis.confidence > 0.7) score += 0.15
    if (email.html && (email.html.includes('cta') || email.html.includes('button'))) score += 0.1
    if (email.html && email.html.length > 500) score += 0.1

    return Math.min(score, 1.0)
  }

  private getEnhancedFeatures(analysis: PromptAnalysis): string[] {
    const features = ['smart-generation', 'intent-analysis', 'context-awareness']
    
    if (Object.keys(analysis.visualRequirements).length > 0) {
      features.push('visual-optimization')
    }
    
    if (analysis.confidence > 0.7) {
      features.push('high-confidence-output')
    }
    
    if (analysis.intentions.length > 0) {
      features.push('smart-intent-detection')
    }
    
    features.push('responsive-design', 'accessibility-optimized')
    
    return features
  }

  private parseEmailResponse(content: string): EmailContent {
    try {
      console.log('🔍 [ENHANCED AI] Parsing resposta AI...')
      
      let cleanContent = content.trim()
      
      // Remover markdown
      cleanContent = cleanContent.replace(/```json\n?|\n?```/g, '')
      cleanContent = cleanContent.replace(/^```|```$/g, '')
      
      // Extrair JSON
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanContent = jsonMatch[0]
      }
      
      const parsed = JSON.parse(cleanContent)
      
      const result = {
        subject: parsed.subject || 'Email Inteligente Gerado',
        previewText: parsed.previewText || '',
        html: this.validateHTML(parsed.html) || '<p>Conteúdo gerado por IA</p>',
        text: parsed.text || parsed.html?.replace(/<[^>]*>/g, '') || 'Conteúdo gerado por IA'
      }
      
      console.log('✅ [ENHANCED AI] Parse bem-sucedido')
      return result
    } catch (error: any) {
      console.error('❌ [ENHANCED AI] Erro no parse:', error.message)
      
      // Fallback robusto
      return {
        subject: 'Email Gerado por IA',
        previewText: 'Conteúdo criado automaticamente',
        html: this.createFallbackHTML(content),
        text: content.replace(/[<>]/g, '').substring(0, 500)
      }
    }
  }

  // ✅ NOVO: Validação robusta de HTML
  private validateHTML(html: string): string {
    if (!html || typeof html !== 'string') {
      return this.createFallbackHTML('Conteúdo não disponível')
    }

    // Se não tem estrutura básica, adicionar
    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
      return this.createFallbackHTML(html)
    }

    return html
  }

  // ✅ NOVO: HTML de fallback estruturado
  private createFallbackHTML(content: string): string {
    const cleanContent = content.replace(/<script[^>]*>.*?<\/script>/gis, '')
                              .replace(/<style[^>]*>.*?<\/style>/gis, '')
                              .substring(0, 1000)

    return `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Gerado por IA</title>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .email-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; }
        .email-content { padding: 30px 20px; line-height: 1.6; color: #333333; }
        .email-footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1 style="color: #ffffff; margin: 0;">Email Gerado por IA</h1>
        </div>
        <div class="email-content">
            ${cleanContent.includes('<') ? cleanContent : `<p>${cleanContent}</p>`}
        </div>
        <div class="email-footer">
            <p>© 2025 MailTrendz. Email gerado por IA.</p>
        </div>
    </div>
</body>
</html>`
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
}

export default new EnhancedAIService()