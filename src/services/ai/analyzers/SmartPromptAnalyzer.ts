import { ProjectContext } from '../../../types/ai.types'
import { PromptAnalysis, Intention, VisualRequirements, ContentRequirements, UserHistory } from '../../../types/enhanced-ai.types'
import { logger } from '../../../utils/logger'

// ===============================================
// ANALISADOR DE PROMPTS INTELIGENTE - MailTrendz
// ===============================================

export class SmartPromptAnalyzer {
  private intentionPatterns: Map<string, RegExp[]>
  private visualKeywords: Map<string, string[]>
  private colorMappings: Map<string, string>
  private industryDefaults: Map<string, any>

  constructor() {
    this.initializePatterns()
    this.initializeColorMappings()
    this.initializeIndustryDefaults()
  }

  async analyzePrompt(
    prompt: string, 
    context: ProjectContext,
    userHistory?: UserHistory
  ): Promise<PromptAnalysis> {
    const startTime = Date.now()
    
    console.log('🔍 [SMART ANALYZER] Analisando prompt:', { 
      prompt: prompt.substring(0, 100) + '...',
      contextType: context.type,
      industry: context.industry,
      hasHistory: !!userHistory
    })

    try {
      // Normalizar prompt
      const normalizedPrompt = this.normalizePrompt(prompt)
      
      // Detectar intenções principais
      const intentions = this.detectIntentions(normalizedPrompt, context)
      
      // Extrair requisitos visuais
      const visualRequirements = this.extractVisualRequirements(normalizedPrompt, context, userHistory)
      
      // Extrair requisitos de conteúdo
      const contentRequirements = this.extractContentRequirements(normalizedPrompt, context)
      
      // Calcular confiança da análise
      const confidence = this.calculateConfidence(intentions, visualRequirements, contentRequirements)
      
      const analysis: PromptAnalysis = {
        intentions,
        visualRequirements,
        contentRequirements,
        confidence,
        processingTime: Date.now() - startTime,
        originalPrompt: prompt
      }

      console.log('✅ [SMART ANALYZER] Análise concluída:', {
        intentionsCount: intentions.length,
        topIntention: intentions[0]?.action + '-' + intentions[0]?.target,
        confidence: Math.round(confidence * 100) + '%',
        hasVisualReqs: Object.keys(visualRequirements).length > 0,
        processingTime: analysis.processingTime + 'ms'
      })

      // Log para debug
      logger.info('Smart prompt analysis completed', {
        userId: context.userId,
        projectType: context.type,
        intentionsCount: intentions.length,
        confidence
      })

      return analysis

    } catch (error) {
      console.error('❌ [SMART ANALYZER] Erro na análise:', error)
      logger.error('Smart prompt analysis failed', error)
      
      // Retornar análise básica em caso de erro
      return this.getFallbackAnalysis(prompt, context, Date.now() - startTime)
    }
  }

