import axios, { AxiosInstance } from 'axios'
import * as cheerio from 'cheerio'
import { logger } from '../utils/logger'
import { inlineStyles } from '../utils/cssInliner'

export interface IARequest {
  userInput: string
  context?: Record<string, any>
  userId?: string
  imageUrls?: string[]
  imageIntents?: Array<{ url: string; intent: 'analyze' | 'include' }>
  // ✨ NOVA ARQUITETURA: Suporte a operações específicas
  operation?: 'create' | 'edit' | 'analyze'
  editContext?: {
    currentHtml?: string
    targetElement?: {
      selector?: string
      originalText?: string
      newText?: string
      elementType?: 'text' | 'color' | 'style' | 'layout' | 'content'
      position?: any
    }
    preserveStructure?: boolean
    priority?: 'speed' | 'quality' | 'balanced'
  }
}

export interface IAResponse {
  html: string
  subject: string
  response: string
  metadata: {
    model: string
    processingTime: number
    generatedAt: string
    originalPrompt: string
    isGenerated: boolean
    service: string
    imagesAnalyzed?: number
  }
}

class IAService {
  private client: AxiosInstance
  private apiKey: string
  private model: string
  private baseUrl: string
  private maxConcurrent: number = 50

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || ''
    this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
    
    if (!this.apiKey) {
      logger.warn('OPENROUTER_API_KEY não configurada - serviço IA desabilitado')
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 90000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'MailTrendz'
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        logger.info(`IA REQUEST: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        logger.error('IA Request error:', error.message)
        return Promise.reject(error)
      }
    )

    this.client.interceptors.response.use(
      (response) => {
        logger.info(`IA RESPONSE: ${response.config.method?.toUpperCase()} ${response.config.url} - SUCCESS`)
        return response
      },
      (error) => {
        logger.error('IA Response error:', error.message)
        return Promise.reject(error)
      }
    )
  }

  private getSystemPrompt(
    hasExistingHTML: boolean,
    isModification: boolean = false,
    operation?: 'create' | 'edit' | 'analyze',
    editContext?: any
  ): string {
    
    // ✨ PROMPTS ULTRA-OTIMIZADOS POR OPERAÇÃO E CONTEXTO
    const getOptimizedPrompt = () => {
      // 🎯 MODO EDIÇÃO CIRÚRGICA - Para mudanças específicas
      if (operation === 'edit' && editContext?.targetElement) {
        const { targetElement, preserveStructure, priority } = editContext
        
        return `🎯 MODO EDIÇÃO CIRÚRGICA - ${priority?.toUpperCase() || 'BALANCED'} PRIORITY

🚨 CONTEXTO ESPECÍFICO:
- Elemento alvo: ${targetElement.elementType || 'text'}
- Texto original: "${targetElement.originalText}"
- Novo texto: "${targetElement.newText}"
- Preservar estrutura: ${preserveStructure ? 'SIM' : 'NÃO'}
- Seletor: ${targetElement.selector || 'não especificado'}

🔧 INSTRUÇÕES ULTRA-ESPECÍFICAS:
1. Encontre EXATAMENTE o texto "${targetElement.originalText}" no HTML
2. Substitua POR "${targetElement.newText}"
3. NÃO altere cores, fontes, espaçamento ou qualquer CSS
4. NÃO altere estrutura HTML (divs, tables, etc)
5. NÃO altere outros textos ou conteúdos
6. Mantenha classes CSS, IDs e atributos idênticos

${priority === 'speed' ? '⚡ MODO RÁPIDO: Mudança cirúrgica apenas no texto especificado' : ''}${priority === 'quality' ? '🎨 MODO QUALIDADE: Garanta que a mudança se integra perfeitamente' : ''}`
      }
      
      // 🔧 MODO EDIÇÃO GERAL - Para HTML existente
      if (operation === 'edit' && hasExistingHTML) {
        return `🔧 MODO EDIÇÃO ULTRA-PRECISA - PRESERVAÇÃO TOTAL DA INTEGRIDADE VISUAL

🚨 REGRAS ABSOLUTAS INQUEBRÁVEIS:
1. VOCÊ ESTÁ EDITANDO UM EMAIL EXISTENTE - JAMAIS RECRIE DO ZERO
2. PRESERVE 100% da estrutura HTML (divs, tables, sections, spans)
3. PRESERVE 100% dos estilos CSS (cores, fontes, tamanhos, espaçamentos)
4. PRESERVE 100% do layout, posicionamento e aparência visual
5. PRESERVE 100% de classes CSS, IDs e atributos
6. ALTERE SOMENTE o texto/conteúdo ESPECÍFICO mencionado na instrução

🔍 PROCESSO CIRÚRGICO DE EDIÇÃO:
1. ANALISE: Leia todo o HTML atual linha por linha
2. IDENTIFIQUE: Localize EXATAMENTE o elemento que precisa ser alterado
3. MODIFIQUE: Altere APENAS o conteúdo específico solicitado
4. VERIFIQUE: Garanta que NADA MAIS foi alterado
5. RETORNE: O HTML completo com apenas a modificação solicitada

❌ ABSOLUTAMENTE PROIBIDO (ZERO TOLERÂNCIA):
- Recriar qualquer parte da estrutura HTML
- Alterar cores, fontes, tamanhos não mencionados
- Reorganizar, mover ou remover elementos existentes
- Adicionar novos elementos visuais não solicitados
- Modificar classes CSS, estilos inline ou IDs
- Alterar background-colors, padding, margin
- Mudar qualquer aspecto visual do design
- Reformatar ou "melhorar" o HTML existente

⚠️ LEMBRE-SE: Sua única missão é fazer a alteração específica pedida mantendo TUDO MAIS idêntico ao original!`
      }
      
      // 📊 MODO ANÁLISE - Para melhorias sutis
      if (operation === 'analyze' && hasExistingHTML) {
        return `📊 MODO ANÁLISE - MELHORAR HTML EXISTENTE
        
🎯 OBJETIVO: Melhorar o HTML existente mantendo sua essência
- Analise o HTML atual e sugira melhorias sutis
- Mantenha a estrutura e design principal
- Foque em otimizações e refinamentos
- Preserve o conteúdo existente`
      }
      
      // 🆕 MODO CRIAÇÃO - Para novo email
      return `🆕 MODO CRIAÇÃO - NOVO EMAIL HTML

🎯 OBJETIVO: Criar um email HTML profissional do zero
- Estrutura clean e responsiva
- Design moderno e profissional
- Compatível com clientes de email
- CSS inline para máxima compatibilidade`
    }
    
    return `Você é um especialista em HTML para emails.

🚨 REGRA ABSOLUTA: RETORNE APENAS HTML PURO, NADA MAIS!

${getOptimizedPrompt()}

⚠️ INSTRUÇÕES CRÍTICAS:
1. RESPOSTA = APENAS HTML (nenhum texto antes/depois)
2. HTML em linha única, sem quebras de linha
3. CSS dentro de <style> no <head>
4. Font-size padrão: 18px para melhor legibilidade
5. NUNCA use emojis no HTML final
6. NUNCA use URLs de exemplo (example.com, etc)
7. Se não há imagens fornecidas, NÃO inclua <img>
8. ${isModification ? 'CRUCIAL: EDITE apenas o solicitado, preserve tudo mais' : 'Crie estrutura completa e profissional'}

🚫 ABSOLUTAMENTE PROIBIDO:
- Frases como "HTML gerado com sucesso", "Email modificado", etc
- Explicações ou comentários
- Conversas ou texto antes/depois do HTML
- Emojis dentro do HTML
- Recriar HTML do zero quando deveria apenas editar

✅ PERMITIDO:
- APENAS HTML puro e válido
- Modificações precisas quando solicitadas`
  }

  private buildMessageContent(
    userInput: string, 
    existingHTML?: string, 
    imageUrls?: string[],
    operation?: 'create' | 'edit' | 'analyze',
    editContext?: any
  ): any {
    
    // ✨ PROMPTS ULTRA-ESPECÍFICOS POR OPERAÇÃO
    let prompt = ''
    
    if (operation === 'edit' && editContext?.targetElement) {
      // 🎯 PROMPT CIRÚRGICO PARA EDIÇÕES ESPECÍFICAS
      const { targetElement } = editContext
      prompt = `🎯 EDIÇÃO CIRÚRGICA ESPECÍFICA:

TAREFA: Substitua EXATAMENTE "${targetElement.originalText}" por "${targetElement.newText}"

REGRAS CRÍTICAS:
- Encontre o texto "${targetElement.originalText}" no HTML abaixo
- Substitua por "${targetElement.newText}"  
- NÃO altere mais NADA (cores, fontes, estrutura)
- Retorne o HTML completo com apenas essa mudança

HTML ATUAL:
${existingHTML || 'HTML não fornecido'}`
      
    } else if (operation === 'edit' && existingHTML) {
      // 🔧 PROMPT ULTRA-RIGOROSO PARA EDIÇÃO COM PRESERVAÇÃO TOTAL
      prompt = `🔧 EDIÇÃO CIRÚRGICA - PRESERVAÇÃO INTEGRAL:

INSTRUÇÃO ESPECÍFICA: ${userInput}

🚨 PROTOCOLO DE EDIÇÃO ULTRA-RIGOROSO:
1. ANÁLISE COMPLETA: Examine cada elemento do HTML atual abaixo
2. IDENTIFICAÇÃO PRECISA: Localize EXATAMENTE onde fazer a alteração
3. MODIFICAÇÃO CIRÚRGICA: Altere SOMENTE o solicitado na instrução
4. VERIFICAÇÃO TOTAL: Confirme que NADA MAIS foi alterado
5. PRESERVAÇÃO ABSOLUTA: Mantenha cores, fontes, layout, estrutura, classes CSS, IDs, estilos inline

❌ ZERO ALTERAÇÕES PERMITIDAS EM:
- Estrutura HTML (tags, hierarquia, aninhamento)
- Estilos CSS (cores, fontes, tamanhos, espaçamentos)
- Classes CSS e IDs existentes
- Atributos de elementos (style, class, id)
- Layout e posicionamento visual
- Background colors, borders, padding, margin
- Qualquer elemento visual não mencionado na instrução

✅ ALTERE APENAS:
- O conteúdo de texto ESPECÍFICO mencionado na instrução
- Nada mais além disso

HTML ATUAL PARA EDITAR (PRESERVE TUDO EXCETO O ESPECIFICAMENTE SOLICITADO):
${existingHTML}`
      
    } else if (operation === 'analyze' && existingHTML) {
      // 📊 PROMPT PARA ANÁLISE E MELHORIA
      prompt = `📊 ANÁLISE E MELHORIA:

INSTRUÇÃO: ${userInput}

OBJETIVO: Analise e melhore o HTML mantendo sua essência
- Preserve o design e estrutura principal
- Faça melhorias sutis conforme solicitado
- Mantenha o conteúdo existente

HTML ATUAL:
${existingHTML}`
      
    } else {
      // 🆕 PROMPT PARA CRIAÇÃO NOVA
      prompt = `🆕 CRIAÇÃO DE NOVO EMAIL:

INSTRUÇÃO: ${userInput}

OBJETIVO: Crie um email HTML profissional do zero
- Estrutura responsiva e moderna
- Compatível com clientes de email  
- CSS inline para máxima compatibilidade${existingHTML ? `

HTML DE REFERÊNCIA (não copie, apenas inspire-se):
${existingHTML}` : ''}`
    }

    // 🔥 ADICIONAR IMAGENS SE FORNECIDAS
    if (imageUrls && imageUrls.length > 0) {
      prompt += `

IMAGENS: ${imageUrls.join(', ')}`
    }

    // 🔥 RETORNAR CONTENT ESTRUTURADO
    if (!imageUrls || imageUrls.length === 0) {
      return prompt
    }

    const content: any[] = [
      {
        type: 'text',
        text: prompt
      }
    ]

    imageUrls.forEach((url) => {
      content.push({
        type: 'image_url',
        image_url: {
          url: url
        }
      })
    })

    return content
  }

  // 🔥 NOVA FUNÇÃO: Remover URLs de exemplo não substituídas
  private removeExampleUrls(html: string): string {
    // Padrões de URLs de exemplo comuns
    const examplePatterns = [
      /https?:\/\/exemplo\.com[^"'\s]*/gi,
      /https?:\/\/example\.com[^"'\s]*/gi,
      /https?:\/\/placeholder\.com[^"'\s]*/gi,
      /https?:\/\/demo\.com[^"'\s]*/gi,
      /https?:\/\/test\.com[^"'\s]*/gi
    ]
    
    let cleanedHtml = html
    
    // Remover todas as tags img com URLs de exemplo
    examplePatterns.forEach(pattern => {
      // Remover tags img inteiras que contenham URLs de exemplo
      cleanedHtml = cleanedHtml.replace(/<img[^>]*src=["']?[^"']*exemplo\.com[^"']*["']?[^>]*>/gi, '')
      cleanedHtml = cleanedHtml.replace(/<img[^>]*src=["']?[^"']*example\.com[^"']*["']?[^>]*>/gi, '')
      
      // Remover qualquer outra referência a URLs de exemplo
      cleanedHtml = cleanedHtml.replace(pattern, '#')
    })
    
    return cleanedHtml
  }

  // 🔥 FUNÇÃO DEFINITIVA: Extrair APENAS HTML da resposta da IA
  private extractOnlyHTML(response: string): string {
    let html = response.trim()
    
    // 1. Remover qualquer texto antes do HTML
    const htmlStartPatterns = [
      /<!DOCTYPE\s+html/i,
      /<html[^>]*>/i,
      /<head>/i,
      /<body[^>]*>/i
    ]
    
    for (const pattern of htmlStartPatterns) {
      const match = html.match(pattern)
      if (match) {
        const startIndex = html.indexOf(match[0])
        html = html.substring(startIndex)
        break
      }
    }
    
    // 2. Remover qualquer texto depois do HTML
    const htmlEndPatterns = [
      /<\/html>/i,
      /<\/body>/i
    ]
    
    for (const pattern of htmlEndPatterns) {
      const matches = [...html.matchAll(new RegExp(pattern.source, 'gi'))]
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1]
        const endIndex = lastMatch.index! + lastMatch[0].length
        html = html.substring(0, endIndex)
        break
      }
    }
    
    // 3. Remover frases de resposta que a IA pode adicionar
    const unwantedPhrases = [
      /^[^<]*(?:HTML|email).*?(?:gerado|modificado|criado).*?(?:sucesso|êxito)[^<]*/gi,
      /^[^<]*Desculpe.*?HTML.*?[^<]*/gi,
      /^[^<]*Aqui está.*?[^<]*/gi,
      /[^>]*HTML.*?sucesso.*?[^<]*/gi
    ]
    
    unwantedPhrases.forEach(pattern => {
      html = html.replace(pattern, '')
    })
    
    // 4. Garantir que começa com tag HTML válida
    html = html.trim()
    if (!html.startsWith('<')) {
      const firstTagIndex = html.indexOf('<')
      if (firstTagIndex > 0) {
        html = html.substring(firstTagIndex)
      }
    }
    
    return html
  }

  public async generateHTML(request: IARequest): Promise<IAResponse> {
    const startTime = Date.now()
    
    try {
      if (!this.apiKey) {
        throw new Error('OpenRouter API key not configured')
      }

      const existingHTML = request.context?.existingHTML
      const hasExistingHTML = !!(existingHTML && existingHTML.trim())

      logger.info(`Gerando HTML com IA - Input: ${request.userInput.substring(0, 50)}...`, {
        hasImages: !!(request.imageUrls && request.imageUrls.length > 0),
        imageCount: request.imageUrls?.length || 0,
        imageIntents: request.imageIntents?.map(i => i.intent),
        model: this.model,
        hasExistingHTML,
        existingHTMLLength: existingHTML?.length || 0
      })
      
      const userContent = this.buildMessageContent(
        request.userInput, 
        hasExistingHTML ? existingHTML : undefined,
        request.imageUrls,
        request.operation,
        request.editContext
      )

      const systemPrompt = this.getSystemPrompt(
        hasExistingHTML, 
        request.context?.isModification,
        request.operation,
        request.editContext
      )
      
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userContent
          }
        ],
        max_tokens: 4096,
        // ✨ TEMPERATURA ULTRA-OTIMIZADA POR OPERAÇÃO
        temperature: request.operation === 'edit' ? 0.1 : 0.7 // Mínima criatividade para edições para máxima precisão
      })

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Resposta inválida da API OpenRouter')
      }

      let html = response.data.choices[0].message.content.trim()
      
      // 🔥 LIMPEZA AGRESSIVA - SÓ HTML
      html = this.extractOnlyHTML(html)
      html = this.cleanHTML(html)
      html = this.removeEmojis(html)
      
      // 🔥 PROCESSAR IMAGENS
      const includeImages = request.imageIntents?.filter(i => i.intent === 'include') || []
      if (includeImages.length > 0) {
        includeImages.forEach((img, index) => {
          const placeholderPattern = new RegExp(`https://example\\.com/[^"]+\\.(?:jpg|png|gif|webp)`, 'gi')
          const matches = html.match(placeholderPattern)
          if (matches && matches[index]) {
            html = html.replace(matches[index], img.url)
          }
        })
      } else if (!request.imageIntents && request.imageUrls && request.imageUrls.length > 0) {
        request.imageUrls.forEach((url, index) => {
          const placeholderPattern = new RegExp(`https://example\\.com/[^"]+\\.(?:jpg|png|gif|webp)`, 'gi')
          const matches = html.match(placeholderPattern)
          if (matches && matches[index]) {
            html = html.replace(matches[index], url)
          }
        })
      }
      
      // 🔥 REMOVER URLs DE EXEMPLO NÃO SUBSTITUÍDAS
      html = this.removeExampleUrls(html)
      
      // 🔥 PROCESSAR COM CHEERIO
      html = this.processHTMLWithCheerio(html)
      
      // 🔥 APLICAR CSS INLINE
      try {
        logger.info('Aplicando CSS inline...')
        html = inlineStyles(html)
        logger.info('CSS inline aplicado com sucesso')
      } catch (inlineError) {
        logger.error('Erro ao aplicar CSS inline:', inlineError)
      }
      
      const processingTime = Date.now() - startTime
      
      logger.info(`HTML gerado com sucesso em ${processingTime}ms`, {
        imagesProcessed: request.imageUrls?.length || 0,
        imagesAnalyzed: request.imageIntents?.filter(i => i.intent === 'analyze').length || 0,
        imagesIncluded: request.imageIntents?.filter(i => i.intent === 'include').length || 0,
        model: this.model,
        htmlContainsImages: html.includes('<img'),
        wasModification: hasExistingHTML
      })
      
      return {
        html,
        subject: this.extractSubject(request.userInput, existingHTML),
        response: '', // 🔥 RESPOSTA VAZIA - SÓ HTML IMPORTA
        metadata: {
          model: this.model,
          processingTime,
          generatedAt: new Date().toISOString(),
          originalPrompt: request.userInput,
          isGenerated: !hasExistingHTML,
          service: 'mailtrendz-ia-service',
          imagesAnalyzed: request.imageUrls?.length || 0
        }
      }
      
    } catch (error: any) {
      logger.error('Erro na geração de HTML com IA:', error.message)
      logger.error('Detalhes do erro:', {
        response: error.response?.data,
        status: error.response?.status,
        model: this.model
      })
      throw error
    }
  }

  private cleanHTML(html: string): string {
    html = html.replace(/\\n/g, '').replace(/\n/g, '').replace(/\r/g, '')
    html = html.replace(/\\"/g, '"')
    html = html.replace(/```html/gi, '').replace(/```/g, '')
    html = html.replace(/>\s+</g, '><').trim()
    
    return html
  }

  private removeEmojis(html: string): string {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
    
    return html.replace(emojiRegex, '').trim()
  }

  private processHTMLWithCheerio(html: string): string {
    try {
      const $ = cheerio.load(html)
      
      let styleTag = $('style').html()
      if (styleTag) {
        let bodyRule = styleTag.match(/body\s*{[^}]*}/g)
        
        if (!bodyRule || !bodyRule[0].includes('font-size')) {
          styleTag = styleTag.replace(/body\s*{/, 'body { font-size: 18px;')
          $('style').html(styleTag)
        }
        
        let pRule = styleTag.match(/p\s*{[^}]*}/g)
        if (!pRule || !pRule[0].includes('font-size')) {
          styleTag += '\np { font-size: 18px; }'
          $('style').html(styleTag)
        }
        
        html = $.html()
      }
      
      return html
    } catch (error) {
      logger.error('Erro ao processar HTML com Cheerio:', error)
      return html
    }
  }

  private extractSubject(userInput: string, existingHTML?: string): string {
    if (existingHTML) {
      const titleMatch = existingHTML.match(/<title>([^<]+)<\/title>/i)
      if (titleMatch && titleMatch[1]) {
        return titleMatch[1]
      }
    }
    
    const input = userInput.toLowerCase()
    
    if (input.includes('promocional') || input.includes('produto') || input.includes('oferta')) {
      return 'Oferta Especial - Não Perca'
    } else if (input.includes('newsletter') || input.includes('novidades')) {
      return 'Newsletter - Principais Novidades'
    } else if (input.includes('boas-vindas') || input.includes('bem-vindo')) {
      return 'Bem-vindo! Que bom ter você conosco'
    } else if (input.includes('fitness') || input.includes('exercício')) {
      return 'Transforme Seu Corpo - Comece Hoje'
    } else {
      return 'Email Personalizado'
    }
  }

  public async modifyHTML(
    instructions: string, 
    existingHTML: string = '', 
    imageUrls?: string[],
    imageIntents?: Array<{ url: string; intent: 'analyze' | 'include' }>
  ): Promise<IAResponse> {
    // 🔧 PROMPT ULTRA-RIGOROSO PARA PRESERVAR INTEGRIDADE VISUAL
    const strictModificationPrompt = `🔧 EDIÇÃO PRECISA - PRESERVAR INTEGRIDADE VISUAL TOTAL

INSTRUÇÃO DO USUÁRIO: "${instructions}"

🚨 REGRAS ABSOLUTAS PARA MODIFICAÇÃO:
1. ANÁLISE PRIMEIRO: Examine cuidadosamente o HTML atual
2. IDENTIFIQUE: Exatamente o que precisa ser alterado conforme a instrução
3. EXECUTE: APENAS essa alteração específica
4. PRESERVE: 100% da estrutura, cores, fontes, layout e estilos existentes
5. MANTENHA: Todos os elementos visuais intactos

❌ ESTRITAMENTE PROIBIDO:
- Recriar ou alterar a estrutura HTML existente
- Modificar cores, fontes ou estilos não solicitados
- Reorganizar elementos ou layout
- Adicionar/remover elementos não pedidos na instrução
- Alterar classes CSS, IDs ou atributos existentes
- Mudar o design visual geral do email

✅ PERMITIDO APENAS:
- A alteração ESPECÍFICA mencionada na instrução
- Correções de sintaxe HTML se necessário
- Manter compatibilidade com clientes de email

HTML ATUAL PARA MODIFICAR (PRESERVE TUDO EXCETO O SOLICITADO):
${existingHTML}`

    return this.generateHTML({
      userInput: strictModificationPrompt,
      context: { 
        isModification: true,
        existingHTML: existingHTML 
      },
      operation: 'edit', // 🔧 Usar operação específica para edição
      imageUrls,
      imageIntents
    })
  }

  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false
      }

      const response = await this.client.get('/models')
      return response.status === 200
    } catch (error) {
      logger.error('Health check IA falhou:', error)
      return false
    }
  }

  public isEnabled(): boolean {
    return !!this.apiKey
  }

  public getModel(): string {
    return this.model
  }

  public async processMultiple(requests: IARequest[]): Promise<IAResponse[]> {
    const maxConcurrent = Math.min(this.maxConcurrent, requests.length)
    const results: IAResponse[] = []
    
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent)
      const batchPromises = batch.map(request => this.generateHTML(request))
      
      try {
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
      } catch (error) {
        logger.error('Erro no processamento em lote:', error)
        throw error
      }
    }
    
    return results
  }
}

export const iaService = new IAService()
export default iaService