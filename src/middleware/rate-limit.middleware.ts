import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'
import { RATE_LIMITS, HTTP_STATUS, ERROR_CODES } from '../utils/constants'
import { logger } from '../utils/logger'

// ✅ DETECÇÃO DE AMBIENTE DE DESENVOLVIMENTO
const isDevelopment = process.env.NODE_ENV !== 'production'

// ✅ Rate limiter geral - EXTREMAMENTE GENEROSO
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMITS.GENERAL.WINDOW_MS,
  max: isDevelopment ? 100000 : RATE_LIMITS.GENERAL.MAX_REQUESTS, // ✅ 100k em dev
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
    // ✅ Pular rate limit para health checks e desenvolvimento
    const isHealthCheck = req.path === '/health' || req.path === '/api/v1/health'
    return isHealthCheck || isDevelopment
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

// ✅ Rate limiter para autenticação - MAIS GENEROSO
export const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.WINDOW_MS,
  max: isDevelopment ? 10000 : RATE_LIMITS.AUTH.MAX_REQUESTS, // ✅ 10k em dev
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
  skip: () => isDevelopment, // ✅ Pular em desenvolvimento
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

// ✅ Rate limiter para IA - EXTREMAMENTE GENEROSO
export const aiLimiter = rateLimit({
  windowMs: RATE_LIMITS.AI.WINDOW_MS,
  max: isDevelopment ? 50000 : RATE_LIMITS.AI.MAX_REQUESTS, // ✅ 50k em dev
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
    // ✅ Pular rate limit para health checks de IA e desenvolvimento
    const isHealthCheck = req.path.includes('/health')
    return isHealthCheck || isDevelopment
  },
  handler: (req: Request, res: Response) => {
    logger.warn('AI rate limit exceeded', {
      userId: (req as any).user?.id,
      ip: req.ip,
      path: req.path
    })
    
    const retryAfter = Math.min(10, Math.ceil(RATE_LIMITS.AI.WINDOW_MS / 1000)) // ✅ Máximo 10s
    res.setHeader('Retry-After', retryAfter)
    
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Muitas requisições para IA. Aguarde um momento.',
      error: { 
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        details: {
          limit: RATE_LIMITS.AI.MAX_REQUESTS,
          windowMs: RATE_LIMITS.AI.WINDOW_MS,
          retryAfter
        }
      }
    })
  }
})

// ✅ Rate limiter para projetos - EXTREMAMENTE GENEROSO
export const projectLimiter = rateLimit({
  windowMs: RATE_LIMITS.PROJECTS.WINDOW_MS,
  max: isDevelopment ? 50000 : RATE_LIMITS.PROJECTS.MAX_REQUESTS, // ✅ 50k em dev
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
  skip: () => isDevelopment, // ✅ Pular em desenvolvimento
  handler: (req: Request, res: Response) => {
    logger.warn('Project rate limit exceeded', {
      userId: (req as any).user?.id,
      ip: req.ip,
      path: req.path,
      method: req.method
    })
    
    const retryAfter = Math.min(5, Math.ceil(RATE_LIMITS.PROJECTS.WINDOW_MS / 1000)) // ✅ Máximo 5s
    res.setHeader('Retry-After', retryAfter)
    
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Muitas operações em projetos. Aguarde um momento.',
      error: { 
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        details: {
          limit: RATE_LIMITS.PROJECTS.MAX_REQUESTS,
          windowMs: RATE_LIMITS.PROJECTS.WINDOW_MS,
          retryAfter
        }
      }
    })
  }
})

// ✅ Rate limiter customizado para diferentes planos - MUITO MAIS GENEROSO
export const createUserBasedLimiter = (
  freeLimit: number,
  proLimit: number,
  enterpriseLimit: number,
  windowMs: number = 60000
) => {
  return rateLimit({
    windowMs,
    max: (req: Request) => {
      if (isDevelopment) return 100000 // ✅ 100k em desenvolvimento
      
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
            retryAfter: Math.min(10, Math.ceil(windowMs / 1000)) // ✅ Máximo 10s
          }
        }
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isDevelopment, // ✅ Pular em desenvolvimento
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
      
      const retryAfter = Math.min(10, Math.ceil(windowMs / 1000)) // ✅ Máximo 10s
      res.setHeader('Retry-After', retryAfter)
      
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Limite de requisições atingido para seu plano.',
        error: { 
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          details: {
            currentPlan: subscription,
            limit: limits[subscription as keyof typeof limits],
            windowMs,
            retryAfter,
            upgradeMessage: subscription === 'free' ? 
              'Faça upgrade para o plano Pro para limites maiores' : 
              undefined
          }
        }
      })
    }
  })
}

// ✅ Rate limiter EXTREMAMENTE GENEROSO para criação de projetos
export const projectCreationLimiter = createUserBasedLimiter(
  1000, // Free: 1000 projetos por minuto (era 100)
  3000, // Pro: 3000 projetos por minuto (era 300) 
  10000, // Enterprise: 10000 projetos por minuto (era 1000)
  60000 // 1 minuto
)

// ✅ Rate limiter EXTREMAMENTE GENEROSO para chat com IA
export const aiChatLimiter = createUserBasedLimiter(
  2000, // Free: 2000 mensagens por minuto (era 200)
  5000, // Pro: 5000 mensagens por minuto (era 500)
  20000, // Enterprise: 20000 mensagens por minuto (era 2000)
  60000 // 1 minuto
)

// ✅ Rate limiter super leve para desenvolvimento
export const developmentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100000, // ✅ 100k requisições por minuto em desenvolvimento
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => {
    // Sempre pular em desenvolvimento se NODE_ENV não for production
    return process.env.NODE_ENV !== 'production'
  }
})

// ✅ BYPASS COMPLETO PARA DESENVOLVIMENTO
export const createDevelopmentBypassLimiter = () => {
  return rateLimit({
    windowMs: 1000, // 1 segundo
    max: 10000, // 10k por segundo
    skip: () => true, // ✅ SEMPRE PULAR
    standardHeaders: false,
    legacyHeaders: false
  })
}

// Aliases para manter compatibilidade com imports antigos
export const rateLimitAI = isDevelopment ? createDevelopmentBypassLimiter() : aiLimiter
export const rateLimitChat = isDevelopment ? createDevelopmentBypassLimiter() : aiChatLimiter
export const rateLimitMiddleware = (type: string) => {
  if (isDevelopment) return createDevelopmentBypassLimiter()
  
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

// ✅ LOG DE CONFIGURAÇÃO
if (isDevelopment) {
  console.log('🚀 [RATE LIMIT] Modo desenvolvimento ativado - Rate limiting extremamente relaxado')
} else {
  console.log('⚡ [RATE LIMIT] Modo produção - Rate limiting generoso mas ativo')
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
  createDevelopmentBypassLimiter,
  rateLimitAI,
  rateLimitChat,
  rateLimitMiddleware
}