import { Response, NextFunction } from 'express'
import { supabase } from '../config/supabase.config'
import { AuthRequest } from '../types/auth.types'
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants'
import { logger } from '../utils/logger'

export const authenticateToken = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    logger.info('🔐 [AUTH] Token authentication attempt:', {
      url: req.url,
      method: req.method,
      hasAuthHeader: !!authHeader,
      authHeaderStart: authHeader?.substring(0, 20) + '...',
      hasToken: !!token,
      tokenLength: token?.length,
      tokenStart: token?.substring(0, 20) + '...',
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    })

    if (!token) {
      logger.warn('❌ [AUTH] No token provided', {
        url: req.url,
        ip: req.ip
      })
      
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Token de acesso requerido',
        error: { 
          code: ERROR_CODES.TOKEN_INVALID,
          details: 'Authorization header missing or invalid format'
        }
      })
      return
    }

    logger.info('🔍 [AUTH] Validating token with Supabase...')
    
    const authPromise = supabase.auth.getUser(token)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Supabase auth timeout')), 10000)
    })

    const { data: { user }, error } = await Promise.race([authPromise, timeoutPromise]) as any

    if (error || !user) {
      logger.error('❌ [AUTH] Supabase auth validation failed:', {
        error: error?.message || 'No user returned',
        tokenStart: token.substring(0, 20) + '...',
        url: req.url
      })
      
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Token inválido ou expirado',
        error: { 
          code: ERROR_CODES.TOKEN_INVALID,
          details: error?.message || 'Token validation failed'
        }
      })
      return
    }

    logger.info('✅ [AUTH] Token validated successfully', {
      userId: user.id,
      email: user.email
    })

    let profile
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('subscription, created_at')
        .eq('id', user.id)
        .single()

      if (profileError) {
        logger.warn('⚠️ [AUTH] Profile not found, creating default profile:', {
          userId: user.id,
          email: user.email,
          error: profileError.message
        })

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            subscription: 'free',
            created_at: new Date().toISOString()
          })
          .select('subscription, created_at')
          .single()

        if (createError) {
          logger.error('❌ [AUTH] Failed to create profile:', createError)
          profile = { subscription: 'free' }
        } else {
          profile = newProfile
          logger.info('✅ [AUTH] Profile created successfully:', {
            userId: user.id,
            subscription: profile.subscription
          })
        }
      } else {
        profile = profileData
      }
    } catch (profileError: any) {
      logger.error('❌ [AUTH] Profile query error:', profileError.message)
      profile = { subscription: 'free' }
    }

    req.user = {
      id: user.id,
      email: user.email!,
      subscription: profile?.subscription || 'free'
    }

    logger.info('✅ [AUTH] Authentication successful:', {
      userId: req.user.id,
      email: req.user.email,
      subscription: req.user.subscription,
      url: req.url
    })

    next()
  } catch (error: any) {
    logger.error('❌ [AUTH] Unexpected authentication error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    })
    
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Erro de autenticação',
      error: { 
        code: ERROR_CODES.TOKEN_INVALID,
        details: process.env.NODE_ENV === 'development' ? error.message : 'Authentication failed'
      }
    })
  }
}

export const optionalAuth = async (
  req: AuthRequest, 
  _res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (token) {
      logger.info('🔍 [AUTH] Optional auth - validating token')
      
      const { data: { user } } = await supabase.auth.getUser(token)
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription')
          .eq('id', user.id)
          .single()

        if (profile) {
          req.user = {
            id: user.id,
            email: user.email!,
            subscription: profile.subscription
          }
          
          logger.info('✅ [AUTH] Optional auth successful:', {
            userId: req.user.id,
            email: req.user.email
          })
        }
      }
    }

    next()
  } catch (error: any) {
    logger.warn('⚠️ [AUTH] Optional auth failed (continuing):', error.message)
    next()
  }
}

