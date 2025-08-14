import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth.types'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { supabaseAdmin } from '../config/supabase.config'
import subscriptionService from '../services/subscription.service'
import authTokenService from '../services/auth-token.service'
import secureDbService from '../services/secure-db.service'

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Tentar obter access token do header Authorization
    const authHeader = req.headers.authorization
    let accessToken = authHeader && authHeader.split(' ')[1]

    // 2. Se não houver no header, tentar refresh automático via cookie
    if (!accessToken) {
      const refreshToken = req.cookies?.refreshToken
      if (refreshToken) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('🔄 [AUTH] No access token, attempting refresh from cookie')
        }
        const tokenPair = await authTokenService.refreshAccessToken(refreshToken)
        
        if (tokenPair) {
          accessToken = tokenPair.accessToken
          // Definir novos cookies
          setCookies(res, tokenPair)
          if (process.env.NODE_ENV === 'development') {
            logger.debug('✅ [AUTH] Token refreshed successfully from cookie')
          }
        }
      }
    }

    if (!accessToken) {
      logger.warn('⚠️ [AUTH] No token provided and refresh failed')
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Token de autenticação não fornecido. Faça login novamente.',
        code: 'AUTH_TOKEN_MISSING',
        details: 'Nenhum token de acesso válido foi encontrado no cabeçalho Authorization ou nos cookies.'
      })
      return
    }

    // 3. Verificar access token
    const tokenPayload = await authTokenService.verifyAccessToken(accessToken)

    if (!tokenPayload) {
      // Tentar refresh automático uma vez
      const refreshToken = req.cookies?.refreshToken
      if (refreshToken) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('🔄 [AUTH] Access token invalid, attempting refresh')
        }
        const tokenPair = await authTokenService.refreshAccessToken(refreshToken)
        
        if (tokenPair) {
          const newTokenPayload = await authTokenService.verifyAccessToken(tokenPair.accessToken)
          if (newTokenPayload) {
            setCookies(res, tokenPair)
            // Continue com o novo token
            const profile = await getProfileWithSubscription(newTokenPayload.userId)
            req.user = createUserObject(newTokenPayload, profile)
            logger.info('✅ [AUTH] User authenticated via refresh:', { userId: newTokenPayload.userId })
            next()
            return
          }
        }
      }
      
      logger.warn('⚠️ [AUTH] Invalid token and refresh failed')
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Token inválido ou expirado. Faça login novamente.',
        code: 'AUTH_TOKEN_INVALID',
        details: 'O token de acesso fornecido não é válido e não foi possível renová-lo automaticamente.'
      })
      return
    }

    // 4. Buscar profile e subscription - com fallback robusto
    let profile = await getProfileWithSubscription(tokenPayload.userId)
    
    // ✅ NOVO: Se profile não existe, tentar inicializar automaticamente
    if (!profile) {
      logger.warn('[AUTH] Profile not found, attempting auto-initialization...', { userId: tokenPayload.userId })
      
      try {
        await secureDbService.initializeNewUser(tokenPayload.userId)
        profile = await getProfileWithSubscription(tokenPayload.userId)
        
        if (profile) {
          logger.info('[AUTH] Profile auto-initialized successfully', { userId: tokenPayload.userId })
        } else {
          // Fallback: criar profile básico
          logger.warn('[AUTH] Creating fallback profile...', { userId: tokenPayload.userId })
          profile = {
            id: tokenPayload.userId,
            email: tokenPayload.email,
            name: tokenPayload.email?.split('@')[0] || 'Usuário',
            subscription: 'starter',
            subscriptionState: null,
            active_organization_id: null,
            api_usage_limit: null,
            avatar: null,
            billing_cycle_day: null,
            preferences: null,
            created_at: null,
            updated_at: null,
            free_requests_limit: null,
            free_requests_used: null,
            is_lifetime_free: null,
            subscription_started_at: null
          }
        }
      } catch (initError) {
        logger.error('[AUTH] Auto-initialization failed:', initError)
        // Usar profile básico como último recurso
        profile = {
          id: tokenPayload.userId,
          email: tokenPayload.email,
          name: tokenPayload.email?.split('@')[0] || 'Usuário',
          subscription: 'starter',
          subscriptionState: null,
          active_organization_id: null,
          api_usage_limit: null,
          avatar: null,
          billing_cycle_day: null,
          preferences: null,
          created_at: null,
          updated_at: null,
          free_requests_limit: null,
          free_requests_used: null,
          is_lifetime_free: null,
          subscription_started_at: null
        }
      }
    }
    
    req.user = createUserObject(tokenPayload, profile)

    if (process.env.NODE_ENV === 'development') {
      logger.debug('✅ [AUTH] User authenticated:', {
        userId: tokenPayload.userId,
        email: tokenPayload.email,
        subscription: profile.subscription
      })
    }

    next()
  } catch (error: any) {
    logger.error('❌ [AUTH] Authentication error:', error)
    
    // Provide better error messages based on error type
    if (error.message?.includes('Profile not found')) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Perfil de usuário não encontrado. Entre em contato com o suporte.',
        code: 'AUTH_PROFILE_NOT_FOUND',
        details: 'O usuário existe mas não tem perfil criado.'
      })
    } else if (error.message?.includes('jwt expired')) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Token expirado. Faça login novamente.',
        code: 'AUTH_TOKEN_EXPIRED',
        details: 'O token JWT fornecido está expirado.'
      })
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno durante autenticação. Tente novamente.',
        code: 'AUTH_INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

