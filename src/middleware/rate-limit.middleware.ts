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
    
    // ✅ MELHORIA: Adicionar Retry-After header
    res.setHeader('Retry-After', Math.ceil(RATE_LIMITS.GENERAL.WINDOW_MS / 1000))
    
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
  skipSuccessfulRequests: true,
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
    
    res.setHeader('Retry-After', Math.ceil(RATE_LIMITS.AUTH.WINDOW_MS / 1000))
    
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
    return (req as any).user?.id || req.ip
  },
  handler: (req: Request, res: Response) => {
    logger.warn('AI rate limit exceeded', {
      userId: (req as any).user?.id,
      ip: req.ip,
      path: req.path
    })
    
    res.setHeader('Retry-After', Math.ceil(RATE_LIMITS.AI.WINDOW_MS / 1000))
    
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
    
    res.setHeader('Retry-After', Math.ceil(RATE_LIMITS.PROJECTS.WINDOW_MS / 1000))
    
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
      
      // ✅ MELHORIA: Adicionar Retry-After header
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000))
      
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

// ✅ AJUSTE TEMPORÁRIO: Rate limiter mais generoso para criação de projetos
export const projectCreationLimiter = createUserBasedLimiter(
  50,   // Free: 50 projetos por minuto (era 10)
  150,  // Pro: 150 projetos por minuto (era 30) 
  500,  // Enterprise: 500 projetos por minuto (era 100)
  60000 // 1 minuto
)

// ✅ AJUSTE TEMPORÁRIO: Rate limiter mais generoso para chat com IA
export const aiChatLimiter = createUserBasedLimiter(
  50,   // Free: 50 mensagens por minuto (era 15)
  200,  // Pro: 200 mensagens por minuto (era 50)
  1000, // Enterprise: 1000 mensagens por minuto (era 200)
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