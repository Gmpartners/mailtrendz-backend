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
    imageUrls?: string[],
    imageIntents?: Array<{ url: string; intent: 'analyze' | 'include' }>,
    isModification?: boolean,
    projectContext?: any,
    chatHistory?: Array<{role: string, content: string, timestamp: string}>
  ): string {
    
    // 🔥 DETERMINAR TIPO DE OPERAÇÃO
    const operationType = isModification ? 'MODIFICAÇÃO DE EMAIL EXISTENTE' : 'CRIAÇÃO DE NOVO EMAIL'
    
    let basePrompt = `Você é um especialista em criação de HTML para emails marketing.

🎯 TIPO DE OPERAÇÃO: ${operationType}

${projectContext ? `
📊 CONTEXTO DO PROJETO:
- Nome: ${projectContext.name}
- Descrição: ${projectContext.description}
- Tipo: ${projectContext.type}
- Status: ${projectContext.status}
- Assunto atual: ${projectContext.subject || 'Não definido'}
- Criado em: ${projectContext.createdAt}
- Última atualização: ${projectContext.updatedAt}
- Prompt original: ${projectContext.metadata?.originalPrompt || 'Não especificado'}
- Versão: ${projectContext.metadata?.version || 1}
- Gerado por IA: ${projectContext.metadata?.aiGenerated ? 'Sim' : 'Não'}
` : ''}

${chatHistory && chatHistory.length > 0 ? `
💬 HISTÓRICO DA CONVERSA (últimas mensagens):
${chatHistory.map((msg, index) => `${index + 1}. ${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}

📝 ANÁLISE DO HISTÓRICO:
- Total de mensagens: ${chatHistory.length}
- Última atividade: ${chatHistory[chatHistory.length - 1]?.timestamp}
- Padrão: ${chatHistory.filter(m => m.role === 'user').length} solicitações do usuário
` : ''}

${isModification ? `
🚨 INSTRUÇÕES CRÍTICAS PARA MODIFICAÇÃO:
1. Você está MODIFICANDO um email que já existe
2. ANALISE cuidadosamente o HTML fornecido
3. IDENTIFIQUE exatamente o que o usuário quer alterar
4. MANTENHA absolutamente tudo que não foi explicitamente solicitado para mudar
5. Se o usuário pedir algo que já existe no email, confirme ou faça ajustes mínimos
6. PRESERVE toda a estrutura, cores, textos e elementos não mencionados
7. Sua resposta deve conter APENAS O HTML, sem nenhum texto adicional
8. Se a modificação solicitada já estiver presente, explique isso educadamente

🔍 PROCESSO DE MODIFICAÇÃO:
- Leia o HTML atual completamente
- Identifique os elementos específicos mencionados pelo usuário
- Modifique APENAS esses elementos
- Mantenha o resto 100% idêntico
` : `
🆕 INSTRUÇÕES PARA CRIAÇÃO:
1. Você está CRIANDO um novo email do zero
2. Use as informações do contexto do projeto como base
3. Siga as melhores práticas de email marketing
4. Crie um design profissional e atrativo
5. Sua resposta deve conter APENAS O HTML, sem nenhum texto adicional
`}

🎨 INSTRUÇÕES TÉCNICAS:
1. A RESPOSTA DEVE SER UMA ÚNICA LINHA DE HTML SEM QUEBRAS DE LINHA
2. Coloque todo o CSS dentro de uma única tag <style> no <head>
3. IMPORTANTE: Defina o font-size base como 18px no body
4. Para cabeçalhos: h1 = 30px, h2 = 24px, h3 = 22px
5. Para botões: font-size de 20px ou maior
6. Use divs para layout, evite tabelas complexas
7. Cores devem ser harmoniosas e profissionais
8. NUNCA use emojis no HTML (🚫 ❌ ✅ 🔥 etc.)
9. Ano atual: 2025
10. Retorne apenas o HTML, sem explicações adicionais
11. NUNCA inclua frases como "HTML gerado com sucesso" ou similares
12. NUNCA use URLs de exemplo como "exemplo.com" ou "example.com"
13. Se não houver imagens fornecidas, NÃO inclua tags <img> no HTML

${hasExistingHTML ? `
📄 IMPORTANTE: Um HTML existente será fornecido para modificação
` : ''}

${imageUrls && imageUrls.length > 0 ? `
🖼️ IMAGENS FORNECIDAS: ${imageUrls.length} imagem(ns)
- Processar conforme instruções específicas de cada imagem
- Incluir ou analisar conforme indicado
` : ''}

${imageIntents && imageIntents.length > 0 ? `
🔍 INSTRUÇÕES ESPECÍFICAS PARA IMAGENS:
${imageIntents.filter(i => i.intent === 'analyze').length > 0 ? `
- IMAGENS PARA ANALISAR (usar como referência, NÃO incluir no HTML):
${imageIntents.filter(i => i.intent === 'analyze').map((img, i) => `  ${i + 1}. ${img.url}`).join('\n')}` : ''}
${imageIntents.filter(i => i.intent === 'include').length > 0 ? `
- IMAGENS PARA INCLUIR NO HTML (usar estas URLs exatas):
${imageIntents.filter(i => i.intent === 'include').map((img, i) => `  ${i + 1}. ${img.url}`).join('\n')}` : ''}
` : ''}

⚠️ LEMBRE-SE: Retorne APENAS o HTML puro, sem nenhum texto adicional antes ou depois!`

    return basePrompt
  }

  private buildMessageContent(
    userInput: string, 
    existingHTML?: string, 
    imageUrls?: string[],
    imageIntents?: Array<{ url: string; intent: 'analyze' | 'include' }>,
    chatHistory?: Array<{role: string, content: string, timestamp: string}>,
    projectContext?: any
  ): any {
    let enhancedInput = userInput
    
    // 🔥 ADICIONAR CONTEXTO DO PROJETO
    if (projectContext) {
      enhancedInput += `

📊 CONTEXTO DO PROJETO:
Nome: ${projectContext.name}
Descrição: ${projectContext.description}
Tipo: ${projectContext.type}
Status: ${projectContext.status}`
    }
    
    // 🔥 ADICIONAR RESUMO DO HISTÓRICO
    if (chatHistory && chatHistory.length > 0) {
      const userMessages = chatHistory.filter(m => m.role === 'user')
      const aiMessages = chatHistory.filter(m => m.role === 'ai')
      
      enhancedInput += `

💬 CONTEXTO DA CONVERSA:
- Mensagens anteriores: ${chatHistory.length}
- Solicitações do usuário: ${userMessages.length}
- Respostas da IA: ${aiMessages.length}

📝 ÚLTIMAS INTERAÇÕES:
${chatHistory.slice(-3).map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}

🎯 INSTRUÇÃO: Considere todo este contexto ao processar a nova solicitação.`
    }
    
    // 🔥 ADICIONAR HTML EXISTENTE COM DESTAQUE
    if (existingHTML) {
      enhancedInput += `

🚨 HTML ATUAL DO PROJETO (PARA MODIFICAÇÃO):
${existingHTML}

⚠️ INSTRUÇÃO CRÍTICA: 
- Este é o HTML que está atualmente no projeto
- Modifique APENAS os elementos mencionados na solicitação
- Mantenha TODO o resto exatamente igual
- NÃO recrie o email do zero`
    }
    
    // 🔥 PROCESSAR IMAGENS
    if (imageIntents && imageIntents.length > 0) {
      const analyzeImages = imageIntents.filter(i => i.intent === 'analyze')
      const includeImages = imageIntents.filter(i => i.intent === 'include')
      
      if (analyzeImages.length > 0) {
        enhancedInput += `

🔍 IMAGENS PARA ANALISAR (usar como referência, NÃO incluir no HTML):
${analyzeImages.map((img, i) => `${i + 1}. ${img.url} - Use como inspiração para conteúdo`).join('\n')}`
      }
      
      if (includeImages.length > 0) {
        enhancedInput += `

📸 IMAGENS PARA INCLUIR NO HTML (usar estas URLs exatas):
${includeImages.map((img, i) => `${i + 1}. ${img.url} - Incluir no HTML`).join('\n')}`
      }
    } else if (imageUrls && imageUrls.length > 0) {
      enhancedInput += `

📸 IMAGENS FORNECIDAS (incluir no HTML):
${imageUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}`
    }

    // 🔥 RETORNAR CONTENT ESTRUTURADO
    if (!imageUrls || imageUrls.length === 0) {
      return enhancedInput
    }

    const content: any[] = [
      {
        type: 'text',
        text: enhancedInput
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

  // 🔥 NOVA FUNÇÃO: Remover texto indesejado do HTML
  private removeUnwantedText(html: string): string {
    // Remover frases comuns que a IA pode adicionar
    const unwantedPhrases = [
      /HTML gerado com sucesso[^<]*/gi,
      /HTML modificado com sucesso[^<]*/gi,
      /Email processado com sucesso[^<]*/gi,
      /^[^<]*HTML[^<]*sucesso[^<]*!/gi
    ]
    
    let cleanedHtml = html
    
    unwantedPhrases.forEach(pattern => {
      cleanedHtml = cleanedHtml.replace(pattern, '')
    })
    
    // Garantir que o HTML comece com uma tag válida
    cleanedHtml = cleanedHtml.trim()
    if (!cleanedHtml.startsWith('<')) {
      const firstTagIndex = cleanedHtml.indexOf('<')
      if (firstTagIndex > 0) {
        cleanedHtml = cleanedHtml.substring(firstTagIndex)
      }
    }
    
    return cleanedHtml
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
        request.imageIntents,
        request.context?.chatHistory,
        request.context?.projectContext
      )

      const systemPrompt = this.getSystemPrompt(
        hasExistingHTML, 
        request.imageUrls, 
        request.imageIntents,
        request.context?.isModification || false,
        request.context?.projectContext,
        request.context?.chatHistory
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
        temperature: 0.7
      })

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Resposta inválida da API OpenRouter')
      }

      let html = response.data.choices[0].message.content.trim()
      
      // 🔥 LIMPAR O HTML
      html = this.cleanHTML(html)
      html = this.removeEmojis(html)
      html = this.removeUnwantedText(html) // Nova função para remover texto indesejado
      
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
        response: hasExistingHTML 
          ? 'Email modificado com sucesso!'
          : request.imageUrls && request.imageUrls.length > 0 
            ? `Email criado com sucesso! ${request.imageUrls.length} imagem(ns) processada(s).`
            : 'Email criado com sucesso!',
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
    const modificationPrompt = existingHTML 
      ? `Modifique este HTML seguindo as instruções: "${instructions}"\n\nHTML atual:\n${existingHTML}`
      : instructions

    return this.generateHTML({
      userInput: modificationPrompt,
      context: { 
        isModification: true,
        existingHTML: existingHTML 
      },
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