// Helper function to get profile with subscription data
async function getProfileWithSubscription(userId: string) {
  // ✅ SEGURO: Usar secureDbService ao invés de bypass direto
  const profile = await secureDbService.getUserProfile(userId)

  if (!profile) {
    throw new Error(`Profile not found for user: ${userId}`)
  }

  // Get subscription state
  const subscriptionState = await subscriptionService.getState(userId)
  
  return {
    ...profile,
    subscriptionState
  }
}

// Helper function to create user object
function createUserObject(tokenPayload: any, profile: any) {
  return {
    id: tokenPayload.userId,
    email: tokenPayload.email,
    name: profile.name,
    subscription: profile.subscription || 'free',
    credits: profile.subscriptionState?.creditsAvailable || 0,
    created_at: profile.created_at || undefined,
    email_verified: true // JWT tokens are only issued for verified users
  }
}

// Helper function to set secure cookies
function setCookies(res: Response, tokenPair: any) {
  // Set refresh token as httpOnly cookie (secure)
  res.cookie('refreshToken', tokenPair.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  })

  // Optionally set access token expiry info
  res.cookie('tokenExpiresAt', Date.now() + (tokenPair.expiresIn * 1000), {
    httpOnly: false, // Frontend can read this for UI
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: tokenPair.expiresIn * 1000,
    path: '/'
  })
}

// Middleware opcional para verificar se o email foi verificado
export const requireEmailVerification = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.email_verified) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Por favor, verifique seu email antes de continuar'
    })
    return
  }
  next()
}

// ✅ CORRIGIDO: Middleware para autenticação via API Key (removido parâmetro next não utilizado)
export const authenticateApiKey = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string

    if (!apiKey) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'API Key não fornecida'
      })
      return
    }

    // ✅ TEMPORÁRIO: API Key não implementada ainda na tabela profiles
    // Retornar não autorizado por enquanto
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Autenticação via API Key não disponível no momento'
    })
    return
  } catch (error: any) {
    logger.error('❌ [AUTH] API Key authentication error:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno durante autenticação'
    })
  }
}

// Middleware para autenticação flexível (Token JWT ou API Key)
export const authenticateFlexible = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization
  const apiKey = req.headers['x-api-key'] as string

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Usar autenticação JWT
    return authenticateToken(req, res, next)
  } else if (apiKey) {
    // Usar autenticação por API Key (sem next pois não implementada)
    return authenticateApiKey(req, res)
  } else {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Credenciais de autenticação não fornecidas'
    })
  }
}

// Middleware para verificar limite de projetos
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

    // Obter limite de projetos baseado no plano
    const planLimits: Record<string, number> = {
      free: 3,
      starter: 50,
      enterprise: 100,
      unlimited: 999999
    }

    const maxProjects = planLimits[req.user.subscription] || 3

    const query = supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)

    const { count, error } = await query

    if (error) {
      logger.error('Error checking project limit:', error)
      next()
      return
    }

    if (count && count >= maxProjects) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: `Limite de ${maxProjects} projetos atingido para o plano ${req.user.subscription}`,
        error: {
          code: 'PROJECT_LIMIT_REACHED',
          currentCount: count,
          limit: maxProjects,
          plan: req.user.subscription
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

// Middleware para verificar recursos/features
export const requireFeature = (feature: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      // Usar o subscription service para verificar features
      const canUse = await subscriptionService.canUseFeature(req.user.id, feature)

      if (!canUse) {
        const featureNames: Record<string, string> = {
          folders: 'Pastas',
          multi_user: 'Multi-usuário',
          html_export: 'Exportação de HTML',
          email_preview: 'Visualização de email'
        }

        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: `Recurso "${featureNames[feature] || feature}" não disponível no seu plano`,
          error: {
            code: 'FEATURE_NOT_AVAILABLE',
            feature: feature,
            currentPlan: req.user.subscription
          }
        })
        return
      }

      next()
    } catch (error: any) {
      logger.error('Feature check error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao verificar permissões'
      })
    }
  }
}

