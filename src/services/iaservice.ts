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
    imageIntents?: Array<{ url: string; intent: 'analyze' | 'include' }>
  ): string {
    let basePrompt = `Você é um especialista em criação de HTML para emails marketing. ${hasExistingHTML ? 'Você recebeu um HTML existente e deve MODIFICÁ-LO de acordo com as instruções do usuário.' : 'Você deve criar um HTML que seja bonito e funcional para emails.'}

INSTRUÇÕES CRÍTICAS:
1. A RESPOSTA DEVE SER UMA ÚNICA LINHA DE HTML SEM QUEBRAS DE LINHA.
2. ${hasExistingHTML ? 'MANTENHA A ESTRUTURA E CONTEÚDO DO HTML EXISTENTE, APENAS MODIFIQUE O QUE FOI SOLICITADO.' : 'Use o estilo do exemplo fornecido abaixo.'}
3. Coloque todo o CSS dentro de uma única tag <style> no <head>.
4. IMPORTANTE: Defina o font-size base como 18px no body e use tamanhos proporcionais para outros elementos.
5. Para cabeçalhos: h1 = 30px, h2 = 24px, h3 = 22px.
6. Para botões e elementos de destaque, use font-size de 20px ou maior.
7. Use divs para layout, evite tabelas exceto quando necessário para compatibilidade.
8. Use cores que correspondam à solicitação do usuário.
9. IMPORTANTE: Não use \\n ou qualquer quebra de linha na sua resposta.
10. Retorne apenas o HTML, sem explicações adicionais.`

    if (hasExistingHTML) {
      basePrompt += `

INSTRUÇÕES PARA MODIFICAÇÃO:
11. PRESERVE TODO O CONTEÚDO EXISTENTE (textos, imagens, estrutura).
12. APENAS ALTERE O QUE FOI EXPLICITAMENTE SOLICITADO.
13. Se pedirem para mudar cores, mude APENAS as cores mantendo todo o resto.
14. Se pedirem para mudar fonte, mude APENAS a fonte mantendo todo o resto.
15. NUNCA crie um novo email do zero quando receber um HTML existente.`
    }

    if (imageUrls && imageUrls.length > 0) {
      const analyzeImages = imageIntents?.filter(i => i.intent === 'analyze') || []
      const includeImages = imageIntents?.filter(i => i.intent === 'include') || []
      
      basePrompt += `

INSTRUÇÕES ESPECÍFICAS PARA IMAGENS:`
      
      if (analyzeImages.length > 0) {
        basePrompt += `
${hasExistingHTML ? '16' : '11'}. IMAGENS PARA ANALISAR (NÃO incluir no HTML):
${analyzeImages.map((img, i) => `    - Imagem ${i + 1}: ${img.url} (APENAS analisar conteúdo)`).join('\n')}
${hasExistingHTML ? '17' : '12'}. Use essas imagens como REFERÊNCIA para criar o conteúdo do email, mas NÃO as inclua no HTML.
${hasExistingHTML ? '18' : '13'}. Baseie o tema, cores e estilo do email no que você vê nessas imagens.`
      }
      
      if (includeImages.length > 0) {
        basePrompt += `
${hasExistingHTML ? '19' : '14'}. IMAGENS PARA INCLUIR NO HTML:
${includeImages.map((img, i) => `    - Imagem ${i + 1}: ${img.url}`).join('\n')}
${hasExistingHTML ? '20' : '15'}. VOCÊ DEVE incluir essas imagens no HTML usando as URLs EXATAS.
${hasExistingHTML ? '21' : '16'}. Formato correto: <img src="${includeImages[0]?.url}" alt="[descrição]" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 20px auto;">`
      }
      
      if (imageIntents?.length === 0) {
        basePrompt += `
${hasExistingHTML ? '16' : '11'}. VOCÊ RECEBEU ${imageUrls.length} IMAGEM(NS).
${hasExistingHTML ? '17' : '12'}. Por padrão, INCLUA todas as imagens no HTML usando as URLs fornecidas.`
      }
    }

    basePrompt += `

INSTRUÇÕES CRÍTICAS SOBRE EMOJIS:
${hasExistingHTML ? '24' : '19'}. NUNCA USE EMOJIS NO HTML ou no conteúdo do email.
${hasExistingHTML ? '25' : '20'}. NÃO INCLUA símbolos como: 🔥, 💎, ⚡, 🎯, 📧, 🚀, 🛒, ✅, ❌, 💰, etc.
${hasExistingHTML ? '26' : '21'}. Use texto simples e professional sem emojis.

INSTRUÇÕES EXTREMAMENTE IMPORTANTES SOBRE CONTEÚDO:
${hasExistingHTML ? '27' : '22'}. NÃO ADICIONE ELEMENTOS QUE NÃO FORAM EXPLICITAMENTE SOLICITADOS.
${hasExistingHTML ? '28' : '23'}. NÃO ADICIONE LINKS PARA REDES SOCIAIS a menos que especificamente solicitados.
${hasExistingHTML ? '29' : '24'}. O footer deve ser simples, apenas com copyright.
${hasExistingHTML ? '30' : '25'}. O ano atual é 2025.`

    if (!hasExistingHTML) {
      basePrompt += `

EXEMPLO DE FORMATO:
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Título do Email</title><style>body, p, h1, h2, h3, h4 { margin: 0; padding: 0; } body { background-color: #f8f9fa; font-family: 'Arial', sans-serif; color: #2d3436; line-height: 1.6; padding: 20px; font-size: 18px; } p { font-size: 18px; margin-bottom: 15px; } h1 { font-size: 30px; margin-bottom: 15px; } h2 { font-size: 24px; margin-bottom: 12px; } h3 { font-size: 22px; margin-bottom: 10px; } .container { max-width: 600px; background: #ffffff; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1); } .header { background-color: #ffcc00; color: #333; padding: 30px 20px; text-align: center; } .content { padding: 40px 30px; font-size: 18px; } .button { display: inline-block; background: #ffcc00; color: #333 !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0; } .footer { background: #333; color: #fff; text-align: center; font-size: 16px; padding: 20px; }</style></head><body><div class="container"><div class="header"><h1>Título Principal</h1></div><div class="content"><p>Conteúdo do email aqui.</p><div style="text-align: center;"><a href="#" class="button">Botão de Ação</a></div></div><div class="footer"><p>&copy; 2025 Empresa. Todos os direitos reservados.</p></div></div></body></html>`
    }

    return basePrompt
  }

  private buildMessageContent(
    userInput: string, 
    existingHTML?: string, 
    imageUrls?: string[],
    imageIntents?: Array<{ url: string; intent: 'analyze' | 'include' }>
  ): any {
    let enhancedInput = userInput
    
    if (existingHTML) {
      enhancedInput = `${userInput}

HTML EXISTENTE QUE DEVE SER MODIFICADO:
${existingHTML}`
    }
    
    if (imageIntents && imageIntents.length > 0) {
      const analyzeImages = imageIntents.filter(i => i.intent === 'analyze')
      const includeImages = imageIntents.filter(i => i.intent === 'include')
      
      if (analyzeImages.length > 0) {
        enhancedInput += `\n\nIMAGENS PARA ANALISAR (use como referência mas NÃO inclua no HTML):\n${analyzeImages.map((img, i) => `Imagem ${i + 1}: ${img.url}`).join('\n')}`
      }
      
      if (includeImages.length > 0) {
        enhancedInput += `\n\nIMAGENS PARA INCLUIR NO HTML (use estas URLs exatas):\n${includeImages.map((img, i) => `Imagem ${i + 1}: ${img.url}`).join('\n')}`
      }
    } else if (imageUrls && imageUrls.length > 0) {
      enhancedInput += `\n\nIMPORTANTE: Use EXATAMENTE estas URLs nas tags img do HTML:\n${imageUrls.map((url, i) => `Imagem ${i + 1}: ${url}`).join('\n')}`
    }

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
        request.imageIntents
      )
      const systemPrompt = this.getSystemPrompt(hasExistingHTML, request.imageUrls, request.imageIntents)
      
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
      
      html = this.cleanHTML(html)
      html = this.removeEmojis(html)
      
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
      
      html = this.processHTMLWithCheerio(html)
      
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
          ? 'HTML modificado com sucesso!'
          : request.imageUrls && request.imageUrls.length > 0 
            ? `HTML gerado com sucesso! ${request.imageUrls.length} imagem(ns) processada(s).`
            : 'HTML gerado com sucesso via IA!',
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