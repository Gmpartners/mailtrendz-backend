import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.model'
import { AuthRequest, JwtTokenPayload } from '../types/auth.types'
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

    // Log da requisição para debug
    console.log('🔐 [AUTH] Nova requisição:', {
      url: req.url,
      method: req.method,
      hasToken: !!token,
      userAgent: req.headers['user-agent']?.substring(0, 100),
      timestamp: new Date().toISOString()
    })

    if (!token) {
      console.log('❌ [AUTH] Token não fornecido')
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Token de acesso requerido',
        error: { code: ERROR_CODES.TOKEN_INVALID }
      })
      return
    }

    // Verificar token JWT
    let decoded: JwtTokenPayload
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtTokenPayload
      console.log('✅ [AUTH] Token válido para usuário:', decoded.userId)
    } catch (jwtError) {
      console.log('❌ [AUTH] Erro JWT:', {
        error: jwtError instanceof Error ? jwtError.constructor.name : 'Unknown',
        message: jwtError instanceof Error ? jwtError.message : 'Unknown error'
      })
      
      if (jwtError instanceof jwt.TokenExpiredError) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Token expirado',
          error: { code: ERROR_CODES.TOKEN_EXPIRED }
        })
        return
      }

      if (jwtError instanceof jwt.JsonWebTokenError) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Token inválido',
          error: { code: ERROR_CODES.TOKEN_INVALID }
        })
        return
      }

      // Outro erro JWT
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Erro no token de acesso',
        error: { code: ERROR_CODES.TOKEN_INVALID }
      })
      return
    }

    // Verificar se usuário ainda existe no banco
    let user
    try {
      console.log('🔍 [AUTH] Buscando usuário no banco:', decoded.userId)
      user = await User.findById(decoded.userId).select('email subscription')
      console.log('📊 [AUTH] Resultado da busca:', {
        userId: decoded.userId,
        found: !!user,
        email: user?.email,
        subscription: user?.subscription
      })
    } catch (dbError) {
      console.error('❌ [AUTH] Erro ao buscar usuário no banco:', {
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        userId: decoded.userId,
        stack: dbError instanceof Error ? dbError.stack : undefined
      })
      
      // Em caso de erro de DB, retornar 500 mas com log específico
      logger.error('Database error during authentication', dbError)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        error: { 
          code: ERROR_CODES.INTERNAL_ERROR,
          details: 'Database connection issue'
        }
      })
      return
    }

    if (!user) {
      console.log('❌ [AUTH] Usuário não encontrado:', decoded.userId)
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Usuário não encontrado',
        error: { code: ERROR_CODES.TOKEN_INVALID }
      })
      return
    }

    // Anexar informações do usuário ao request
    req.user = {
      id: decoded.userId,
      email: user.email,
      subscription: user.subscription
    }

    console.log('✅ [AUTH] Autenticação bem-sucedida:', {
      userId: req.user.id,
      email: req.user.email,
      subscription: req.user.subscription
    })

    next()
  } catch (error) {
    // Capturar qualquer erro não tratado
    console.error('❌ [AUTH] Erro inesperado no middleware:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    })
    
    logger.error('Unexpected authentication error:', error)
    
    // SEMPRE retornar 401 para problemas de auth, nunca 500
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Erro de autenticação',
      error: { 
        code: ERROR_CODES.TOKEN_INVALID,
        details: 'Authentication failed'
      }
    })
  }
}

export const optionalAuth = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtTokenPayload
      const user = await User.findById(decoded.userId).select('email subscription')
      
      if (user) {
        req.user = {
          id: decoded.userId,
          email: user.email,
          subscription: user.subscription
        }
      }
    }

    next()
  } catch (error) {
    // Em caso de erro, continua sem autenticação
    console.log('⚠️ [AUTH] Erro em optionalAuth (continuando):', error instanceof Error ? error.message : 'Unknown')
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

export const requireEmailVerification = async (
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

    const user = await User.findById(req.user.id).select('isEmailVerified')
    
    if (!user || !user.isEmailVerified) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Verificação de email requerida',
        error: { 
          code: ERROR_CODES.EMAIL_NOT_VERIFIED,
          details: {
            message: 'Verifique seu email antes de continuar'
          }
        }
      })
      return
    }

    next()
  } catch (error) {
    logger.error('Email verification check error:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor',
      error: { code: ERROR_CODES.INTERNAL_ERROR }
    })
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

    const user = await User.findById(req.user.id)
    
    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Usuário não encontrado',
        error: { code: ERROR_CODES.TOKEN_INVALID }
      })
      return
    }

    if (!user.canMakeAPIRequest()) {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Limite mensal de API atingido',
        error: { 
          code: ERROR_CODES.API_LIMIT_EXCEEDED,
          details: {
            currentUsage: user.apiUsage.currentMonth,
            limit: user.apiUsage.limit,
            resetDate: user.apiUsage.resetDate,
            subscription: user.subscription
          }
        }
      })
      return
    }

    next()
  } catch (error) {
    logger.error('API limits check error:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor',
      error: { code: ERROR_CODES.INTERNAL_ERROR }
    })
  }
}

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Autenticação requerida',
      error: { code: ERROR_CODES.TOKEN_INVALID }
    })
    return
  }

  // Verificar se é admin (pode implementar lógica específica)
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Acesso de administrador requerido',
      error: { code: ERROR_CODES.INSUFFICIENT_PERMISSIONS }
    })
    return
  }

  next()
}

export default {
  authenticateToken,
  optionalAuth,
  requireSubscription,
  requireEmailVerification,
  checkAPILimits,
  adminOnly
}