  private initializePatterns() {
    // Padrões avançados para detecção de intenções
    this.intentionPatterns = new Map([
      ['create', [
        /\b(?:criar|crie|gerar|gere|fazer|faça|construir|desenvolver|montar|elaborar)\b/gi,
        /\b(?:novo|nova|um|uma)\s+(?:email|newsletter|campanha)\b/gi,
        /\b(?:preciso|quero|gostaria|desejo)\s+(?:de\s+)?(?:um|uma|criar)\b/gi,
        /\b(?:me\s+)?(?:ajude|ajuda)\s+(?:a\s+)?(?:criar|fazer|gerar)\b/gi
      ]],
      ['modify', [
        /\b(?:alterar|altere|mudar|mude|modificar|modifique|trocar|troque|substituir|substitua)\b/gi,
        /\b(?:ajustar|ajuste|adaptar|adapte|personalizar|personalize|customizar|customize)\b/gi,
        /\b(?:atualizar|atualize|revisar|revise|corrigir|corrija)\b/gi,
        /\b(?:diferente|outro|outra|nova?\s+versão)\b/gi
      ]],
      ['improve', [
        /\b(?:melhorar|melhore|otimizar|otimize|aprimorar|aprimore|refinar|refine)\b/gi,
        /\b(?:aperfeiçoar|aperfeiçoe|incrementar|incremente|turbinar|turbine)\b/gi,
        /\b(?:mais\s+(?:atrativo|bonito|eficaz|profissional|moderno|elegante))\b/gi,
        /\b(?:deixar?\s+(?:melhor|mais\s+bonito|mais\s+atrativo))\b/gi
      ]],
      ['redesign', [
        /\b(?:redesenhar|redesenhe|reformular|reformule|recriar|recrie|refazer|refaça)\b/gi,
        /\b(?:novo\s+(?:visual|design|layout|estilo|look))\b/gi,
        /\b(?:completamente\s+(?:diferente|novo|mudado))\b/gi,
        /\b(?:do\s+zero|from\s+scratch|começar\s+novamente)\b/gi
      ]]
    ])

    // Palavras-chave visuais organizadas por categoria
    this.visualKeywords = new Map([
      ['modern', ['moderno', 'contemporâneo', 'atual', 'clean', 'limpo', 'minimal', 'minimalista', 'tech', 'tecnológico']],
      ['vibrant', ['vibrante', 'colorido', 'brilhante', 'vivido', 'energético', 'alegre', 'chamativo', 'impactante']],
      ['professional', ['profissional', 'corporativo', 'formal', 'sério', 'business', 'executivo', 'conservador']],
      ['playful', ['divertido', 'casual', 'descontraído', 'amigável', 'jovem', 'criativo', 'informal', 'leve']],
      ['elegant', ['elegante', 'sofisticado', 'refinado', 'clássico', 'premium', 'luxuoso', 'delicado']],
      ['urgent', ['urgente', 'importante', 'imediato', 'agora', 'hoje', 'limitado', 'rápido', 'emergencial']],
      ['luxury', ['luxo', 'premium', 'exclusivo', 'vip', 'high-end', 'sofisticado', 'caro', 'seleto']]
    ])
  }

  private initializeColorMappings() {
    this.colorMappings = new Map([
      // Cores básicas em português
      ['azul', '#3b82f6'], ['blue', '#3b82f6'],
      ['vermelho', '#ef4444'], ['red', '#ef4444'],
      ['verde', '#10b981'], ['green', '#10b981'],
      ['amarelo', '#f59e0b'], ['yellow', '#f59e0b'],
      ['laranja', '#f97316'], ['orange', '#f97316'],
      ['roxo', '#8b5cf6'], ['purple', '#8b5cf6'],
      ['violeta', '#7c3aed'], ['violet', '#7c3aed'],
      ['rosa', '#ec4899'], ['pink', '#ec4899'],
      ['preto', '#1f2937'], ['black', '#1f2937'],
      ['branco', '#ffffff'], ['white', '#ffffff'],
      ['cinza', '#6b7280'], ['gray', '#6b7280'], ['grey', '#6b7280'],
      ['dourado', '#f59e0b'], ['gold', '#f59e0b'],
      ['prateado', '#94a3b8'], ['silver', '#94a3b8'],
      
      // Variações e tons específicos
      ['azul-claro', '#60a5fa'], ['light-blue', '#60a5fa'],
      ['azul-escuro', '#1d4ed8'], ['dark-blue', '#1d4ed8'],
      ['verde-claro', '#34d399'], ['light-green', '#34d399'],
      ['verde-escuro', '#059669'], ['dark-green', '#059669'],
      ['vermelho-claro', '#f87171'], ['light-red', '#f87171'],
      ['vermelho-escuro', '#dc2626'], ['dark-red', '#dc2626'],
      
      // Cores de marca/corporativas
      ['facebook', '#1877f2'],
      ['instagram', '#e4405f'],
      ['linkedin', '#0077b5'],
      ['twitter', '#1da1f2'],
      ['whatsapp', '#25d366']
    ])
  }

