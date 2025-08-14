import rateLimit from 'express-rate-limit'
import { logger } from '../utils/logger'

// Configuração mais relaxada para desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development'

// ✅ RATE LIMITER GERAL (ajustado para dev)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isDevelopment ? 1000 : 100, // Muito mais relaxado em dev
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em alguns minutos.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting para health checks e status em desenvolvimento
    if (isDevelopment) {
      const skipPaths = ['/health', '/status', '/metrics', '/test-connection']
      return skipPaths.some(path => req.path.includes(path))
    }
    return false
  },
  handler: (req, res) => {
    logger.warn('⚠️ [RATE_LIMIT] General rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    })
    
    res.status(429).json({
      success: false,
      message: 'Muitas requisições. Tente novamente em alguns minutos.',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes'
      }
    })
  }
})

// ✅ RATE LIMITER ESPECÍFICO PARA SUBSCRIPTION (AJUSTADO)
export const subscriptionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: isDevelopment ? 100 : 30, // Mais relaxado em dev
  message: {
    success: false,
    message: 'Muitas consultas de subscription. Aguarde um momento.',
    error: {
      code: 'SUBSCRIPTION_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 minute'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
  skip: (req) => {
    // Skip para health checks
    return req.path === '/health' || req.path === '/current'
  },
  keyGenerator: (req) => {
    // ✅ USAR IP + USER ID se autenticado para limites mais precisos
    const userId = (req as any).user?.id
    return userId ? `subscription_${userId}` : `subscription_ip_${req.ip}`
  },
  handler: (req, res) => {
    logger.warn('⚠️ [RATE_LIMIT] Subscription rate limit exceeded:', {
      ip: req.ip,
      userId: (req as any).user?.id,
      url: req.url,
      userAgent: req.get('User-Agent')
    })
    
    res.status(429).json({
      success: false,
      message: 'Muitas consultas de subscription. Aguarde um momento.',
      error: {
        code: 'SUBSCRIPTION_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 minute'
      }
    })
  }
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

export default {
  generalLimiter,
  subscriptionLimiter,
  authLimiter,
  aiGenerationLimiter,
  webhookLimiter,
  uploadLimiter,
  endpointSpamProtection
}
