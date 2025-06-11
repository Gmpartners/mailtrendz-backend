import { EmailContent, ProjectContext, AIChatResponse } from '../../../types/ai.types'
import { 
  EnhancedEmailContent, 
  PromptAnalysis, 
  SmartEmailRequest, 
  EnhancedChatResponse,
  UserHistory 
} from '../../../types/enhanced-ai.types'
import { SmartPromptAnalyzer } from '../analyzers/SmartPromptAnalyzer'
import AIService from '../../ai.service'
import { logger } from '../../../utils/logger'

// ================================================
// SERVIÇO DE IA MELHORADA - MANTÉM COMPATIBILIDADE
// ================================================

export class EnhancedAIService {
  private promptAnalyzer: SmartPromptAnalyzer
  private currentAIService: typeof AIService

  constructor() {
    this.promptAnalyzer = new SmartPromptAnalyzer()
    this.currentAIService = AIService
    
    console.log('🧠 [ENHANCED AI] Serviço inicializado')
  }

  // ================================
  // MÉTODO PRINCIPAL: GERAÇÃO SMART
  // ================================
  
  async generateSmartEmail(request: SmartEmailRequest): Promise<EnhancedEmailContent> {
    const startTime = Date.now()
    
    console.log('🚀 [ENHANCED AI] Iniciando geração inteligente:', {
      promptLength: request.prompt.length,
      projectType: request.projectContext.type,
      useEnhanced: request.useEnhanced,
      hasHistory: !!request.userHistory
    })

    try {
      // Verificar se deve usar IA melhorada
      if (!this.shouldUseEnhancedAI(request)) {
        console.log('🔄 [ENHANCED AI] Usando fallback para sistema atual')
        const currentResult = await this.currentAIService.generateEmail(
          request.prompt, 
          request.projectContext
        )
        return this.convertToEnhanced(currentResult, request.projectContext)
      }

      // === FASE 1: ANÁLISE INTELIGENTE ===
      const analysis = await this.promptAnalyzer.analyzePrompt(
        request.prompt, 
        request.projectContext, 
        request.userHistory
      )

      console.log('📊 [ENHANCED AI] Análise concluída:', {
        confidence: Math.round(analysis.confidence * 100) + '%',
        intentionsCount: analysis.intentions.length,
        topIntention: analysis.intentions[0]?.action + '-' + analysis.intentions[0]?.target
      })

      // === FASE 2: GERAÇÃO MELHORADA ===
      const baseContent = await this.generateEnhancedContent(
        request.prompt,
        analysis,
        request.projectContext,
        request.userHistory
      )

      // === FASE 3: ENRIQUECIMENTO ===
      const enhancedContent = await this.enrichWithAnalysis(
        baseContent,
        analysis,
        request.projectContext
      )

      const totalTime = Date.now() - startTime
      
      console.log('✅ [ENHANCED AI] Geração concluída:', {
        totalTime: totalTime + 'ms',
        qualityScore: enhancedContent.metadata.qualityScore,
        enhancedFeatures: enhancedContent.metadata.enhancedFeatures.length
      })

      // Log para analytics
      logger.info('Enhanced email generated', {
        userId: request.projectContext.userId,
        projectType: request.projectContext.type,
        confidence: analysis.confidence,
        processingTime: totalTime,
        enhancedFeatures: enhancedContent.metadata.enhancedFeatures
      })

      return enhancedContent

    } catch (error) {
      console.error('❌ [ENHANCED AI] Erro na geração:', error)
      logger.error('Enhanced email generation failed', error)
      
      // Fallback graceful para sistema atual
      try {
        const fallbackResult = await this.currentAIService.generateEmail(
          request.prompt, 
          request.projectContext
        )
        return this.convertToEnhanced(fallbackResult, request.projectContext, { 
          error: error.message,
          fallback: true 
        })
      } catch (fallbackError) {
        console.error('❌ [ENHANCED AI] Fallback também falhou:', fallbackError)
        throw fallbackError
      }
    }
  }