  private initializeIndustryDefaults() {
    this.industryDefaults = new Map([
      ['tecnologia', {
        colors: { primary: '#3b82f6', secondary: '#64748b', accent: '#8b5cf6' },
        style: 'modern',
        tone: 'professional'
      }],
      ['saude', {
        colors: { primary: '#10b981', secondary: '#6b7280', accent: '#059669' },
        style: 'professional',
        tone: 'friendly'
      }],
      ['financas', {
        colors: { primary: '#1f2937', secondary: '#9ca3af', accent: '#f59e0b' },
        style: 'professional',
        tone: 'formal'
      }],
      ['educacao', {
        colors: { primary: '#7c3aed', secondary: '#a78bfa', accent: '#fbbf24' },
        style: 'friendly',
        tone: 'professional'
      }],
      ['varejo', {
        colors: { primary: '#ef4444', secondary: '#f87171', accent: '#f59e0b' },
        style: 'vibrant',
        tone: 'casual'
      }],
      ['alimentacao', {
        colors: { primary: '#f97316', secondary: '#fb923c', accent: '#eab308' },
        style: 'playful',
        tone: 'friendly'
      }]
    ])
  }

  private normalizePrompt(prompt: string): string {
    return prompt
      .toLowerCase()
      .trim()
      // Normalizar espaços múltiplos
      .replace(/\s+/g, ' ')
      // Remover acentos para melhor matching
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Manter apenas caracteres relevantes
      .replace(/[^\w\s\-]/g, ' ')
      .trim()
  }

  private detectIntentions(prompt: string, context: ProjectContext): Intention[] {
    const intentions: Intention[] = []

    for (const [action, patterns] of this.intentionPatterns.entries()) {
      for (const pattern of patterns) {
        const matches = [...prompt.matchAll(pattern)]
        
        for (const match of matches) {
          const target = this.detectTarget(prompt, match[0], match.index || 0)
          const specification = this.extractSpecification(prompt, match[0], match.index || 0)
          
          const intention: Intention = {
            action: action as any,
            target: target as any,
            specification,
            priority: this.calculateIntentionPriority(action, target, prompt, context),
            scope: this.detectScope(prompt, match[0], match.index || 0),
            confidence: this.calculateIntentionConfidence(match, pattern, prompt)
          }

          intentions.push(intention)
        }
      }
    }

    // Processar e filtrar intenções
    return this.processIntentions(intentions)
  }

  private detectTarget(prompt: string, matchedAction: string, matchIndex: number): string {
    // Buscar contexto ao redor do match
    const contextWindow = 30
    const start = Math.max(0, matchIndex - contextWindow)
    const end = Math.min(prompt.length, matchIndex + matchedAction.length + contextWindow)
    const context = prompt.substring(start, end)
    
    const targetKeywords = new Map([
      // Elementos principais do email
      ['subject', ['titulo', 'assunto', 'cabecalho', 'header', 'subject']],
      ['cta', ['botao', 'cta', 'call to action', 'chamada', 'link', 'clique']],
      ['colors', ['cor', 'cores', 'colorir', 'paleta', 'esquema de cor', 'color']],
      ['layout', ['layout', 'estrutura', 'design', 'disposicao', 'organizacao']],
      ['typography', ['fonte', 'tipografia', 'texto', 'letra', 'font', 'typography']],
      ['content', ['conteudo', 'corpo', 'mensagem', 'texto', 'content', 'body']],
      ['images', ['imagem', 'foto', 'visual', 'picture', 'image', 'img']]
    ])

    // Procurar por palavras-chave de target no contexto
    for (const [target, keywords] of targetKeywords.entries()) {
      for (const keyword of keywords) {
        if (context.includes(keyword)) {
          return target
        }
      }
    }

    // Detectar por palavras próximas
    const words = context.split(/\s+/)
    const actionWordIndex = words.findIndex(word => word.includes(matchedAction.split(' ')[0]))
    
    if (actionWordIndex !== -1) {
      // Verificar palavras ao redor (±3 posições)
      const nearbyWords = words.slice(
        Math.max(0, actionWordIndex - 3),
        Math.min(words.length, actionWordIndex + 4)
      )
      
      for (const word of nearbyWords) {
        for (const [target, keywords] of targetKeywords.entries()) {
          if (keywords.some(keyword => word.includes(keyword))) {
            return target
          }
        }
      }
    }

    return 'content' // default mais abrangente
  }

