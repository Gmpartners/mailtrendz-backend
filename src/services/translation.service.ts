import axios, { AxiosInstance } from 'axios'
import { logger } from '../utils/logger'

export interface TranslationRequest {
  text: string
  fromLanguage: 'pt' | 'en'
  toLanguage: 'pt' | 'en'
  userId?: string
}

export interface TranslationResponse {
  originalText: string
  translatedText: string
  fromLanguage: string
  toLanguage: string
  confidence: number
  metadata: {
    model: string
    processingTime: number
    generatedAt: string
    service: string
  }
}

class TranslationService {
  private client: AxiosInstance
  private apiKey: string
  private model: string
  private baseUrl: string
  private cache: Map<string, TranslationResponse> = new Map()
  private readonly cacheTTL = 1000 * 60 * 60 * 24 // 24 hours

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || ''
    this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
    
    if (!this.apiKey) {
      logger.warn('OPENROUTER_API_KEY não configurada - serviço de tradução desabilitado')
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'MailTrendz Translation Service'
      }
    })
  }

  private getCacheKey(text: string, fromLang: string, toLang: string): string {
    return `${fromLang}-${toLang}-${text.toLowerCase().trim()}`
  }

  private getCachedTranslation(cacheKey: string): TranslationResponse | null {
    const cached = this.cache.get(cacheKey)
    if (!cached) return null

    // Check if cache is still valid
    const now = Date.now()
    const cacheTime = new Date(cached.metadata.generatedAt).getTime()
    if (now - cacheTime > this.cacheTTL) {
      this.cache.delete(cacheKey)
      return null
    }

    return cached
  }

  private setCachedTranslation(cacheKey: string, translation: TranslationResponse): void {
    this.cache.set(cacheKey, translation)
  }

  async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    const startTime = Date.now()
    
    try {
      // Input validation
      if (!request.text?.trim()) {
        throw new Error('Texto para tradução não pode estar vazio')
      }

      if (request.fromLanguage === request.toLanguage) {
        // Same language, return original
        return {
          originalText: request.text,
          translatedText: request.text,
          fromLanguage: request.fromLanguage,
          toLanguage: request.toLanguage,
          confidence: 1.0,
          metadata: {
            model: 'no-translation-needed',
            processingTime: Date.now() - startTime,
            generatedAt: new Date().toISOString(),
            service: 'translation-service'
          }
        }
      }

      // Check cache first
      const cacheKey = this.getCacheKey(request.text, request.fromLanguage, request.toLanguage)
      const cached = this.getCachedTranslation(cacheKey)
      if (cached) {
        logger.info(`Tradução obtida do cache: ${request.text} -> ${cached.translatedText}`)
        return cached
      }

      if (!this.apiKey) {
        throw new Error('Serviço de tradução não configurado')
      }

      // Prepare translation prompt
      const languageNames = {
        'pt': 'português brasileiro',
        'en': 'inglês americano'
      }

      const prompt = `Você é um especialista em tradução. Traduza EXATAMENTE o seguinte texto de ${languageNames[request.fromLanguage]} para ${languageNames[request.toLanguage]}.

IMPORTANTE:
- Mantenha o tom e estilo original
- Preserve a intenção e contexto
- Se for nome de projeto de email, mantenha naturalidade
- Não adicione explicações, apenas a tradução
- Se contiver termos técnicos de email marketing, use equivalentes adequados

Texto para traduzir: "${request.text}"

Responda APENAS com a tradução, sem aspas ou formatação adicional.`

      // Make API request
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent translations
        max_tokens: 1000,
        top_p: 0.9
      })

      const translatedText = response.data.choices[0]?.message?.content?.trim()
      
      if (!translatedText) {
        throw new Error('Resposta de tradução vazia da API')
      }

      // Create response object
      const translationResponse: TranslationResponse = {
        originalText: request.text,
        translatedText: translatedText,
        fromLanguage: request.fromLanguage,
        toLanguage: request.toLanguage,
        confidence: 0.95, // High confidence for Claude
        metadata: {
          model: this.model,
          processingTime: Date.now() - startTime,
          generatedAt: new Date().toISOString(),
          service: 'translation-service'
        }
      }

      // Cache the translation
      this.setCachedTranslation(cacheKey, translationResponse)

      logger.info(`Tradução concluída: "${request.text}" -> "${translatedText}" (${request.fromLanguage} -> ${request.toLanguage})`)
      
      return translationResponse

    } catch (error: any) {
      logger.error('Erro no serviço de tradução:', {
        error: error.message,
        text: request.text,
        fromLanguage: request.fromLanguage,
        toLanguage: request.toLanguage,
        userId: request.userId
      })

      // Return fallback response
      return {
        originalText: request.text,
        translatedText: request.text, // Fallback to original
        fromLanguage: request.fromLanguage,
        toLanguage: request.toLanguage,
        confidence: 0.0,
        metadata: {
          model: 'fallback',
          processingTime: Date.now() - startTime,
          generatedAt: new Date().toISOString(),
          service: 'translation-service'
        }
      }
    }
  }

  async translateProjectName(projectName: string, fromLanguage: 'pt' | 'en', toLanguage: 'pt' | 'en'): Promise<string> {
    try {
      const result = await this.translateText({
        text: projectName,
        fromLanguage,
        toLanguage
      })
      
      return result.translatedText
    } catch (error) {
      logger.error('Erro ao traduzir nome do projeto:', error)
      return projectName // Fallback to original
    }
  }

  // Clear cache (useful for admin operations)
  clearCache(): void {
    this.cache.clear()
    logger.info('Cache de traduções limpo')
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

export const translationService = new TranslationService()
export default translationService