export const requireSubscription = (requiredLevel: 'starter' | 'enterprise') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Autenticação requerida',
        error: { code: ERROR_CODES.TOKEN_INVALID }
      })
      return
    }

    const subscriptionLevels = {
      free: 0,
      starter: 1,
      enterprise: 2,
      unlimited: 3
    }

    const userLevel = subscriptionLevels[req.user.subscription as keyof typeof subscriptionLevels] || 0
    const requiredSubscriptionLevel = subscriptionLevels[requiredLevel]

    if (userLevel < requiredSubscriptionLevel) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: `Plano ${requiredLevel} ou superior requerido`,
        error: { 
          code: ERROR_CODES.SUBSCRIPTION_REQUIRED,
          details: {
            currentPlan: req.user.subscription,
            requiredPlan: requiredLevel
          }
        }
      })
      return
    }

    next()
  }
}

export const consumeCredits = (creditsToConsume: number = 1) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida',
          error: { code: ERROR_CODES.TOKEN_INVALID }
        })
        return
      }

      // ✅ SEMPRE verificar créditos em produção
      const skipCreditsCheck = process.env.NODE_ENV === 'development' && process.env.SKIP_CREDITS_CHECK === 'true'
      
      if (skipCreditsCheck) {
        logger.info('🚀 [CREDITS] Skipping credit check in development mode (SKIP_CREDITS_CHECK=true)')
        req.creditsToConsume = creditsToConsume
        next()
        return
      }

      const { data: currentUsage, error: usageError } = await supabase
        .from('user_subscription_info')
        .select('credits_used, plan_credits, plan_type')
        .eq('user_id', req.user.id)
        .single()

      if (usageError) {
        logger.error('❌ [CREDITS] Error fetching user credits:', usageError)
        
        // ✅ Se é usuário free sem registro, permitir primeira vez
        if (req.user.subscription === 'free') {
          logger.info('✅ [CREDITS] Free user with no usage record - allowing first use')
          req.creditsToConsume = creditsToConsume
          next()
          return
        }
        
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro ao verificar créditos',
          error: { code: ERROR_CODES.INTERNAL_ERROR }
        })
        return
      }

      const creditsUsed = currentUsage?.credits_used || 0
      const planCredits = currentUsage?.plan_credits || (req.user.subscription === 'free' ? 3 : 10)
      const creditsAvailable = planCredits - creditsUsed

      logger.info('📊 [CREDITS] Credit status:', {
        userId: req.user.id,
        planType: req.user.subscription,
        creditsUsed,
        planCredits,
        creditsAvailable,
        requestedCredits: creditsToConsume
      })

      if (creditsAvailable < creditsToConsume) {
        res.status(HTTP_STATUS.PAYMENT_REQUIRED).json({
          success: false,
          message: 'Créditos insuficientes. Por favor, verifique seu plano ou aguarde o reset mensal.',
          error: { 
            code: ERROR_CODES.INSUFFICIENT_CREDITS,
            details: {
              available: creditsAvailable,
              used: creditsUsed,
              total: planCredits,
              required: creditsToConsume,
              planType: req.user.subscription
            }
          }
        })
        return
      }

      req.creditsToConsume = creditsToConsume
      next()
    } catch (error: any) {
      logger.error('❌ [CREDITS] Error in consume credits middleware:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao processar créditos',
        error: { code: ERROR_CODES.INTERNAL_ERROR }
      })
    }
  }
}