  private extractVisualRequirements(
    prompt: string, 
    context: ProjectContext, 
    userHistory?: UserHistory
  ): VisualRequirements {
    const requirements: VisualRequirements = {}

    // Detectar esquema de cores
    const colorScheme = this.detectColorScheme(prompt, context, userHistory)
    if (Object.keys(colorScheme).length > 0) {
      requirements.colorScheme = colorScheme
    }

    // Detectar layout
    const layout = this.detectLayout(prompt, context)
    if (Object.keys(layout).length > 0) {
      requirements.layout = layout
    }

    // Detectar tipografia
    const typography = this.detectTypography(prompt, context)
    if (Object.keys(typography).length > 0) {
      requirements.typography = typography
    }

    // Detectar componentes
    const components = this.detectComponents(prompt, context)
    if (Object.keys(components).length > 0) {
      requirements.components = components
    }

    return requirements
  }

  private detectColorScheme(prompt: string, context: ProjectContext, userHistory?: UserHistory): any {
    const scheme: any = {}

    // 1. Detectar cores específicas mencionadas
    for (const [colorName, colorValue] of this.colorMappings.entries()) {
      const colorRegex = new RegExp(`\\b${colorName}\\b`, 'gi')
      const matches = [...prompt.matchAll(colorRegex)]
      
      for (const match of matches) {
        const colorContext = this.getContextAroundMatch(prompt, match[0], match.index || 0, 15)
        
        // Determinar tipo de cor baseado no contexto
        if (this.isContext(colorContext, ['principal', 'primaria', 'main', 'primary'])) {
          scheme.primary = colorValue
        } else if (this.isContext(colorContext, ['botao', 'cta', 'link', 'clique'])) {
          scheme.accent = colorValue
        } else if (this.isContext(colorContext, ['fundo', 'background', 'bg'])) {
          scheme.background = colorValue
        } else if (this.isContext(colorContext, ['secundaria', 'secondary', 'apoio'])) {
          scheme.secondary = colorValue
        } else {
          // Se não especificado, usar como primary
          if (!scheme.primary) scheme.primary = colorValue
        }
      }
    }

    // 2. Detectar estilo de cores por palavras-chave
    for (const [style, keywords] of this.visualKeywords.entries()) {
      if (keywords.some(keyword => prompt.includes(keyword))) {
        scheme.style = this.mapVisualStyleToColorStyle(style)
        break
      }
    }

    // 3. Aplicar defaults da indústria se não especificado
    if (Object.keys(scheme).length === 0) {
      const industryDefault = this.industryDefaults.get(context.industry)
      if (industryDefault) {
        scheme.primary = industryDefault.colors.primary
        scheme.secondary = industryDefault.colors.secondary
        scheme.accent = industryDefault.colors.accent
        scheme.style = industryDefault.style
      }
    }

    // 4. Usar histórico do usuário se disponível
    if (userHistory?.preferences?.colorScheme && Object.keys(scheme).length === 0) {
      scheme.style = userHistory.preferences.colorScheme
    }

    return scheme
  }

  private detectLayout(prompt: string, context: ProjectContext): any {
    const layout: any = {}

    // Detectar tipo de layout
    const layoutPatterns = new Map([
      ['two-column', ['duas colunas', 'two column', '2 colunas', 'split']],
      ['grid', ['grid', 'grade', 'mosaico', 'quadrados']],
      ['hero-focused', ['hero', 'banner grande', 'destaque principal', 'foco central']],
      ['single-column', ['uma coluna', 'single column', 'vertical', 'simples']]
    ])

    for (const [layoutType, keywords] of layoutPatterns.entries()) {
      if (keywords.some(keyword => prompt.includes(keyword))) {
        layout.type = layoutType
        break
      }
    }

    // Detectar alinhamento
    const alignmentPatterns = new Map([
      ['center', ['centralizado', 'centro', 'middle', 'centrado']],
      ['left', ['esquerda', 'left', 'inicio']],
      ['right', ['direita', 'right', 'fim']]
    ])

    for (const [alignment, keywords] of alignmentPatterns.entries()) {
      if (keywords.some(keyword => prompt.includes(keyword))) {
        layout.alignment = alignment
        break
      }
    }

    // Detectar densidade
    const densityPatterns = new Map([
      ['compact', ['compacto', 'apertado', 'denso', 'pequeno']],
      ['spacious', ['espacoso', 'amplo', 'aberto', 'largo']],
      ['normal', ['normal', 'padrao', 'medio']]
    ])

    for (const [density, keywords] of densityPatterns.entries()) {
      if (keywords.some(keyword => prompt.includes(keyword))) {
        layout.density = density
        break
      }
    }

    // Default baseado no tipo de projeto
    if (!layout.type) {
      switch (context.type) {
        case 'newsletter':
          layout.type = 'single-column'
          break
        case 'promotional':
          layout.type = 'hero-focused'
          break
        default:
          layout.type = 'single-column'
      }
    }

    return layout
  }

