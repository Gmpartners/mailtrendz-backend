import { Request, Response, NextFunction } from 'express'
import { translationService, TranslationRequest } from '../services/translation.service'
import { logger } from '../utils/logger'
import { ApiError } from '../utils/api-error'

interface AuthRequest extends Request {
  userId?: string
}

export class TranslationController {
  
  // POST /api/translation/translate
  async translateText(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { text, fromLanguage, toLanguage } = req.body

      // Validation
      if (!text || typeof text !== 'string') {
        throw new ApiError('Texto é obrigatório e deve ser uma string', 400)
      }

      if (!fromLanguage || !['pt', 'en'].includes(fromLanguage)) {
        throw new ApiError('fromLanguage deve ser "pt" ou "en"', 400)
      }

      if (!toLanguage || !['pt', 'en'].includes(toLanguage)) {
        throw new ApiError('toLanguage deve ser "pt" ou "en"', 400)
      }

      if (text.length > 1000) {
        throw new ApiError('Texto muito longo. Máximo 1000 caracteres', 400)
      }

      const request: TranslationRequest = {
        text: text.trim(),
        fromLanguage,
        toLanguage,
        userId: req.userId
      }

      const result = await translationService.translateText(request)

      res.json({
        success: true,
        data: result
      })

    } catch (error) {
      next(error)
    }
  }

  // POST /api/translation/project-name
  async translateProjectName(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectName, fromLanguage, toLanguage } = req.body

      // Validation
      if (!projectName || typeof projectName !== 'string') {
        throw new ApiError('projectName é obrigatório e deve ser uma string', 400)
      }

      if (!fromLanguage || !['pt', 'en'].includes(fromLanguage)) {
        throw new ApiError('fromLanguage deve ser "pt" ou "en"', 400)
      }

      if (!toLanguage || !['pt', 'en'].includes(toLanguage)) {
        throw new ApiError('toLanguage deve ser "pt" ou "en"', 400)
      }

      if (projectName.length > 200) {
        throw new ApiError('Nome do projeto muito longo. Máximo 200 caracteres', 400)
      }

      const translatedName = await translationService.translateProjectName(
        projectName.trim(),
        fromLanguage,
        toLanguage
      )

      res.json({
        success: true,
        data: {
          originalName: projectName,
          translatedName,
          fromLanguage,
          toLanguage
        }
      })

    } catch (error) {
      next(error)
    }
  }

  // GET /api/translation/project/:projectId/:language
  async getProjectTranslation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId, language } = req.params

      if (!projectId || !language) {
        throw new ApiError('projectId e language são obrigatórios', 400)
      }

      if (!['pt', 'en'].includes(language)) {
        throw new ApiError('language deve ser "pt" ou "en"', 400)
      }

      // TODO: Implement project translation retrieval from database
      // This would fetch stored translations or create them on-demand
      
      res.json({
        success: true,
        data: {
          projectId,
          language,
          message: 'Tradução de projeto - implementação em progresso'
        }
      })

    } catch (error) {
      next(error)
    }
  }

  // POST /api/translation/batch
  async translateBatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { texts, fromLanguage, toLanguage } = req.body

      // Validation
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new ApiError('texts deve ser um array não vazio', 400)
      }

      if (texts.length > 10) {
        throw new ApiError('Máximo 10 textos por lote', 400)
      }

      if (!fromLanguage || !['pt', 'en'].includes(fromLanguage)) {
        throw new ApiError('fromLanguage deve ser "pt" ou "en"', 400)
      }

      if (!toLanguage || !['pt', 'en'].includes(toLanguage)) {
        throw new ApiError('toLanguage deve ser "pt" ou "en"', 400)
      }

      // Validate each text
      for (const text of texts) {
        if (!text || typeof text !== 'string' || text.length > 1000) {
          throw new ApiError('Cada texto deve ser uma string com máximo 1000 caracteres', 400)
        }
      }

      // Process translations
      const results = await Promise.all(
        texts.map(async (text: string) => {
          try {
            return await translationService.translateText({
              text: text.trim(),
              fromLanguage,
              toLanguage,
              userId: req.userId
            })
          } catch (error) {
            logger.error(`Erro ao traduzir texto em lote: ${text}`, error)
            return {
              originalText: text,
              translatedText: text,
              fromLanguage,
              toLanguage,
              confidence: 0.0,
              error: 'Falha na tradução'
            }
          }
        })
      )

      res.json({
        success: true,
        data: {
          translations: results,
          total: results.length,
          successful: results.filter(r => !('error' in r)).length
        }
      })

    } catch (error) {
      next(error)
    }
  }

  // GET /api/translation/cache/stats (Admin only)
  async getCacheStats(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Add admin middleware check
      const stats = translationService.getCacheStats()
      
      res.json({
        success: true,
        data: stats
      })

    } catch (error) {
      next(error)
    }
  }

  // DELETE /api/translation/cache (Admin only)
  async clearCache(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Add admin middleware check
      translationService.clearCache()
      
      res.json({
        success: true,
        message: 'Cache de traduções limpo com sucesso'
      })

    } catch (error) {
      next(error)
    }
  }
}

export const translationController = new TranslationController()