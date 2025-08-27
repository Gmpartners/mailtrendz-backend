import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit'
import { logger } from '../utils/logger'
import { Request, Response } from 'express'

// 🚀 INTELLIGENT RATE LIMITING: Dynamic configuration for optimal performance
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

// 📊 PERFORMANCE METRICS: Track rate limiting effectiveness
interface RateLimitMetrics {
  requests: number
  blocked: number
  resetTime: number
}

const metrics = new Map<string, RateLimitMetrics>()

// 🎯 SMART RATE LIMITING: Context-aware limits
const RATE_LIMIT_TIERS = {
  development: {
    general: { windowMs: 15 * 60 * 1000, max: 2000 },
    auth: { windowMs: 5 * 60 * 1000, max: 100 },
    subscription: { windowMs: 1 * 60 * 1000, max: 200 },
    ai: { windowMs: 1 * 60 * 1000, max: 50 },
    webhooks: { windowMs: 1 * 60 * 1000, max: 500 }
  },
  production: {
    general: { windowMs: 15 * 60 * 1000, max: 200 },
    auth: { windowMs: 5 * 60 * 1000, max: 30 },
    subscription: { windowMs: 1 * 60 * 1000, max: 60 },
    ai: { windowMs: 1 * 60 * 1000, max: 10 },
    webhooks: { windowMs: 1 * 60 * 1000, max: 100 }
  }
}

// 🚀 DYNAMIC RATE LIMITING: Get appropriate limits for current environment
function getRateLimits(tier: keyof typeof RATE_LIMIT_TIERS.production) {
  return isProduction ? RATE_LIMIT_TIERS.production[tier] : RATE_LIMIT_TIERS.development[tier]
}

// 🚀 UNIFIED GENERAL LIMITER: Smart, context-aware rate limiting
export const generalLimiter = createSmartRateLimiter('general', {
  ...getRateLimits('general'),
  message: 'Muitas requisições gerais. Tente novamente em alguns minutos.',
  retryAfter: '15 minutes'
})

// 🎯 SMART RATE LIMITER FACTORY: Creates optimized rate limiters
function createSmartRateLimiter(
  name: string, 
  config: {
    windowMs: number
    max: number
    message: string
    retryAfter: string
  }
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    // 🚀 INTELLIGENT SKIP: Skip non-critical paths in development
    skip: (req) => {
      if (isDevelopment) {
        const skipPaths = ['/health', '/status', '/metrics', '/test-connection', '/debug']
        const shouldSkip = skipPaths.some(path => req.path.includes(path))
        if (shouldSkip) {
          logger.debug(`🚀 [RATE-LIMIT-PERF] Skipping ${name} rate limit for dev path:`, req.path)
        }
        return shouldSkip
      }
      return false
    },
    // 📊 ENHANCED HANDLER: Better logging and metrics
    handler: (req: Request, res: Response) => {
      // Update metrics
      const metric = metrics.get(name) || { requests: 0, blocked: 0, resetTime: Date.now() + config.windowMs }
      metric.blocked++
      metrics.set(name, metric)
      
      logger.warn(`🔥 [RATE-LIMIT-${name.toUpperCase()}] Rate limit exceeded:`, {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent')?.substring(0, 50),
        blocked: metric.blocked,
        windowMs: config.windowMs
      })
      
      res.status(429).json({
        success: false,
        message: config.message,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: config.retryAfter,
          type: name
        }
      })
    },
    // Note: onLimitReached removed for compatibility
  })
}

// 💳 OPTIMIZED: Subscription rate limiter with intelligent user-based limiting
export const subscriptionLimiter = createSmartRateLimiter('subscription', {
  ...getRateLimits('subscription'),
  message: 'Muitas consultas de subscription. Aguarde um momento.',
  retryAfter: '1 minute'
})

// ✅ RATE LIMITER PARA AUTH (AJUSTADO)
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: isDevelopment ? 100 : 50, // Mais relaxado em dev
  message: {
    success: false,
    message: 'Muitas tentativas de autenticação. Tente novamente em alguns minutos.',
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: '5 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não conta requests bem-sucedidos
  handler: (req, res) => {
    logger.warn('⚠️ [RATE_LIMIT] Auth rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    })
    
    res.status(429).json({
      success: false,
      message: 'Muitas tentativas de autenticação. Tente novamente em alguns minutos.',
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: '5 minutes'
      }
    })
  }
})

// ✅ RATE LIMITER PARA AI (gerações de conteúdo)
export const aiGenerationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: isDevelopment ? 20 : 5, // Mais relaxado em dev
  message: {
    success: false,
    message: 'Muitas gerações de IA. Aguarde um momento antes de tentar novamente.',
    error: {
      code: 'AI_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 minute'
    }
  },
  skip: (req) => {
    // SEMPRE pular rate limiting para endpoints de monitoramento
    const skipPaths = ['/health', '/status', '/metrics', '/test-connection']
    return skipPaths.some(path => req.path === path)
  },
  keyGenerator: (req) => {
    const userId = (req as any).user?.id
    return userId ? `ai_gen_${userId}` : `ai_gen_ip_${req.ip}`
  },
  handler: (req, res) => {
    logger.warn('⚠️ [RATE_LIMIT] AI generation rate limit exceeded:', {
      ip: req.ip,
      userId: (req as any).user?.id,
      url: req.url
    })
    
    res.status(429).json({
      success: false,
      message: 'Muitas gerações de IA. Aguarde um momento antes de tentar novamente.',
      error: {
        code: 'AI_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 minute'
      }
    })
  }
})

