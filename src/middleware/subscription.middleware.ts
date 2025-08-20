import { Response, NextFunction } from 'express'
import subscriptionService from '../services/subscription.service'
import { supabase } from '../config/supabase.config'
import { AuthRequest } from '../types/auth.types'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'

/**
 * Middleware para verificar se o usuário tem créditos disponíveis
 */
export const requireCredits = (amount: number = 1) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
          success: false,
          error: 'Unauthorized' 
        })
        return
      }

      const hasCredits = await subscriptionService.hasCredits(userId, amount)
      
      if (!hasCredits) {
        const usageInfo = await subscriptionService.getUsageInfo(userId)
        const upgradeInfo = await subscriptionService.getUpgradeInfo(userId, 'credits')
        
        res.status(HTTP_STATUS.PAYMENT_REQUIRED).json({
          success: false,
          error: 'insufficient_credits',
          message: 'Créditos insuficientes para esta operação',
          details: {
            required: amount,
            available: usageInfo?.usage.available || 0,
            used: usageInfo?.usage.used || 0,
            total: usageInfo?.usage.total || 0,
            resetIn: usageInfo?.billing.daysUntilReset || 0,
            upgradeInfo
          }
        })
        return
      }

      next()
    } catch (error) {
      logger.error('[Middleware] Error checking credits:', error)
      // Em caso de erro, permitir continuar para não bloquear o usuário
      next()
    }
  }
}

/**
 * Middleware para consumir créditos após operação bem-sucedida
 */
export const consumeCredits = (amount: number = 1) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id
    if (!userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        success: false,
        error: 'Unauthorized' 
      })
      return
    }

    // Interceptar o res.json para consumir créditos apenas em sucesso
    const originalJson = res.json.bind(res)

    res.json = function(data: any) {
      // Só consumir créditos se a resposta for bem-sucedida
      if (res.statusCode < 400 && data?.success !== false) {
        subscriptionService.consumeCredits(userId, amount)
          .then(result => {
            if (result.success) {
              logger.info('[Middleware] Credits consumed:', {
                userId,
                amount,
                remaining: result.remaining
              })

              // Adicionar informações de créditos na resposta
              if (data && typeof data === 'object') {
                data.creditsInfo = {
                  consumed: amount,
                  remaining: result.remaining,
                  unlimited: result.unlimited
                }

                // Alertar se estiver acabando os créditos
                if (!result.unlimited && result.remaining && result.remaining <= 5) {
                  data.creditsWarning = {
                    message: `Apenas ${result.remaining} créditos restantes`,
                    action: 'consider_upgrade'
                  }
                }
              }
            } else {
              logger.warn('[Middleware] Failed to consume credits:', result.error)
            }
          })
          .catch(error => {
            logger.error('[Middleware] Error consuming credits:', error)
          })
      }

      return originalJson(data)
    }

    next()
  }
}

/**
 * Middleware para verificar se usuário pode usar determinada feature
 */
export const requireFeature = (feature: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id
      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
          success: false,
          error: 'Unauthorized' 
        })
        return
      }

      const canUse = await subscriptionService.canUseFeature(userId, feature)
      
      if (!canUse) {
        const usageInfo = await subscriptionService.getUsageInfo(userId)
        const upgradeInfo = await subscriptionService.getUpgradeInfo(userId, 'features')
        
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'feature_not_available',
          message: `Seu plano não inclui ${feature}`,
          details: {
            currentPlan: usageInfo?.planType || 'free',
            requiredFeature: feature,
            upgradeInfo
          }
        })
        return
      }

      next()
    } catch (error) {
      logger.error('[Middleware] Error checking feature:', error)
      // Em caso de erro, bloquear acesso por segurança
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'internal_error',
        message: 'Erro ao verificar permissões'
      })
    }
  }
}

/**
 * ✅ NOVO: Middleware específico para verificar se usuário pode usar IA com análise de imagens
 */
export const requireAIImageAnalysis = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        success: false,
        error: 'Unauthorized' 
      })
      return
    }

    // Verificar se a requisição contém imagens para análise
    const hasImages = req.body?.images?.length > 0 || req.body?.imageUrls?.length > 0
    const hasImageIntents = req.body?.imageIntents?.some((intent: any) => intent.intent === 'analyze')
    
    // Se não há imagens para analisar, prosseguir normalmente
    if (!hasImages && !hasImageIntents) {
      next()
      return
    }

    const canUseAIImages = await subscriptionService.canUseFeature(userId, 'ai_image_analysis')
    
    if (!canUseAIImages) {
      const usageInfo = await subscriptionService.getUsageInfo(userId)
      const upgradeInfo = await subscriptionService.getUpgradeInfo(userId, 'ai_image_analysis')
      
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'ai_image_analysis_not_available',
        message: 'Análise de imagens com IA é uma feature exclusiva dos planos Enterprise e Unlimited',
        details: {
          currentPlan: usageInfo?.planType || 'free',
          requiredFeature: 'ai_image_analysis',
          upgradeInfo
        }
      })
      return
    }

    next()
  } catch (error) {
    logger.error('[Middleware] Error checking AI image analysis permission:', error)
    // Em caso de erro, bloquear por segurança
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'internal_error',
      message: 'Erro ao verificar permissões de análise de imagens'
    })
  }
}

/**
 * Middleware para verificar limite de projetos
 */
export const checkProjectLimit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        success: false,
        error: 'Unauthorized' 
      })
      return
    }

    // Obter contagem atual de projetos do usuário
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const currentCount = count || 0

    const canCreate = await subscriptionService.checkProjectLimit(userId, currentCount)
    
    if (!canCreate) {
      const usageInfo = await subscriptionService.getUsageInfo(userId)
      const upgradeInfo = await subscriptionService.getUpgradeInfo(userId, 'projects')
      
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'project_limit_reached',
        message: 'Limite de projetos atingido',
        details: {
          current: currentCount,
          limit: usageInfo?.features.maxProjects || 3,
          upgradeInfo
        }
      })
      return
    }

    next()
  } catch (error) {
    logger.error('[Middleware] Error checking project limit:', error)
    next()
  }
}

/**
 * Middleware para adicionar informações de assinatura em todas as requisições autenticadas
 */
export const addSubscriptionInfo = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      next()
      return
    }

    const state = await subscriptionService.getState(userId)
    if (state) {
      // Adicionar informações básicas de assinatura ao request
      req.subscription = {
        planType: state.planType,
        creditsAvailable: state.creditsAvailable,
        features: state.features
      }
    }

    next()
  } catch (error) {
    logger.error('[Middleware] Error adding subscription info:', error)
    next()
  }
}

// Aliases para compatibilidade com código existente
export const checkAICredits = requireCredits(1)
export const consumeAICredit = consumeCredits(1)

export default {
  requireCredits,
  consumeCredits,
  requireFeature,
  requireAIImageAnalysis,  // ✅ NOVA FUNÇÃO
  checkProjectLimit,
  addSubscriptionInfo,
  // Compatibilidade
  checkAICredits,
  consumeAICredit
}