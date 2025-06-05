import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'
import { RATE_LIMITS, HTTP_STATUS, ERROR_CODES } from '../utils/constants'
import { logger } from '../utils/logger'

// Rate limiter geral
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMITS.GENERAL.WINDOW_MS,
  max: RATE_LIMITS.GENERAL.MAX_REQUESTS,
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em alguns minutos.',
    error: { 
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      details: {
        limit: RATE_LIMITS.GENERAL.MAX_REQUESTS,
        windowMs: RATE_LIMITS.GENERAL.WINDOW_MS
      }
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    })
    
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Muitas requisições. Tente novamente em alguns minutos.',
      error: { 
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        details: {
          limit: RATE_LIMITS.GENERAL.MAX_REQUESTS,
          windowMs: RATE_LIMITS.GENERAL.WINDOW_MS,
          retryAfter: Math.ceil(RATE_LIMITS.GENERAL.WINDOW_MS / 1000)
        }
      }
    })
  }
})

// Rate limiter para autenticação
export const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.WINDOW_MS,
  max: RATE_LIMITS.AUTH.MAX_REQUESTS,
  skipSuccessfulRequests: true, // Não contar requests bem-sucedidos
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    error: { 
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      details: {
        limit: RATE_LIMITS.AUTH.MAX_REQUESTS,
        windowMs: RATE_LIMITS.AUTH.WINDOW_MS
      }
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body?.email
    })
    
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      error: { 
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        details: {
          limit: RATE_LIMITS.AUTH.MAX_REQUESTS,
          windowMs: RATE_LIMITS.AUTH.WINDOW_MS,
          retryAfter: Math.ceil(RATE_LIMITS.AUTH.WINDOW_MS / 1000)
        }
      }
    })
  }
})

// Rate limiter para IA
export const aiLimiter = rateLimit({
  windowMs: RATE_LIMITS.AI.WINDOW_MS,
  max: RATE_LIMITS.AI.MAX_REQUESTS,
  message: {
    success: false,
    message: 'Muitas requisições para IA. Aguarde um momento.',
    error: { 
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      details: {
        limit: RATE_LIMITS.AI.MAX_REQUESTS,
        windowMs: RATE_LIMITS.AI.WINDOW_MS
      }
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit por usuário autenticado ou IP
    return (req as any).user?.id || req.ip
  },
  handler: (req: Request, res: Response) => {
    logger.warn('AI rate limit exceeded', {
      userId: (req as any).user?.id,
      ip: req.ip,
      path: req.path
    })
    
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Muitas requisições para IA. Aguarde um momento.',
      error: { 
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        details: {
          limit: RATE_LIMITS.AI.MAX_REQUESTS,
          windowMs: RATE_LIMITS.AI.WINDOW_MS,
          retryAfter: Math.ceil(RATE_LIMITS.AI.WINDOW_MS / 1000)
        }
      }
    })
  }
})

// Rate limiter para projetos
export const projectLimiter = rateLimit({
  windowMs: RATE_LIMITS.PROJECTS.WINDOW_MS,
  max: RATE_LIMITS.PROJECTS.MAX_REQUESTS,
  message: {
    success: false,
    message: 'Muitas operações em projetos. Aguarde um momento.',
    error: { 
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      details: {
        limit: RATE_LIMITS.PROJECTS.MAX_REQUESTS,
        windowMs: RATE_LIMITS.PROJECTS.WINDOW_MS
      }
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Project rate limit exceeded', {
      userId: (req as any).user?.id,
      ip: req.ip,
      path: req.path,
      method: req.method
    })
    
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Muitas operações em projetos. Aguarde um momento.',
      error: { 
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        details: {
          limit: RATE_LIMITS.PROJECTS.MAX_REQUESTS,
          windowMs: RATE_LIMITS.PROJECTS.WINDOW_MS,
          retryAfter: Math.ceil(RATE_LIMITS.PROJECTS.WINDOW_MS / 1000)
        }
      }
    })
  }
})

// Rate limiter customizado para diferentes planos
export const createUserBasedLimiter = (
  freeLimit: number,
  proLimit: number,
  enterpriseLimit: number,
  windowMs: number = 60000
) => {
  return rateLimit({
    windowMs,
    max: (req: Request) => {
      const subscription = (req as any).user?.subscription || 'free'
      
      switch (subscription) {
        case 'enterprise':
          return enterpriseLimit
        case 'pro':
          return proLimit
        case 'free':
        default:
          return freeLimit
      }
    },
    keyGenerator: (req: Request) => {
      return (req as any).user?.id || req.ip
    },
    message: (req: Request) => {
      const subscription = (req as any).user?.subscription || 'free'
      const limits = {
        free: freeLimit,
        pro: proLimit,
        enterprise: enterpriseLimit
      }
      
      return {
        success: false,
        message: 'Limite de requisições atingido para seu plano.',
        error: { 
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          details: {
            currentPlan: subscription,
            limit: limits[subscription as keyof typeof limits],
            windowMs,
            retryAfter: Math.ceil(windowMs / 1000)
          }
        }
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const subscription = (req as any).user?.subscription || 'free'
      
      logger.warn('User-based rate limit exceeded', {
        userId: (req as any).user?.id,
        subscription,
        ip: req.ip,
        path: req.path
      })
      
      const limits = {
        free: freeLimit,
        pro: proLimit,
        enterprise: enterpriseLimit
      }
      
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Limite de requisições atingido para seu plano.',
        error: { 
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          details: {
            currentPlan: subscription,
            limit: limits[subscription as keyof typeof limits],
            windowMs,
            retryAfter: Math.ceil(windowMs / 1000),
            upgradeMessage: subscription === 'free' ? 
              'Faça upgrade para o plano Pro para limites maiores' : 
              undefined
          }
        }
      })
    }
  })
}

// Rate limiter específico para criação de projetos
export const projectCreationLimiter = createUserBasedLimiter(
  2,   // Free: 2 projetos por minuto
  10,  // Pro: 10 projetos por minuto
  50,  // Enterprise: 50 projetos por minuto
  60000 // 1 minuto
)

// Rate limiter específico para chat com IA
export const aiChatLimiter = createUserBasedLimiter(
  5,   // Free: 5 mensagens por minuto
  20,  // Pro: 20 mensagens por minuto
  100, // Enterprise: 100 mensagens por minuto
  60000 // 1 minuto
)

export default {
  generalLimiter,
  authLimiter,
  aiLimiter,
  projectLimiter,
  projectCreationLimiter,
  aiChatLimiter,
  createUserBasedLimiter
}