  private detectTypography(prompt: string, context: ProjectContext): any {
    const typography: any = {}

    // Detectar estilo de tipografia
    const stylePatterns = new Map([
      ['modern', ['moderno', 'contemporaneo', 'atual', 'tech']],
      ['classic', ['classico', 'tradicional', 'serif', 'formal']],
      ['bold', ['bold', 'forte', 'pesado', 'grosso', 'negrito']],
      ['elegant', ['elegante', 'refinado', 'sofisticado', 'delicado']]
    ])

    for (const [style, keywords] of stylePatterns.entries()) {
      if (keywords.some(keyword => prompt.includes(keyword))) {
        typography.style = style
        break
      }
    }

    // Detectar tamanho
    const sizePatterns = new Map([
      ['large', ['grande', 'big', 'maior', 'destacado']],
      ['small', ['pequeno', 'small', 'menor', 'discreto']],
      ['medium', ['medio', 'normal', 'padrao']]
    ])

    for (const [size, keywords] of sizePatterns.entries()) {
      if (keywords.some(keyword => prompt.includes(keyword))) {
        typography.size = size
        break
      }
    }

    // Detectar ênfase
    const emphasisPatterns = new Map([
      ['subtle', ['sutil', 'discreto', 'leve', 'suave']],
      ['strong', ['forte', 'marcante', 'destacado', 'impactante']],
      ['normal', ['normal', 'padrao', 'equilibrado']]
    ])

    for (const [emphasis, keywords] of emphasisPatterns.entries()) {
      if (keywords.some(keyword => prompt.includes(keyword))) {
        typography.emphasis = emphasis
        break
      }
    }

    return typography
  }

  private detectComponents(prompt: string, context: ProjectContext): any {
    const components: any = {}

    // Detectar estilo de CTA
    if (this.isContext(prompt, ['botao']) && !this.isContext(prompt, ['link'])) {
      components.ctaStyle = 'button'
    } else if (this.isContext(prompt, ['link']) && !this.isContext(prompt, ['botao'])) {
      components.ctaStyle = 'link'
    } else if (this.isContext(prompt, ['banner', 'destaque', 'chamativo'])) {
      components.ctaStyle = 'banner'
    }

    // Detectar estilo de imagem
    if (this.isContext(prompt, ['borda', 'border', 'contorno'])) {
      components.imageStyle = 'bordered'
    } else if (this.isContext(prompt, ['sombra', 'shadow', 'profundidade'])) {
      components.imageStyle = 'shadow'
    } else if (this.isContext(prompt, ['limpo', 'clean', 'simples'])) {
      components.imageStyle = 'minimal'
    }

    // Detectar estilo de seção
    if (this.isContext(prompt, ['cartoes', 'cards', 'blocos'])) {
      components.sectionStyle = 'cards'
    } else if (this.isContext(prompt, ['dividido', 'separado', 'secoes'])) {
      components.sectionStyle = 'divided'
    } else if (this.isContext(prompt, ['limpo', 'simples', 'clean'])) {
      components.sectionStyle = 'clean'
    }

    return components
  }

  private extractContentRequirements(prompt: string, context: ProjectContext): ContentRequirements {
    return {
      tone: this.detectTone(prompt, context),
      length: this.detectLength(prompt),
      focus: this.detectFocus(prompt, context),
      urgency: this.detectUrgency(prompt),
      personalization: this.detectPersonalization(prompt)
    }
  }

