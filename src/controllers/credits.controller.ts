import { Request, Response } from 'express'
import { supabase } from '../config/supabase.config'
import { AuthRequest } from '../types/auth.types'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { asyncHandler } from '../middleware/error.middleware'

export const getUserCreditsInfo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id

  try {
    let { data: userInfo, error } = await supabase
      .from('user_subscription_info')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      const planCredits = req.user!.subscription === 'free' ? 3 : 
                         req.user!.subscription === 'starter' ? 10 :
                         req.user!.subscription === 'enterprise' ? 50 : 1000

      const maxProjects = req.user!.subscription === 'free' ? 3 :
                         req.user!.subscription === 'starter' ? 10 :
                         req.user!.subscription === 'enterprise' ? 50 : 1000

      const apiLimit = req.user!.subscription === 'free' ? 50 :
                      req.user!.subscription === 'starter' ? 500 :
                      req.user!.subscription === 'enterprise' ? 5000 : 50000

      const { data: newUserInfo, error: insertError } = await supabase
        .from('user_subscription_info')
        .insert({
          user_id: userId,
          plan_type: req.user!.subscription,
          plan_credits: planCredits,
          credits_used: 0,
          max_projects: maxProjects,
          api_usage_limit: apiLimit
        })
        .select()
        .single()

      if (insertError) {
        logger.error('Error creating user credits info:', insertError)
        throw insertError
      }

      userInfo = newUserInfo
    } else if (error) {
      logger.error('Error fetching user credits info:', error)
      throw error
    }

    const creditsAvailable = userInfo.plan_credits - userInfo.credits_used

    res.json({
      success: true,
      data: {
        planType: userInfo.plan_type,
        planCredits: userInfo.plan_credits,
        creditsUsed: userInfo.credits_used,
        creditsAvailable,
        maxProjects: userInfo.max_projects,
        apiUsageLimit: userInfo.api_usage_limit,
        percentageUsed: Math.round((userInfo.credits_used / userInfo.plan_credits) * 100)
      }
    })

  } catch (error: any) {
    logger.error('Error in getUserCreditsInfo:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao buscar informações de créditos',
      error: error.message
    })
  }
})

export const resetUserCredits = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id

  try {
    const { error } = await supabase
      .from('user_subscription_info')
      .update({ credits_used: 0 })
      .eq('user_id', userId)

    if (error) {
      logger.error('Error resetting user credits:', error)
      throw error
    }

    logger.info('Credits reset for user:', userId)

    res.json({
      success: true,
      message: 'Créditos resetados com sucesso'
    })

  } catch (error: any) {
    logger.error('Error in resetUserCredits:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao resetar créditos',
      error: error.message
    })
  }
})

export const initializeUserPlan = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id
  const { planType } = req.body

  if (!planType || !['free', 'starter', 'enterprise', 'unlimited'].includes(planType)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Tipo de plano inválido'
    })
    return
  }

  try {
    const planCredits = planType === 'free' ? 3 : 
                       planType === 'starter' ? 10 :
                       planType === 'enterprise' ? 50 : 1000

    const maxProjects = planType === 'free' ? 3 :
                       planType === 'starter' ? 10 :
                       planType === 'enterprise' ? 50 : 1000

    const apiLimit = planType === 'free' ? 50 :
                    planType === 'starter' ? 500 :
                    planType === 'enterprise' ? 5000 : 50000

    const { data, error } = await supabase
      .from('user_subscription_info')
      .upsert({
        user_id: userId,
        plan_type: planType,
        plan_credits: planCredits,
        credits_used: 0,
        max_projects: maxProjects,
        api_usage_limit: apiLimit
      })
      .select()
      .single()

    if (error) {
      logger.error('Error initializing user plan:', error)
      throw error
    }

    await supabase
      .from('profiles')
      .update({ subscription: planType })
      .eq('id', userId)

    logger.info('User plan initialized:', { userId, planType })

    res.json({
      success: true,
      message: 'Plano inicializado com sucesso',
      data
    })

  } catch (error: any) {
    logger.error('Error in initializeUserPlan:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao inicializar plano',
      error: error.message
    })
  }
})

export const getSubscriptionStats = asyncHandler(async (_req: Request, res: Response) => {
  try {
    const { data: allUsers, error } = await supabase
      .from('user_subscription_info')
      .select('plan_type')

    if (error) {
      logger.error('Error fetching subscription stats:', error)
      throw error
    }

    interface StatBreakdown {
      plan_type: string
      count: number
    }

    const stats: StatBreakdown[] = []
    const planCounts: { [key: string]: number } = {}

    if (allUsers) {
      allUsers.forEach(user => {
        const planType = user.plan_type || 'free'
        planCounts[planType] = (planCounts[planType] || 0) + 1
      })

      Object.entries(planCounts).forEach(([planType, count]) => {
        stats.push({ plan_type: planType, count })
      })
    }

    const totalUsers = stats.reduce((sum: number, stat: StatBreakdown) => sum + stat.count, 0)

    res.json({
      success: true,
      data: {
        totalUsers,
        breakdown: stats,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    logger.error('Error in getSubscriptionStats:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error.message
    })
  }
})

const CreditsController = {
  getUserCreditsInfo,
  resetUserCredits,
  initializeUserPlan,
  getSubscriptionStats
}

export default CreditsController