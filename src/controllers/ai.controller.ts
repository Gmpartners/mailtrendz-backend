import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import AIService from '../services/ai.service'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'

class AIController {
  
  generateEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { prompt, type, industry, targetAudience, tone } = req.body
    const userId = req.user!.id

    console.log('🎯 [AI CONTROLLER] Geração de email solicitada:', {
      userId,
      promptLength: prompt?.length || 0,
      type,
      industry,
      tone
    })

    try {
      if (!prompt || !prompt.trim()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Prompt é obrigatório',
          error: 'MISSING_PROMPT'
        })
      }

      const context = {
        userId,
        type: type || 'campaign',
        industry: industry || 'geral',
        targetAudience: targetAudience || 'Geral',
        tone: tone || 'profissional',
        projectName: 'Email Gerado',
        status: 'draft'
      }

      console.log('🤖 [AI CONTROLLER] Chamando AIService.generateEmail...')
      
      const emailContent = await AIService.generateEmail(prompt.trim(), context)

      console.log('✅ [AI CONTROLLER] Email gerado com sucesso')

      res.json({
        success: true,
        message: 'Email gerado com sucesso!',
        data: {
          email: emailContent,
          context
        }
      })

    } catch (error: any) {
      console.error('❌ [AI CONTROLLER] Erro na geração:', error)
      
      if (error.message?.includes('OpenRouter') || error.message?.includes('API')) {
        return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          message: 'Serviço de IA temporariamente indisponível. Tente novamente em alguns minutos.',
          error: 'AI_SERVICE_UNAVAILABLE'
        })
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno ao gerar email: ' + error.message,
        error: 'EMAIL_GENERATION_FAILED'
      })
    }
  })

  improveEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { content, feedback } = req.body
    const userId = req.user!.id

    console.log('🔧 [AI CONTROLLER] Melhoria de email solicitada:', {
      userId,
      feedbackLength: feedback?.length || 0
    })

    try {
      if (!content || !feedback) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Conteúdo e feedback são obrigatórios',
          error: 'MISSING_REQUIRED_FIELDS'
        })
      }

      const context = {
        userId,
        type: 'improvement',
        projectName: 'Melhoria de Email'
      }

      const improvedContent = await AIService.improveEmail(content, feedback, context)

      console.log('✅ [AI CONTROLLER] Email melhorado com sucesso')

      res.json({
        success: true,
        message: 'Email melhorado com sucesso!',
        data: {
          email: improvedContent,
          originalFeedback: feedback
        }
      })

    } catch (error: any) {
      console.error('❌ [AI CONTROLLER] Erro na melhoria:', error)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno ao melhorar email: ' + error.message,
        error: 'EMAIL_IMPROVEMENT_FAILED'
      })
    }
  })

  healthCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const health = await AIService.healthCheck()

      res.json({
        success: true,
        message: 'Health check realizado com sucesso',
        data: health
      })

    } catch (error: any) {
      console.error('❌ [AI CONTROLLER] Erro no health check:', error)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro no health check: ' + error.message,
        error: 'HEALTH_CHECK_FAILED'
      })
    }
  })
}

export default new AIController()