  // ===============================
  // CHAT INTELIGENTE MELHORADO
  // ===============================

  async smartChatWithAI(
    message: string,
    chatHistory: any[],
    projectContext: ProjectContext,
    userHistory?: UserHistory
  ): Promise<EnhancedChatResponse> {
    const startTime = Date.now()
    
    console.log('💬 [ENHANCED AI] Chat inteligente iniciado:', {
      messageLength: message.length,
      historyCount: chatHistory.length,
      projectType: projectContext.type
    })

    try {
      // Analisar mensagem do usuário
      const analysis = await this.promptAnalyzer.analyzePrompt(
        message, 
        projectContext, 
        userHistory
      )

      // Determinar se deve modificar email
      const shouldUpdateEmail = this.shouldUpdateEmailFromAnalysis(analysis)
      
      // Gerar resposta contextual
      const aiResponse = await this.generateContextualResponse(
        message,
        analysis,
        chatHistory,
        projectContext
      )

      // Se deve atualizar, gerar conteúdo melhorado
      let enhancedContent: EnhancedEmailContent | undefined
      if (shouldUpdateEmail && analysis.confidence > 0.6) {
        try {
          enhancedContent = await this.generateSmartEmail({
            prompt: message,
            projectContext,
            userHistory,
            useEnhanced: true
          })
        } catch (error) {
          console.warn('⚠️ [ENHANCED AI] Falha ao gerar conteúdo melhorado:', error.message)
          // Continuar sem conteúdo melhorado
        }
      }

      const processingTime = Date.now() - startTime

      const response: EnhancedChatResponse = {
        response: aiResponse,
        shouldUpdateEmail,
        analysis,
        suggestions: this.generateSmartSuggestions(analysis, projectContext),
        enhancedContent,
        metadata: {
          model: 'enhanced-ai-v1',
          tokens: 0, // TODO: contar tokens reais
          confidence: analysis.confidence,
          enhancedFeatures: this.getUsedEnhancedFeatures(analysis),
          processingTime
        }
      }

      console.log('✅ [ENHANCED AI] Chat processado:', {
        shouldUpdate: shouldUpdateEmail,
        hasEnhancedContent: !!enhancedContent,
        confidence: Math.round(analysis.confidence * 100) + '%',
        processingTime: processingTime + 'ms'
      })

      return response

    } catch (error) {
      console.error('❌ [ENHANCED AI] Erro no chat:', error)
      
      // Fallback para sistema atual
      const fallbackResponse = await this.currentAIService.chatWithAI(
        message,
        chatHistory,
        projectContext
      )

      return {
        response: fallbackResponse.response,
        shouldUpdateEmail: fallbackResponse.shouldUpdateEmail,
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
          confidence: 0.3,
          processingTime: Date.now() - startTime,
          originalPrompt: message
        },
        suggestions: fallbackResponse.suggestions || [],
        metadata: {
          model: 'fallback-ai',
          tokens: fallbackResponse.metadata?.tokens || 0,
          confidence: 0.3,
          enhancedFeatures: ['fallback'],
          processingTime: Date.now() - startTime
        }
      }
    }
  }

  // ================================
  // MÉTODOS PRIVADOS DE APOIO
  // ================================

  private shouldUseEnhancedAI(request: SmartEmailRequest): boolean {
    // Por enquanto, usar IA melhorada apenas se explicitamente solicitado
    // Na produção, pode usar feature flags, subscription type, etc.
    
    if (request.useEnhanced === false) return false
    if (request.useEnhanced === true) return true
    
    // Lógica automática baseada no contexto
    const complexPrompt = request.prompt.length > 50
    const hasSpecificRequirements = request.prompt.includes('cor') || 
                                   request.prompt.includes('layout') ||
                                   request.prompt.includes('botão')
    
    return complexPrompt || hasSpecificRequirements
  }

  private async generateEnhancedContent(
    prompt: string,
    analysis: PromptAnalysis,
    context: ProjectContext,
    userHistory?: UserHistory
  ): Promise<EmailContent> {
    
    // Construir prompt melhorado baseado na análise
    const enhancedPrompt = this.buildIntelligentPrompt(prompt, analysis, context, userHistory)
    
    console.log('📝 [ENHANCED AI] Prompt melhorado construído:', {
      originalLength: prompt.length,
      enhancedLength: enhancedPrompt.length,
      hasVisualContext: Object.keys(analysis.visualRequirements).length > 0
    })

    // Usar o sistema atual de IA com prompt melhorado
    const result = await this.currentAIService.generateEmail(enhancedPrompt, context)
    
    return result
  }

  private buildIntelligentPrompt(
    originalPrompt: string,
    analysis: PromptAnalysis,
    context: ProjectContext,
    userHistory?: UserHistory
  ): string {
    
    let intelligentPrompt = `Você é um especialista em email marketing e design responsivo.

CONTEXTO DO PROJETO:
- Tipo: ${context.type}
- Indústria: ${context.industry}
- Tom: ${context.tone || 'profissional'}
- Público: ${context.targetAudience || 'geral'}

ANÁLISE INTELIGENTE DO PROMPT:
Confiança da análise: ${Math.round(analysis.confidence * 100)}%
`

    // Adicionar intenções detectadas
    if (analysis.intentions.length > 0) {
      intelligentPrompt += `\nINTENÇÕES DETECTADAS:\n`
      analysis.intentions.slice(0, 3).forEach((intention, index) => {
        intelligentPrompt += `${index + 1}. ${intention.action.toUpperCase()} ${intention.target} (prioridade: ${Math.round(intention.priority * 100)}%)\n`
      })
    }

    // Adicionar requisitos visuais
    if (Object.keys(analysis.visualRequirements).length > 0) {
      intelligentPrompt += `\nREQUISITOS VISUAIS DETECTADOS:\n`
      
      if (analysis.visualRequirements.colorScheme) {
        const colors = analysis.visualRequirements.colorScheme
        if (colors.primary) intelligentPrompt += `- Cor principal: ${colors.primary}\n`
        if (colors.accent) intelligentPrompt += `- Cor de destaque: ${colors.accent}\n`
        if (colors.style) intelligentPrompt += `- Estilo de cores: ${colors.style}\n`
      }
      
      if (analysis.visualRequirements.layout) {
        const layout = analysis.visualRequirements.layout
        if (layout.type) intelligentPrompt += `- Layout: ${layout.type}\n`
        if (layout.alignment) intelligentPrompt += `- Alinhamento: ${layout.alignment}\n`
        if (layout.density) intelligentPrompt += `- Densidade: ${layout.density}\n`
      }
      
      if (analysis.visualRequirements.typography) {
        const typo = analysis.visualRequirements.typography
        if (typo.style) intelligentPrompt += `- Tipografia: ${typo.style}\n`
        if (typo.size) intelligentPrompt += `- Tamanho do texto: ${typo.size}\n`
      }
    }

    // Adicionar requisitos de conteúdo
    intelligentPrompt += `\nREQUISITOS DE CONTEÚDO:
- Tom: ${analysis.contentRequirements.tone}
- Tamanho: ${analysis.contentRequirements.length}
- Foco: ${analysis.contentRequirements.focus.join(', ')}
- Urgência: ${analysis.contentRequirements.urgency}
`

    // Adicionar histórico do usuário se disponível
    if (userHistory?.preferences) {
      intelligentPrompt += `\nPREFERÊNCIAS DO USUÁRIO:
- Estilo preferido: ${userHistory.preferences.colorScheme || 'não definido'}
- Layout preferido: ${userHistory.preferences.layoutStyle || 'não definido'}
`
    }

    // Adicionar prompt original
    intelligentPrompt += `\nSOLICITAÇÃO ORIGINAL DO USUÁRIO:
"${originalPrompt}"

INSTRUÇÕES ESPECIAIS:
1. Crie um email que atenda EXATAMENTE às intenções detectadas
2. Aplique os requisitos visuais identificados
3. Use HTML responsivo compatível com todos os clientes de email
4. Otimize para a plataforma móvel
5. Inclua CTAs claros e persuasivos
6. Mantenha o tom e foco especificados

Retorne JSON no formato:
{
  "subject": "assunto otimizado (30-50 caracteres)",
  "previewText": "preview text complementar (70-90 caracteres)", 
  "html": "HTML responsivo completo",
  "text": "versão texto plano"
}
`

    return intelligentPrompt
  }

  private async enrichWithAnalysis(
    baseContent: EmailContent,
    analysis: PromptAnalysis,
    context: ProjectContext
  ): Promise<EnhancedEmailContent> {
    
    console.log('🎨 [ENHANCED AI] Enriquecendo conteúdo com análise...')

    // Gerar componentes baseados na análise
    const components = this.generateIntelligentComponents(baseContent, analysis, context)
    
    // Aplicar melhorias visuais
    const improvedHTML = this.applyVisualEnhancements(baseContent.html, analysis)
    
    // Gerar CSS inteligente
    const intelligentCSS = this.generateIntelligentCSS(analysis, context)
    
    // Calcular métricas de qualidade
    const metadata = this.calculateQualityMetrics(baseContent, analysis, context)

    return {
      subject: baseContent.subject,
      previewText: baseContent.previewText || this.generateSmartPreviewText(baseContent.subject, analysis),
      html: improvedHTML,
      css: intelligentCSS,
      components,
      analysis,
      metadata
    }
  }

  private generateIntelligentComponents(
    content: EmailContent,
    analysis: PromptAnalysis,
    context: ProjectContext
  ): any[] {
    const components: any[] = []

    // Por enquanto, gerar componentes básicos
    // Na Fase 2, aqui entra o sistema completo de componentes

    // Header component
    components.push({
      id: 'header',
      type: 'header',
      order: 1,
      props: {
        title: content.subject,
        logoUrl: null
      },
      styling: this.getComponentStyling('header', analysis),
      responsive: this.getResponsiveRules('header')
    })

    // Content component
    components.push({
      id: 'main-content',
      type: 'content',
      order: 2,
      props: {
        content: content.html
      },
      styling: this.getComponentStyling('content', analysis),
      responsive: this.getResponsiveRules('content')
    })

    // CTA component se detectado
    const ctaIntention = analysis.intentions.find(i => i.target === 'cta')
    if (ctaIntention || context.type === 'promotional') {
      components.push({
        id: 'main-cta',
        type: 'cta',
        order: 3,
        props: {
          text: this.extractCTAText(content.html, analysis),
          url: '#',
          variant: analysis.visualRequirements.components?.ctaStyle || 'button'
        },
        styling: this.getComponentStyling('cta', analysis),
        responsive: this.getResponsiveRules('cta')
      })
    }

    return components
  }

  private applyVisualEnhancements(originalHTML: string, analysis: PromptAnalysis): string {
    let enhancedHTML = originalHTML

    // Aplicar melhorias de cores
    if (analysis.visualRequirements.colorScheme?.primary) {
      const primaryColor = analysis.visualRequirements.colorScheme.primary
      // Substituir cores genéricas pela cor detectada
      enhancedHTML = enhancedHTML.replace(/#3b82f6/g, primaryColor)
      enhancedHTML = enhancedHTML.replace(/#2563eb/g, primaryColor)
      enhancedHTML = enhancedHTML.replace(/#1d4ed8/g, primaryColor)
    }

    // Aplicar cor de destaque
    if (analysis.visualRequirements.colorScheme?.accent) {
      const accentColor = analysis.visualRequirements.colorScheme.accent
      enhancedHTML = enhancedHTML.replace(/#f59e0b/g, accentColor)
      enhancedHTML = enhancedHTML.replace(/#d97706/g, accentColor)
    }

    // Garantir responsividade
    if (!enhancedHTML.includes('max-width') || !enhancedHTML.includes('viewport')) {
      enhancedHTML = this.ensureResponsiveness(enhancedHTML)
    }

    // Aplicar otimizações para clientes de email
    enhancedHTML = this.optimizeForEmailClients(enhancedHTML)

    return enhancedHTML
  }

  private generateIntelligentCSS(analysis: PromptAnalysis, context: ProjectContext): string {
    const colorScheme = analysis.visualRequirements.colorScheme || {}
    const typography = analysis.visualRequirements.typography || {}
    
    return `
/* CSS Inteligente gerado pelo MailTrendz AI */
.email-container {
  max-width: 600px;
  margin: 0 auto;
  font-family: ${this.getFontFamily(typography.style)};
  background-color: ${colorScheme.background || '#ffffff'};
  color: ${colorScheme.text || '#1f2937'};
}

/* Cores principais */
.primary-color { color: ${colorScheme.primary || '#3b82f6'}; }
.accent-color { color: ${colorScheme.accent || '#f59e0b'}; }
.secondary-color { color: ${colorScheme.secondary || '#6b7280'}; }

/* Botões e CTAs */
.cta-button {
  background-color: ${colorScheme.accent || '#f59e0b'};
  color: #ffffff;
  padding: ${this.getCTAPadding(analysis.visualRequirements.components?.ctaStyle)};
  border-radius: ${this.getBorderRadius(typography.style)};
  text-decoration: none;
  display: inline-block;
  font-weight: bold;
  transition: all 0.3s ease;
}

.cta-button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Tipografia responsiva */
h1 { 
  font-size: ${this.getHeadingSize(typography.size)};
  color: ${colorScheme.primary || '#1f2937'};
  margin: 0 0 20px 0;
}

/* Media queries para responsividade */
@media only screen and (max-width: 600px) {
  .email-container {
    width: 100% !important;
    padding: 0 10px !important;
  }
  
  .responsive-hide { display: none !important; }
  .responsive-stack { 
    display: block !important; 
    width: 100% !important; 
  }
  
  h1 { font-size: 24px !important; }
  
  .cta-button {
    width: 100% !important;
    text-align: center !important;
    padding: 15px !important;
  }
}

/* Otimizações para clientes específicos */
/* Outlook */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  .outlook-hide { display: none !important; }
}

/* Gmail */
.gmail-fix {
  border-collapse: collapse;
  border-spacing: 0;
}
`
  }

  private calculateQualityMetrics(
    content: EmailContent,
    analysis: PromptAnalysis,
    context: ProjectContext
  ): any {
    let qualityScore = 0.7 // base

    // Analisar qualidade do conteúdo
    if (content.subject.length >= 30 && content.subject.length <= 50) qualityScore += 0.1
    if (content.previewText && content.previewText.length > 50) qualityScore += 0.05
    if (content.html.includes('responsive') || content.html.includes('max-width')) qualityScore += 0.1

    // Analisar aplicação da análise
    if (analysis.confidence > 0.7) qualityScore += 0.1
    if (analysis.intentions.length > 0) qualityScore += 0.05

    const enhancedFeatures: string[] = []
    
    // Identificar features melhoradas usadas
    if (Object.keys(analysis.visualRequirements).length > 0) {
      enhancedFeatures.push('visual-analysis')
      qualityScore += 0.05
    }
    
    if (analysis.intentions.length > 0) {
      enhancedFeatures.push('intention-detection')
      qualityScore += 0.05
    }
    
    if (analysis.contentRequirements.focus.length > 1) {
      enhancedFeatures.push('multi-focus-optimization')
    }

    enhancedFeatures.push('intelligent-prompting', 'responsive-design', 'smart-components')

    return {
      version: '1.0.0-enhanced',
      generated: new Date(),
      model: 'enhanced-ai-v1',
      tokens: 0, // TODO: contar tokens reais
      qualityScore: Math.min(qualityScore, 1.0),
      compatibilityScore: 0.95, // assumir alta compatibilidade por enquanto
      accessibilityScore: 0.85, // assumir boa acessibilidade
      estimatedRenderTime: 1200, // ms
      supportedClients: ['Gmail', 'Outlook', 'Apple Mail', 'Yahoo', 'Thunderbird'],
      enhancedFeatures
    }
  }

  // Métodos auxiliares
  private shouldUpdateEmailFromAnalysis(analysis: PromptAnalysis): boolean {
    // Verificar se há intenções de modificação
    const modifyIntentions = analysis.intentions.filter(i => 
      ['modify', 'improve', 'redesign'].includes(i.action)
    )
    
    if (modifyIntentions.length > 0 && analysis.confidence > 0.5) {
      return true
    }

    // Verificar se há especificações visuais específicas
    const hasSpecificVisualReqs = Object.keys(analysis.visualRequirements).length > 1
    if (hasSpecificVisualReqs && analysis.confidence > 0.6) {
      return true
    }

    return false
  }

  private async generateContextualResponse(
    message: string,
    analysis: PromptAnalysis,
    chatHistory: any[],
    context: ProjectContext
  ): Promise<string> {
    
    // Por enquanto, usar o sistema atual para gerar resposta
    // Na Fase 2, implementar geração contextual própria
    
    const currentResponse = await this.currentAIService.chatWithAI(
      message,
      chatHistory,
      context
    )

    // Enriquecer resposta com insights da análise
    let enhancedResponse = currentResponse.response

    if (analysis.intentions.length > 0) {
      const topIntention = analysis.intentions[0]
      enhancedResponse += `\n\n💡 Detectei que você quer ${topIntention.action} ${topIntention.target}. `
      
      if (topIntention.confidence > 0.8) {
        enhancedResponse += `Vou aplicar essa modificação com alta confiança.`
      } else {
        enhancedResponse += `Vou tentar aplicar essa modificação baseado no contexto.`
      }
    }

    return enhancedResponse
  }

  private generateSmartSuggestions(analysis: PromptAnalysis, context: ProjectContext): string[] {
    const suggestions: string[] = []

    // Sugestões baseadas na análise
    if (analysis.intentions.length === 0) {
      suggestions.push('Tente ser mais específico sobre o que deseja modificar')
    }

    if (Object.keys(analysis.visualRequirements).length === 0) {
      suggestions.push('Mencione cores ou layout para personalização visual')
    }

    // Sugestões baseadas no tipo de projeto
    switch (context.type) {
      case 'promotional':
        suggestions.push('Adicionar urgência ao CTA', 'Destacar oferta especial')
        break
      case 'newsletter':
        suggestions.push('Melhorar estrutura visual', 'Adicionar seções divididas')
        break
      case 'welcome':
        suggestions.push('Personalizar boas-vindas', 'Destacar benefícios')
        break
    }

    // Sugestões padrão se vazio
    if (suggestions.length === 0) {
      suggestions.push(
        'Continuar conversa',
        'Melhorar assunto',
        'Otimizar CTA',
        'Ajustar cores'
      )
    }

    return suggestions
  }

  private getUsedEnhancedFeatures(analysis: PromptAnalysis): string[] {
    const features: string[] = ['smart-analysis']

    if (analysis.intentions.length > 0) features.push('intention-detection')
    if (Object.keys(analysis.visualRequirements).length > 0) features.push('visual-requirements')
    if (analysis.confidence > 0.7) features.push('high-confidence-analysis')
    
    return features
  }

  private convertToEnhanced(
    currentResult: EmailContent, 
    context: ProjectContext,
    metadata?: any
  ): EnhancedEmailContent {
    
    // Converter resultado atual para formato melhorado
    return {
      subject: currentResult.subject,
      previewText: currentResult.previewText || '',
      html: currentResult.html,
      css: this.generateBasicCSS(),
      components: [],
      analysis: {
        intentions: [],
        visualRequirements: {},
        contentRequirements: {
          tone: context.tone || 'professional',
          length: 'medium',
          focus: ['information'],
          urgency: 'low',
          personalization: 'none'
        },
        confidence: 0.5,
        processingTime: 0,
        originalPrompt: 'converted from current system'
      },
      metadata: {
        version: '1.0.0-converted',
        generated: new Date(),
        model: 'current-system',
        tokens: 0,
        qualityScore: 0.7,
        compatibilityScore: 0.9,
        accessibilityScore: 0.8,
        estimatedRenderTime: 1000,
        supportedClients: ['Gmail', 'Outlook', 'Apple Mail'],
        enhancedFeatures: metadata?.error ? ['fallback'] : ['converted']
      }
    }
  }

  // Métodos auxiliares para styling
  private getComponentStyling(componentType: string, analysis: PromptAnalysis): any {
    const colorScheme = analysis.visualRequirements.colorScheme || {}
    
    switch (componentType) {
      case 'header':
        return {
          backgroundColor: colorScheme.background || '#ffffff',
          textColor: colorScheme.primary || '#1f2937',
          padding: '20px',
          textAlign: 'center'
        }
      case 'cta':
        return {
          backgroundColor: colorScheme.accent || '#f59e0b',
          textColor: '#ffffff',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold'
        }
      default:
        return {
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
          padding: '15px'
        }
    }
  }

  private getResponsiveRules(componentType: string): any {
    return {
      mobile: {
        padding: '10px',
        fontSize: componentType === 'cta' ? '14px' : undefined
      }
    }
  }

  private getFontFamily(style?: string): string {
    switch (style) {
      case 'modern': return '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      case 'classic': return 'Georgia, "Times New Roman", serif'
      case 'bold': return '"Helvetica Neue", Arial, sans-serif'
      default: return 'Arial, sans-serif'
    }
  }

  private getCTAPadding(style?: string): string {
    switch (style) {
      case 'banner': return '20px 40px'
      case 'link': return '5px 10px'
      default: return '12px 24px'
    }
  }

  private getBorderRadius(style?: string): string {
    switch (style) {
      case 'modern': return '12px'
      case 'classic': return '4px'
      default: return '8px'
    }
  }

  private getHeadingSize(size?: string): string {
    switch (size) {
      case 'large': return '32px'
      case 'small': return '20px'
      default: return '26px'
    }
  }

  private extractCTAText(html: string, analysis: PromptAnalysis): string {
    // Tentar extrair texto de CTA do HTML
    const ctaMatch = html.match(/<a[^>]*>([^<]+)<\/a>/i)
    if (ctaMatch) return ctaMatch[1]
    
    // Usar especificação da análise se disponível
    const ctaIntention = analysis.intentions.find(i => i.target === 'cta')
    if (ctaIntention?.specification) {
      const match = ctaIntention.specification.match(/["']([^"']+)["']/);
      if (match) return match[1]
    }
    
    return 'Saiba Mais'
  }

  private generateSmartPreviewText(subject: string, analysis: PromptAnalysis): string {
    // Gerar preview text inteligente baseado no assunto e análise
    const baseText = subject.length > 40 ? 
      subject.substring(0, 40) + '...' : 
      subject + ' - Confira os detalhes'
    
    return baseText
  }

  private ensureResponsiveness(html: string): string {
    // Garantir que o HTML seja responsivo
    if (!html.includes('max-width')) {
      html = html.replace(
        /<body[^>]*>/,
        '<body style="margin:0;padding:0;font-family:Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;">'
      )
      html = html.replace('</body>', '</div></body>')
    }
    return html
  }

  private optimizeForEmailClients(html: string): string {
    // Aplicar otimizações básicas para clientes de email
    // Por enquanto, apenas garantir table-based layout para Outlook
    return html
  }

  private generateBasicCSS(): string {
    return `
/* CSS Básico MailTrendz */
.email-container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
@media only screen and (max-width: 600px) {
  .responsive-hide { display: none !important; }
  .responsive-stack { display: block !important; width: 100% !important; }
}`
  }
}

// Instância singleton
export default new EnhancedAIService()
