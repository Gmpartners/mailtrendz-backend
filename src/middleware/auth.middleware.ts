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

    // ✅ LOG DETALHADO PARA DEBUG
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

    // ✅ VALIDAR TOKEN COM SUPABASE COM TIMEOUT
    logger.info('🔍 [AUTH] Validating token with Supabase...')
    
    const authPromise = supabase.auth.getUser(token)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Supabase auth timeout')), 10000) // 10s timeout
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

    // ✅ BUSCAR PROFILE COM FALLBACK
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

        // ✅ CRIAR PROFILE SE NÃO EXISTIR
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
          // Continuar com subscription padrão
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
      // Usar valores padrão se falhar
      profile = { subscription: 'free' }
    }

    // ✅ DEFINIR USER NO REQUEST
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

export const requireSubscription = (requiredLevel: 'pro' | 'enterprise') => {
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
      pro: 1,
      enterprise: 2
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

// ✅ MELHORADO: Check API limits mais permissivo em desenvolvimento
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

    // ✅ PULAR VERIFICAÇÃO EM DESENVOLVIMENTO
    if (process.env.NODE_ENV === 'development') {
      logger.info('🚀 [AUTH] Skipping API limits in development mode')
      next()
      return
    }

    const { data: canMakeRequest, error } = await supabase
      .rpc('check_api_limit', { p_user_id: req.user.id })

    if (error) {
      logger.error('❌ [AUTH] API limit check error:', error)
      // Em caso de erro, permitir a requisição
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
    // Em caso de erro, permitir a requisição para não quebrar o sistema
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
  checkAPILimits,
  adminOnly
}