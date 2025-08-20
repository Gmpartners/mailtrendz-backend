import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { asyncHandler } from '../middleware/error.middleware'
import subscriptionService from '../services/subscription.service'

/**
 * Obter informações de créditos e assinatura do usuário
 */
export const getUserCreditsInfo = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id

  try {
    logger.info('[Credits Controller] Getting credits info for user:', userId)

    const usageInfo = await subscriptionService.getUsageInfo(userId)

    if (!usageInfo) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Informações de assinatura não encontradas'
      })
      return
    }

    // ✅ RESPOSTA ADAPTADA PARA FREE VITALÍCIO
    const state = await subscriptionService.getState(userId)

    res.json({
      success: true,
      data: {
        planType: usageInfo.planType,
        planCredits: usageInfo.usage.total,
        creditsUsed: usageInfo.usage.used,
        creditsAvailable: usageInfo.usage.available,
        maxProjects: usageInfo.features.maxProjects,
        percentageUsed: usageInfo.usage.percentage,
        isUnlimited: usageInfo.usage.unlimited,
        resetAt: usageInfo.billing.currentPeriodEnd?.toISOString() || null,
        daysUntilReset: usageInfo.billing.daysUntilReset,
        
        // ✅ INFORMAÇÕES ESPECÍFICAS DO FREE VITALÍCIO
        isLifetimeFree: state?.isLifetimeFree || false,
        freeRequestsUsed: state?.freeRequestsUsed || 0,
        freeRequestsLimit: state?.freeRequestsLimit || 3,
        
        features: {
          hasMultiUser: usageInfo.features.hasMultiUser,
          hasHtmlExport: usageInfo.features.hasHtmlExport,
          hasEmailPreview: usageInfo.features.hasEmailPreview
        },
        billing: {
          status: usageInfo.status,
          cancelAtPeriodEnd: usageInfo.billing.cancelAtPeriodEnd,
          currentPeriodStart: usageInfo.billing.currentPeriodStart?.toISOString(),
          currentPeriodEnd: usageInfo.billing.currentPeriodEnd?.toISOString()
        }
      }
    })

  } catch (error: any) {
    logger.error('[Credits Controller] Error in getUserCreditsInfo:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao buscar informações de créditos',
      error: error.message
    })
  }
})

/**
 * ✅ MÉTODO ATUALIZADO: Consumir créditos com tratamento específico para FREE
 */
export const consumeUserCredits = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id
  const { amount = 1 } = req.body

  if (!amount || amount <= 0 || amount > 100) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Quantidade de créditos inválida'
    })
    return
  }

  try {
    logger.info('[Credits Controller] Consuming credits for user:', { userId, amount })

    const result = await subscriptionService.consumeCredits(userId, amount)

    if (result.success) {
      res.json({
        success: true,
        message: 'Créditos consumidos com sucesso',
        data: {
          consumed: result.consumed || amount,
          remaining: result.remaining,
          totalUsed: result.totalUsed,
          unlimited: result.unlimited,
          isFreePlan: result.isFreePlan,        // ✅ Novo campo
          isLifetimeFree: result.isLifetimeFree // ✅ Novo campo
        }
      })
    } else {
      // ✅ TRATAMENTO ESPECÍFICO PARA FREE ESGOTADO
      if (result.error === 'free_limit_reached') {
        const upgradeInfo = await subscriptionService.getUpgradeInfo(userId, 'credits')
        
        res.status(HTTP_STATUS.PAYMENT_REQUIRED).json({
          success: false,
          message: 'Você já utilizou suas 3 requisições gratuitas',
          error: {
            code: 'FREE_LIMIT_REACHED',
            type: 'lifetime_free_exhausted',
            upgradeInfo,
            used: result.totalUsed,
            limit: 3,
            isPermanent: true // ✅ Indica que não vai renovar
          }
        })
        return
      }

      // Tratamento para outros erros
      const upgradeInfo = await subscriptionService.getUpgradeInfo(userId, 'credits')
      
      res.status(HTTP_STATUS.PAYMENT_REQUIRED).json({
        success: false,
        message: result.error === 'insufficient_credits' 
          ? 'Créditos insuficientes' 
          : 'Erro ao consumir créditos',
        error: {
          code: result.error || 'CONSUME_ERROR',
          upgradeInfo
        }
      })
    }

  } catch (error: any) {
    logger.error('[Credits Controller] Error in consumeUserCredits:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao consumir créditos',
      error: error.message
    })
  }
})

/**
 * Resetar créditos do usuário (útil para testes)
 */
export const resetUserCredits = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id

  try {
    logger.info('[Credits Controller] Resetting credits for user:', userId)

    const success = await subscriptionService.resetMonthlyUsage(userId)

    if (success) {
      res.json({
        success: true,
        message: 'Créditos resetados com sucesso'
      })
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao resetar créditos'
      })
    }

  } catch (error: any) {
    logger.error('[Credits Controller] Error in resetUserCredits:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao resetar créditos',
      error: error.message
    })
  }
})


/**
 * Obter estatísticas de uso
 */
export const getUserUsageStats = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id

  try {
    logger.info('[Credits Controller] Getting usage stats for user:', userId)

    const usageInfo = await subscriptionService.getUsageInfo(userId)

    if (!usageInfo) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Estatísticas de uso não encontradas'
      })
      return
    }

    res.json({
      success: true,
      data: {
        userId,
        planType: usageInfo.planType,
        creditsBalance: {
          available: usageInfo.usage.available,
          used: usageInfo.usage.used,
          total: usageInfo.usage.total,
          unlimited: usageInfo.usage.unlimited
        },
        usagePercentage: usageInfo.usage.percentage,
        features: usageInfo.features,
        billing: usageInfo.billing
      }
    })

  } catch (error: any) {
    logger.error('[Credits Controller] Error in getUserUsageStats:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao buscar estatísticas de uso',
      error: error.message
    })
  }
})

/**
 * Obter estatísticas gerais de assinaturas (admin)
 */
export const getSubscriptionStats = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  try {
    logger.info('[Credits Controller] Getting subscription stats...')

    // Esta funcionalidade pode ser expandida para admins
    res.json({
      success: true,
      data: {
        message: 'Use o dashboard do Stripe para estatísticas detalhadas',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    logger.error('[Credits Controller] Error in getSubscriptionStats:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error.message
    })
  }
})


const CreditsController = {
  getUserCreditsInfo,
  consumeUserCredits,
  resetUserCredits,
  getUserUsageStats,
  getSubscriptionStats
}

export default CreditsController