// ✅ NOVO: Middleware para consumir requisições mensais
export const consumeMonthlyRequest = (amount: number = 1) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      // Planos unlimited não têm limite
      if (req.user.subscription === 'unlimited') {
        next()
        return
      }

      // Verificar uso mensal usando subscription service
      const hasCredits = await subscriptionService.hasCredits(req.user.id, amount)
      
      if (!hasCredits) {
        const usageInfo = await subscriptionService.getUsageInfo(req.user.id)
        
        res.status(HTTP_STATUS.PAYMENT_REQUIRED).json({
          success: false,
          message: 'Limite mensal de requisições atingido',
          error: {
            code: 'MONTHLY_LIMIT_REACHED',
            used: usageInfo?.usage.used || 0,
            limit: usageInfo?.usage.total || 0,
            resetDate: usageInfo?.billing.currentPeriodEnd,
            daysUntilReset: usageInfo?.billing.daysUntilReset || 0,
            plan: req.user.subscription
          }
        })
        return
      }

      // Marcar para consumir após sucesso
      req.shouldConsumeRequest = true
      req.requestsToConsume = amount
      next()
    } catch (error: any) {
      logger.error('Monthly request check error:', error)
      // Em caso de erro, permitir a requisição para não prejudicar o usuário
      next()
    }
  }
}

// ✅ NOVO: Função para consumir requisição mensal após sucesso
export const consumeMonthlyRequestAfterSuccess = async (req: AuthRequest): Promise<void> => {
  try {
    if (!req.user || !req.shouldConsumeRequest || req.user.subscription === 'unlimited') {
      return
    }

    const amount = req.requestsToConsume || 1
    const result = await subscriptionService.consumeCredits(req.user.id, amount)

    if (result.success) {
      logger.info('Monthly request consumed successfully:', {
        userId: req.user.id,
        amount,
        subscription: req.user.subscription
      })
    } else {
      logger.warn('Failed to consume monthly request:', {
        userId: req.user.id,
        amount,
        error: result.error
      })
    }
  } catch (error: any) {
    logger.error('Error consuming monthly request after success:', error)
  }
}

// Middleware para consumir créditos (LEGADO - será substituído gradualmente)
export const consumeCredits = (creditsToConsume: number = 1) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      // Planos unlimited não consomem créditos
      if (req.user.subscription === 'unlimited') {
        next()
        return
      }

      // Verificar se tem créditos suficientes usando subscription service
      const hasCredits = await subscriptionService.hasCredits(req.user.id, creditsToConsume)
      
      if (!hasCredits) {
        const usageInfo = await subscriptionService.getUsageInfo(req.user.id)
        
        res.status(HTTP_STATUS.PAYMENT_REQUIRED).json({
          success: false,
          message: 'Créditos insuficientes',
          error: {
            code: 'INSUFFICIENT_CREDITS',
            required: creditsToConsume,
            available: usageInfo?.usage.available || 0,
            plan: req.user.subscription
          }
        })
        return
      }

      // Adicionar informação de créditos a serem consumidos na request
      req.creditsToConsume = creditsToConsume

      // O consumo real será feito após o sucesso da operação
      next()
    } catch (error: any) {
      logger.error('Credits consumption error:', error)
      next()
    }
  }
}

// Função para consumir créditos após sucesso (LEGADO)
export const consumeCreditsAfterSuccess = async (req: AuthRequest): Promise<void> => {
  try {
    if (!req.user || !req.creditsToConsume || req.user.subscription === 'unlimited') {
      return
    }

    // Usar o subscription service
    const result = await subscriptionService.consumeCredits(req.user.id, req.creditsToConsume)
    
    if (result.success) {
      logger.info('Credits consumed successfully:', {
        userId: req.user.id,
        creditsConsumed: req.creditsToConsume,
        remainingCredits: result.remaining
      })
    } else {
      logger.error('Failed to consume credits:', result.error)
    }
  } catch (error: any) {
    logger.error('Error consuming credits:', error)
  }
}

// ✅ SIMPLIFICADO: Middleware para registrar uso da API
export const logAPIUsage = (operation: string, tokensUsed: number = 0) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json

    res.json = function(data: any) {
      if (req.user?.id && res.statusCode < 400) {
        // Execute async operation without awaiting to not block response
        (async () => {
          try {
            await supabaseAdmin
              .from('api_usage_logs')
              .insert({
                user_id: req.user!.id,
                endpoint: operation,
                tokens_used: tokensUsed,
                metadata: {
                  path: req.path,
                  method: req.method,
                  status_code: res.statusCode,
                }
              })

            logger.debug('API usage logged:', {
              userId: req.user!.id,
              endpoint: operation,
              tokens: tokensUsed
            })
          } catch (error) {
            logger.error('Failed to log API usage:', error)
          }
        })()
      }

      return originalJson.call(this, data)
    }

    next()
  }
}