  private detectTone(prompt: string, context: ProjectContext): any {
    const tonePatterns = new Map([
      ['professional', ['profissional', 'corporativo', 'formal', 'business']],
      ['casual', ['casual', 'descontraido', 'informal', 'relaxado']],
      ['urgent', ['urgente', 'imediato', 'rapido', 'agora']],
      ['friendly', ['amigavel', 'acolhedor', 'caloroso', 'simpatico']],
      ['formal', ['formal', 'serio', 'respeitoso', 'conservador']]
    ])

    for (const [tone, keywords] of tonePatterns.entries()) {
      if (keywords.some(keyword => prompt.includes(keyword))) {
        return tone
      }
    }

    // Inferir tom baseado no contexto e tipo de projeto
    const industryDefault = this.industryDefaults.get(context.industry)
    if (industryDefault?.tone) {
      return industryDefault.tone
    }

    switch (context.type) {
      case 'promotional': return 'urgent'
      case 'welcome': return 'friendly'
      case 'newsletter': return 'professional'
      default: return context.tone || 'professional'
    }
  }

  // Métodos auxiliares continuam...
  private detectLength(prompt: string): any {
    if (this.isContext(prompt, ['curto', 'breve', 'rapido', 'resumido'])) return 'short'
    if (this.isContext(prompt, ['longo', 'detalhado', 'completo', 'extenso'])) return 'long'
    return 'medium'
  }

  private detectFocus(prompt: string, context: ProjectContext): any {
    const focuses: string[] = []

    const focusPatterns = new Map([
      ['conversion', ['venda', 'conversao', 'compra', 'acao', 'clique']],
      ['information', ['informacao', 'educacao', 'explicar', 'ensinar']],
      ['engagement', ['engajamento', 'interacao', 'participacao', 'envolvimento']],
      ['branding', ['marca', 'branding', 'identidade', 'reconhecimento']]
    ])

    for (const [focus, keywords] of focusPatterns.entries()) {
      if (keywords.some(keyword => prompt.includes(keyword))) {
        focuses.push(focus)
      }
    }

    // Inferir foco baseado no tipo de projeto se não especificado
    if (focuses.length === 0) {
      switch (context.type) {
        case 'promotional':
        case 'campaign':
          focuses.push('conversion')
          break
        case 'newsletter':
          focuses.push('information', 'engagement')
          break
        case 'welcome':
          focuses.push('branding', 'engagement')
          break
        default:
          focuses.push('information')
      }
    }

    return focuses
  }

  private detectUrgency(prompt: string): any {
    if (this.isContext(prompt, ['urgente', 'imediato', 'agora', 'hoje', 'ja'])) return 'high'
    if (this.isContext(prompt, ['importante', 'prioritario', 'logo', 'breve'])) return 'medium'
    return 'low'
  }

  private detectPersonalization(prompt: string): any {
    if (this.isContext(prompt, ['personalizado', 'unico', 'exclusivo', 'individual'])) return 'advanced'
    if (this.isContext(prompt, ['nome', 'pessoal', 'especifico'])) return 'basic'
    return 'none'
  }