export const checkProjectLimit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Autenticação requerida',
        error: { code: ERROR_CODES.TOKEN_INVALID }
      })
      return
    }

    const { data: canCreateProject, error } = await supabase
      .rpc('check_project_limit', { p_user_id: req.user.id })

    if (error) {
      logger.error('❌ [PROJECT_LIMIT] Error checking project limit:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao verificar limite de projetos',
        error: { code: ERROR_CODES.INTERNAL_ERROR }
      })
      return
    }

    if (!canCreateProject) {
      const { data: limitInfo } = await supabase
        .from('user_subscription_info')
        .select('max_projects, plan_type')
        .eq('user_id', req.user.id)
        .single()

      const { data: projectCount } = await supabase
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('user_id', req.user.id)

      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Limite de projetos atingido',
        error: { 
          code: ERROR_CODES.PROJECT_LIMIT_EXCEEDED,
          details: {
            currentCount: projectCount?.length || 0,
            maxAllowed: limitInfo?.max_projects || 0,
            planType: limitInfo?.plan_type || 'free'
          }
        }
      })
      return
    }

    next()
  } catch (error: any) {
    logger.error('❌ [PROJECT_LIMIT] Error in project limit middleware:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro ao processar limite de projetos',
      error: { code: ERROR_CODES.INTERNAL_ERROR }
    })
  }
}

export const requireFeature = (feature: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida',
          error: { code: ERROR_CODES.TOKEN_INVALID }
        })
        return
      }

      const { data: hasAccess, error } = await supabase
        .rpc('check_feature_access', { 
          p_user_id: req.user.id, 
          p_feature: feature 
        })

      if (error) {
        logger.error('❌ [FEATURE] Error checking feature access:', error)
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro ao verificar acesso à feature',
          error: { code: ERROR_CODES.INTERNAL_ERROR }
        })
        return
      }

      if (!hasAccess) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: `Feature ${feature} não disponível no seu plano`,
          error: { 
            code: ERROR_CODES.FEATURE_NOT_AVAILABLE,
            details: {
              feature,
              currentPlan: req.user.subscription
            }
          }
        })
        return
      }

      next()
    } catch (error: any) {
      logger.error('❌ [FEATURE] Error in feature middleware:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao processar acesso à feature',
        error: { code: ERROR_CODES.INTERNAL_ERROR }
      })
    }
  }
}

// ✅ FUNÇÃO MELHORADA: Consumir créditos após sucesso
export const consumeCreditsAfterSuccess = async (req: AuthRequest): Promise<void> => {
  try {
    if (!req.creditsToConsume || !req.user) {
      return
    }

    // ✅ SEMPRE consumir créditos em produção
    const skipCreditsCheck = process.env.NODE_ENV === 'development' && process.env.SKIP_CREDITS_CHECK === 'true'
    
    if (skipCreditsCheck) {
      logger.info('🚀 [CREDITS] Skipping credit consumption in development mode (SKIP_CREDITS_CHECK=true)')
      return
    }

    const { data, error } = await supabase
      .from('user_subscription_info')
      .select('credits_used, plan_credits, plan_type')
      .eq('user_id', req.user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      logger.info('📊 [CREDITS] Creating initial usage record for user:', req.user.id)
      
      const planCredits = req.user.subscription === 'free' ? 3 : 
                         req.user.subscription === 'starter' ? 10 :
                         req.user.subscription === 'enterprise' ? 50 : 1000
      
      const { error: insertError } = await supabase
        .from('user_subscription_info')
        .insert({
          user_id: req.user.id,
          plan_type: req.user.subscription,
          plan_credits: planCredits,
          credits_used: req.creditsToConsume,
          max_projects: req.user.subscription === 'free' ? 3 : 
                       req.user.subscription === 'starter' ? 10 :
                       req.user.subscription === 'enterprise' ? 50 : 1000,
          api_usage_limit: req.user.subscription === 'free' ? 50 : 
                          req.user.subscription === 'starter' ? 500 :
                          req.user.subscription === 'enterprise' ? 5000 : 50000
        })

      if (insertError) {
        logger.error('❌ [CREDITS] Error creating usage record:', insertError)
      } else {
        logger.info('✅ [CREDITS] Initial usage record created and credits consumed:', {
          userId: req.user.id,
          credits: req.creditsToConsume,
          planType: req.user.subscription
        })
      }
      return
    }

    if (error) {
      logger.error('❌ [CREDITS] Error fetching usage for update:', error)
      return
    }

    const newCreditsUsed = (data.credits_used || 0) + req.creditsToConsume

    const { error: updateError } = await supabase
      .from('user_subscription_info')
      .update({ credits_used: newCreditsUsed })
      .eq('user_id', req.user.id)

    if (updateError) {
      logger.error('❌ [CREDITS] Error updating credits:', updateError)
    } else {
      logger.info('✅ [CREDITS] Credits consumed successfully:', {
        userId: req.user.id,
        credits: req.creditsToConsume,
        newTotal: newCreditsUsed,
        planType: req.user.subscription
      })
    }
  } catch (error: any) {
    logger.error('❌ [CREDITS] Error in consumeCreditsAfterSuccess:', error)
  }
}