// ✅ RATE LIMITER PARA WEBHOOKS DO STRIPE
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 webhooks por minuto (Stripe pode enviar vários)
  message: {
    success: false,
    message: 'Webhook rate limit exceeded',
    error: {
      code: 'WEBHOOK_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: false, // Não expor headers para webhooks
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('⚠️ [RATE_LIMIT] Webhook rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      'stripe-signature': req.headers['stripe-signature'] ? 'present' : 'missing'
    })
    
    res.status(429).json({
      success: false,
      message: 'Webhook rate limit exceeded'
    })
  }
})

// ✅ RATE LIMITER PARA UPLOAD DE ARQUIVOS
export const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: isDevelopment ? 50 : 20, // Mais relaxado em dev
  message: {
    success: false,
    message: 'Muitos uploads. Aguarde antes de enviar mais arquivos.',
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      retryAfter: '5 minutes'
    }
  },
  keyGenerator: (req) => {
    const userId = (req as any).user?.id
    return userId ? `upload_${userId}` : `upload_ip_${req.ip}`
  },
  handler: (req, res) => {
    logger.warn('⚠️ [RATE_LIMIT] Upload rate limit exceeded:', {
      ip: req.ip,
      userId: (req as any).user?.id,
      url: req.url
    })
    
    res.status(429).json({
      success: false,
      message: 'Muitos uploads. Aguarde antes de enviar mais arquivos.',
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        retryAfter: '5 minutes'
      }
    })
  }
})

// ✅ MIDDLEWARE PARA DETECTAR REQUISIÇÕES EXCESSIVAS DO MESMO ENDPOINT
export const endpointSpamProtection = (maxRequests: number = 10, windowMs: number = 60000) => {
  // Mais relaxado em desenvolvimento
  if (isDevelopment) {
    maxRequests = maxRequests * 5
  }
  
  const requestCounts = new Map<string, { count: number, resetTime: number }>()
  
  return (req: any, res: any, next: any) => {
    // Skip para health checks
    if (req.path === '/health' || req.path === '/status') {
      next()
      return
    }
    
    const key = `${req.ip}_${req.url}_${req.user?.id || 'anonymous'}`
    const now = Date.now()
    
    // Limpar registros expirados periodicamente
    if (requestCounts.size > 1000) { // Evitar vazamento de memória
      for (const [k, v] of requestCounts.entries()) {
        if (now > v.resetTime) {
          requestCounts.delete(k)
        }
      }
    }
    
    const record = requestCounts.get(key)
    
    if (!record || now > record.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs })
      next()
      return
    }
    
    record.count++
    
    if (record.count > maxRequests) {
      logger.warn('🚨 [SPAM_PROTECTION] Endpoint spam detected:', {
        ip: req.ip,
        url: req.url,
        userId: req.user?.id,
        count: record.count,
        windowMs
      })
      
      res.status(429).json({
        success: false,
        message: 'Muitas requisições para este endpoint. Aguarde um momento.',
        error: {
          code: 'ENDPOINT_SPAM_DETECTED',
          count: record.count,
          maxAllowed: maxRequests
        }
      })
      return
    }
    
    next()
  }
}

// 📊 PERFORMANCE MONITORING: Get rate limiting metrics
export function getRateLimitMetrics() {
  const metricsSnapshot = new Map(metrics)
  return {
    environment: isProduction ? 'production' : 'development',
    metrics: Object.fromEntries(metricsSnapshot),
    timestamp: new Date().toISOString(),
    summary: {
      totalBlocked: Array.from(metricsSnapshot.values()).reduce((sum, m) => sum + m.blocked, 0),
      totalRequests: Array.from(metricsSnapshot.values()).reduce((sum, m) => sum + m.requests, 0),
      activeTypes: metricsSnapshot.size
    }
  }
}

// 🧽 MAINTENANCE: Cleanup old metrics periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, metric] of metrics.entries()) {
    if (now > metric.resetTime) {
      // Reset metrics for expired windows
      metrics.set(key, {
        requests: 0,
        blocked: 0,
        resetTime: now + (15 * 60 * 1000) // 15 minutes from now
      })
    }
  }
  
  logger.debug('🧽 [RATE-LIMIT-PERF] Metrics cleanup completed:', {
    activeMetrics: metrics.size,
    timestamp: new Date().toISOString()
  })
}, 10 * 60 * 1000) // Every 10 minutes

// 🚀 UNIFIED EXPORT: All rate limiters and utilities
export default {
  generalLimiter,
  subscriptionLimiter,
  authLimiter,
  aiGenerationLimiter,
  webhookLimiter,
  uploadLimiter,
  endpointSpamProtection,
  // 📊 Monitoring utilities
  getRateLimitMetrics,
  // 🎯 Configuration helpers
  getRateLimits,
  createSmartRateLimiter
}