  // Métodos auxiliares
  private isContext(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword))
  }

  private getContextAroundMatch(text: string, match: string, matchIndex: number, radius: number): string {
    const start = Math.max(0, matchIndex - radius)
    const end = Math.min(text.length, matchIndex + match.length + radius)
    return text.substring(start, end)
  }

  private mapVisualStyleToColorStyle(visualStyle: string): string {
    const mapping = {
      'modern': 'professional',
      'vibrant': 'vibrant',
      'professional': 'professional',
      'playful': 'playful',
      'elegant': 'muted',
      'urgent': 'vibrant',
      'luxury': 'muted'
    }
    return mapping[visualStyle] || 'professional'
  }

  private calculateIntentionPriority(action: string, target: string, prompt: string, context: ProjectContext): number {
    let priority = 0.5

    // Prioridade baseada na ação
    const actionPriorities = {
      'create': 0.9,
      'redesign': 0.8,
      'modify': 0.6,
      'improve': 0.5
    }
    priority += (actionPriorities[action] || 0.3) * 0.4

    // Prioridade baseada no target
    const targetPriorities = {
      'layout': 0.9,
      'colors': 0.8,
      'subject': 0.7,
      'cta': 0.7,
      'content': 0.6,
      'typography': 0.5,
      'images': 0.4
    }
    priority += (targetPriorities[target] || 0.3) * 0.3

    // Modificadores contextuais
    if (this.isContext(prompt, ['principal', 'importante', 'foco', 'destaque'])) {
      priority += 0.2
    }

    // Ajustar baseado no contexto do projeto
    if (context.type === 'promotional' && target === 'cta') {
      priority += 0.1
    }

    return Math.min(priority, 1.0)
  }

  private calculateIntentionConfidence(match: RegExpMatchArray, pattern: RegExp, fullPrompt: string): number {
    let confidence = 0.6 // base

    // Confiança baseada no tamanho do match
    const matchLength = match[0].length
    confidence += Math.min(matchLength * 0.01, 0.2)

    // Confiança baseada na qualidade do contexto
    if (match.index !== undefined) {
      const contextQuality = this.assessContextQuality(fullPrompt, match[0], match.index)
      confidence += contextQuality * 0.2
    }

    return Math.min(confidence, 1.0)
  }

  private assessContextQuality(fullText: string, match: string, matchIndex: number): number {
    const context = this.getContextAroundMatch(fullText, match, matchIndex, 25)
    
    // Verificar palavras relacionadas ao contexto de email
    const emailKeywords = ['email', 'subject', 'content', 'design', 'layout', 'cor', 'botao', 'cta']
    const keywordCount = emailKeywords.filter(keyword => context.includes(keyword)).length
    
    return Math.min(keywordCount * 0.1, 0.8)
  }

  private processIntentions(intentions: Intention[]): Intention[] {
    // Remover duplicatas
    const uniqueIntentions = this.deduplicateIntentions(intentions)
    
    // Ordenar por prioridade
    uniqueIntentions.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return b.confidence - a.confidence
    })

    // Limitar a 5 intenções principais
    return uniqueIntentions.slice(0, 5)
  }

  private deduplicateIntentions(intentions: Intention[]): Intention[] {
    const seen = new Set<string>()
    return intentions.filter(intention => {
      const key = `${intention.action}-${intention.target}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private detectScope(prompt: string, match: string, matchIndex: number): any {
    const context = this.getContextAroundMatch(prompt, match, matchIndex, 20)
    
    if (this.isContext(context, ['todo', 'completo', 'inteiro', 'geral'])) {
      return 'global'
    }
    if (this.isContext(context, ['secao', 'parte', 'area', 'bloco'])) {
      return 'section'
    }
    return 'element'
  }

  private extractSpecification(prompt: string, match: string, matchIndex: number): string {
    const context = this.getContextAroundMatch(prompt, match, matchIndex, 30)
    return context.trim()
  }

  private calculateConfidence(intentions: Intention[], visual: VisualRequirements, content: ContentRequirements): number {
    let confidence = 0.5 // base

    // Confiança baseada em intenções
    if (intentions.length > 0) {
      confidence += 0.1 * Math.min(intentions.length, 3)
      const avgIntentionConfidence = intentions.reduce((sum, i) => sum + i.confidence, 0) / intentions.length
      confidence += avgIntentionConfidence * 0.2
    }

    // Confiança baseada em requisitos visuais
    const visualReqCount = Object.keys(visual).length
    confidence += Math.min(visualReqCount * 0.05, 0.15)

    // Confiança baseada em requisitos de conteúdo
    if (content.focus.length > 0) confidence += 0.05
    if (content.urgency !== 'low') confidence += 0.05
    if (content.tone !== 'professional') confidence += 0.03 // tom específico

    return Math.min(confidence, 1.0)
  }

  private getFallbackAnalysis(prompt: string, context: ProjectContext, processingTime: number): PromptAnalysis {
    return {
      intentions: [{
        action: 'create',
        target: 'content',
        specification: 'Análise básica - erro no processamento',
        priority: 0.5,
        scope: 'global',
        confidence: 0.3
      }],
      visualRequirements: {},
      contentRequirements: {
        tone: context.tone || 'professional',
        length: 'medium',
        focus: ['information'],
        urgency: 'low',
        personalization: 'none'
      },
      confidence: 0.3,
      processingTime,
      originalPrompt: prompt
    }
  }
}