export const logAPIUsage = (endpoint: string, tokensUsed: number = 1) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next()
        return
      }

      await supabase.rpc('log_api_usage', {
        p_user_id: req.user.id,
        p_endpoint: endpoint,
        p_tokens_used: tokensUsed,
        p_cost: tokensUsed * 0.001
      })

      logger.info('📊 [API_LOG] Usage logged:', {
        userId: req.user.id,
        endpoint,
        tokensUsed,
        cost: tokensUsed * 0.001
      })

      next()
    } catch (error: any) {
      logger.error('❌ [API_LOG] Error logging API usage:', error)
      next()
    }
  }
}

export const checkAPILimits = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Autenticação requerida',
        error: { code: ERROR_CODES.TOKEN_INVALID }
      })
      return
    }

    const skipLimitsCheck = process.env.NODE_ENV === 'development' && process.env.SKIP_LIMITS_CHECK === 'true'
    
    if (skipLimitsCheck) {
      logger.info('🚀 [AUTH] Skipping API limits in development mode (SKIP_LIMITS_CHECK=true)')
      next()
      return
    }

    const { data: canMakeRequest, error } = await supabase
      .rpc('check_api_limit', { p_user_id: req.user.id })

    if (error) {
      logger.error('❌ [AUTH] API limit check error:', error)
      next()
      return
    }

    if (!canMakeRequest) {
      const { data: usage } = await supabase
        .from('user_api_usage_summary')
        .select('*')
        .eq('user_id', req.user.id)
        .gte('month', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .single()

      const { data: profile } = await supabase
        .from('profiles')
        .select('api_usage_limit')
        .eq('id', req.user.id)
        .single()

      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Limite mensal de API atingido',
        error: { 
          code: ERROR_CODES.API_LIMIT_EXCEEDED,
          details: {
            currentUsage: usage?.request_count || 0,
            limit: profile?.api_usage_limit || 50,
            resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
            subscription: req.user.subscription
          }
        }
      })
      return
    }

    next()
  } catch (error: any) {
    logger.error('❌ [AUTH] API limits check error:', error)
    next()
  }
}

export const adminOnly = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Autenticação requerida',
      error: { code: ERROR_CODES.TOKEN_INVALID }
    })
    return
  }

  try {
    const { data: { user } } = await supabase.auth.admin.getUserById(req.user.id)
    
    if (!user || user.role !== 'service_role') {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Acesso de administrador requerido',
        error: { code: ERROR_CODES.INSUFFICIENT_PERMISSIONS }
      })
      return
    }

    next()
  } catch (error: any) {
    logger.error('❌ [AUTH] Admin check error:', error)
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Erro na verificação de administrador',
      error: { code: ERROR_CODES.INSUFFICIENT_PERMISSIONS }
    })
  }
}

export default {
  authenticateToken,
  optionalAuth,
  requireSubscription,
  consumeCredits,
  checkProjectLimit,
  requireFeature,
  consumeCreditsAfterSuccess,
  logAPIUsage,
  checkAPILimits,
  adminOnly
}