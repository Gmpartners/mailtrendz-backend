import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth.types'
import CreditsService from '../services/credits.service'
import StripeService from '../services/stripe.service'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'

export const checkAICredits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Autenticação requerida'
      })
      return
    }

    const hasCredits = await CreditsService.checkCredits(req.user.id)

    if (!hasCredits) {
      const balance = await CreditsService.getCreditsBalance(req.user.id)
      const upgradeInfo = await StripeService.checkUpgradeRequired(req.user.id, 'ai_generation')
      
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Créditos de IA esgotados',
        error: {
          code: 'NO_CREDITS',
          details: {
            available: balance.available,
            used: balance.used,
            total: balance.total,
            resetAt: balance.resetAt,
            plan: req.user.subscription
          },
          upgradeInfo
        }
      })
      return
    }

    next()
  } catch (error: any) {
    logger.error('Credits check error:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao verificar créditos'
    })
  }
}

export const consumeAICredit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const originalJson = res.json

  res.json = function(data: any) {
    if (req.user?.id && res.statusCode < 400 && data?.success) {
      (async () => {
        try {
          const consumed = await CreditsService.consumeCredit(req.user!.id)
          
          if (consumed) {
            const balance = await CreditsService.getCreditsBalance(req.user!.id)
            
            if (data.data) {
              data.data.creditsBalance = {
                available: balance.available,
                used: balance.used,
                total: balance.total,
                unlimited: balance.unlimited,
                resetAt: balance.resetAt
              }
            }
            
            // Verificar se está próximo do limite para mostrar alerta de upgrade
            if (balance.available <= 5 && balance.available > 0) {
              data.upgradeAlert = {
                message: `Apenas ${balance.available} créditos restantes!`,
                action: 'upgrade_recommended'
              }
            }
          }
        } catch (error) {
          logger.error('Failed to consume credit:', error)
        }
      })()
    }

    return originalJson.call(this, data)
  }

  next()
}

export const checkProjectLimit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Autenticação requerida'
      })
      return
    }

    const upgradeInfo = await StripeService.checkUpgradeRequired(req.user.id, 'projects')
    
    if (upgradeInfo.required) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Limite de projetos atingido',
        error: {
          code: 'PROJECT_LIMIT_REACHED',
          upgradeInfo
        }
      })
      return
    }

    next()
  } catch (error: any) {
    logger.error('Project limit check error:', error)
    next()
  }
}

export default {
  checkAICredits,
  consumeAICredit,
  checkProjectLimit
}
