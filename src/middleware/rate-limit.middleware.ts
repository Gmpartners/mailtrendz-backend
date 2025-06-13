import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'
import { RATE_LIMITS, HTTP_STATUS, ERROR_CODES } from '../utils/constants'
import { logger } from '../utils/logger'

// Rate limiter geral - MUITO MAIS GENEROSO
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
  skip: (req) => {
    // Pular rate limit para health checks
    return req.path === '/health' || req.path === '/api/v1/health'
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    })
    
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

// Rate limiter para autenticação - MAIS GENEROSO
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

// Rate limiter para IA - MUITO MAIS GENEROSO
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
  skip: (req) => {
    // Pular rate limit para health checks de IA
    return req.path.includes('/health')
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

// Rate limiter para projetos - MUITO MAIS GENEROSO
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

// Rate limiter customizado para diferentes planos - MAIS GENEROSO
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

// Rate limiter MUITO GENEROSO para criação de projetos
export const projectCreationLimiter = createUserBasedLimiter(
  100,  // Free: 100 projetos por minuto (era 50)
  300,  // Pro: 300 projetos por minuto (era 150) 
  1000, // Enterprise: 1000 projetos por minuto (era 500)
  60000 // 1 minuto
)

// Rate limiter MUITO GENEROSO para chat com IA
export const aiChatLimiter = createUserBasedLimiter(
  200,  // Free: 200 mensagens por minuto (era 50)
  500,  // Pro: 500 mensagens por minuto (era 200)
  2000, // Enterprise: 2000 mensagens por minuto (era 1000)
  60000 // 1 minuto
)

// Rate limiter super leve para desenvolvimento
export const developmentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5000, // 5000 requisições por minuto
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => {
    // Sempre pular em desenvolvimento se NODE_ENV não for production
    return process.env.NODE_ENV !== 'production'
  }
})

// Aliases para manter compatibilidade com imports antigos
export const rateLimitAI = aiLimiter
export const rateLimitChat = aiChatLimiter
export const rateLimitMiddleware = (type: string) => {
  switch (type.toUpperCase()) {
    case 'AI':
      return aiLimiter
    case 'CHAT':
      return aiChatLimiter
    case 'PROJECT':
      return projectLimiter
    case 'AUTH':
      return authLimiter
    default:
      return generalLimiter
  }
}

export default {
  generalLimiter,
  authLimiter,
  aiLimiter,
  projectLimiter,
  projectCreationLimiter,
  aiChatLimiter,
  developmentLimiter,
  createUserBasedLimiter,
  rateLimitAI,
  rateLimitChat,
  rateLimitMiddleware
}
