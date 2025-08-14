import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth.types'
import subscriptionService from '../services/subscription.service'
import { supabase } from '../config/supabase.config'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'

/**
 * Middleware para verificar créditos de IA - Sistema Unificado
 */
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

    // Usar sistema unificado para verificação
    const hasCredits = await subscriptionService.hasCredits(req.user.id, 1)

    if (!hasCredits) {
      const usageInfo = await subscriptionService.getUsageInfo(req.user.id)
      const upgradeInfo = await subscriptionService.getUpgradeInfo(req.user.id, 'credits')
      
      // Mensagens específicas para diferentes cenários
      let message = 'Créditos de IA esgotados'
      let errorCode = 'NO_CREDITS'
      
      if (usageInfo?.billing.daysUntilReset === 0) {
        message = 'Você já utilizou suas requisições gratuitas! Faça upgrade para continuar criando emails incríveis.'
        errorCode = 'FREE_LIMIT_REACHED'
      }
      
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message,
        error: {
          code: errorCode,
          details: {
            available: usageInfo?.usage.available || 0,
            used: usageInfo?.usage.used || 0,
            total: usageInfo?.usage.total || 0,
            resetAt: usageInfo?.billing.currentPeriodEnd,
            plan: req.user.subscription,
            isLifetimeFree: usageInfo?.billing.daysUntilReset === 0
          },
          upgradeInfo
        }
      })
      return
    }

    next()
  } catch (error: any) {
    logger.error('[Credits Middleware] Credits check error:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao verificar créditos'
    })
  }
}

/**
 * Middleware para consumir crédito de IA após sucesso - Sistema Unificado
 */
export const consumeAICredit = (operation: string = 'ai_generation') => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const originalJson = res.json

    res.json = function(data: any) {
      if (req.user?.id && res.statusCode < 400 && data?.success) {
        (async () => {
          try {
            const result = await subscriptionService.consumeCredits(req.user!.id, 1, operation)
            
            if (result.success) {
              const usageInfo = await subscriptionService.getUsageInfo(req.user!.id)
              
              if (data.data && usageInfo) {
                data.data.creditsBalance = {
                  available: usageInfo.usage.available,
                  used: usageInfo.usage.used,
                  total: usageInfo.usage.total,
                  unlimited: usageInfo.usage.unlimited,
                  resetAt: usageInfo.billing.currentPeriodEnd,
                  planType: result.planType || 'unknown',
                  isLifetimeFree: result.isLifetimeFree || false
                }
              }
              
              // Alertas específicos para diferentes cenários
              if (result.isLifetimeFree && (result.remaining || 0) <= 1) {
                data.upgradeAlert = {
                  message: `Última requisição gratuita! Faça upgrade para continuar.`,
                  action: 'upgrade_required',
                  urgent: true
                }
              } else if (usageInfo && usageInfo.usage.available <= 5 && usageInfo.usage.available > 0) {
                data.upgradeAlert = {
                  message: `Apenas ${usageInfo.usage.available} créditos restantes!`,
                  action: 'upgrade_recommended'
                }
              }
              
              logger.debug('[Credits Middleware] Credit consumed successfully:', {
                userId: req.user!.id,
                operation,
                remaining: result.remaining || 0,
                planType: result.planType || 'unknown'
              })
            } else {
              logger.warn('[Credits Middleware] Failed to consume credit:', result.error)
            }
          } catch (error) {
            logger.error('[Credits Middleware] Failed to consume credit:', error)
          }
        })()
      }

      return originalJson.call(this, data)
    }

    next()
  }
}

/**
 * Middleware para verificar limite de projetos
 * Compatível com código legado
 */
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

    // Obter contagem atual de projetos
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)

    const currentCount = count || 0
    const canCreate = await subscriptionService.checkProjectLimit(req.user.id, currentCount)
    
    if (!canCreate) {
      const upgradeInfo = await subscriptionService.getUpgradeInfo(req.user.id, 'projects')
      
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
    logger.error('[Credits Middleware] Project limit check error:', error)
    next()
  }
}

// Re-exportar middlewares do subscription.middleware para compatibilidade
export { requireCredits, consumeCredits, requireFeature } from './subscription.middleware'

export default {
  checkAICredits,
  consumeAICredit,
  checkProjectLimit
}
