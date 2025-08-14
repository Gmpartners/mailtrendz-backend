import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 * Middleware para processar payload raw do webhook Stripe
 * O Stripe requer o body raw (Buffer) para validação de assinatura
 */
export const rawBodyParser = (req: Request, _res: Response, next: NextFunction): void => {
  // Este middleware é aplicado antes do express.json()
  // e captura o body raw necessário para validação de assinatura
  
  if (req.path.includes('/webhooks/stripe')) {
    let data = ''
    
    req.setEncoding('utf8')
    
    req.on('data', (chunk) => {
      data += chunk
    })
    
    req.on('end', () => {
      req.body = Buffer.from(data, 'utf8')
      next()
    })
  } else {
    next()
  }
}

/**
 * Middleware para validação básica de webhooks
 * Verifica headers obrigatórios e configuração
 */
export const validateWebhookRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Verificar se é um endpoint de webhook do Stripe
    if (!req.path.includes('/webhooks/stripe')) {
      next()
      return
    }

    // Verificar content-type
    const contentType = req.headers['content-type']
    if (!contentType || !contentType.includes('application/json')) {
      logger.warn('Invalid content-type for webhook', {
        contentType,
        path: req.path,
        method: req.method
      })
      
      res.status(400).json({
        success: false,
        message: 'Invalid content-type. Expected application/json'
      })
      return
    }

    // Verificar se assinatura está presente
    const signature = req.headers['stripe-signature']
    if (!signature) {
      logger.warn('Missing stripe-signature header', {
        path: req.path,
        headers: Object.keys(req.headers)
      })
      
      res.status(400).json({
        success: false,
        message: 'Missing stripe-signature header'
      })
      return
    }

    // Verificar se webhook secret está configurado
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured')
      
      res.status(500).json({
        success: false,
        message: 'Webhook secret not configured'
      })
      return
    }

    // Adicionar informações úteis para logging
    req.webhookInfo = {
      signature: signature as string,
      timestamp: Date.now(),
      userAgent: req.headers['user-agent'] || 'unknown'
    }

    next()

  } catch (error: any) {
    logger.error('Webhook validation middleware error', {
      error: error.message,
      path: req.path
    })
    
    res.status(500).json({
      success: false,
      message: 'Webhook validation failed'
    })
  }
}

/**
 * Middleware para timeout de webhooks
 * Garante que webhooks não fiquem pendentes por muito tempo
 */
export const webhookTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.path.includes('/webhooks/')) {
      next()
      return
    }

    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Webhook request timeout', {
          path: req.path,
          timeoutMs,
          method: req.method
        })
        
        res.status(408).json({
          success: false,
          message: 'Webhook request timeout'
        })
      }
    }, timeoutMs)

    // Limpar timeout quando response for enviado
    res.on('finish', () => {
      clearTimeout(timeout)
    })

    next()
  }
}

/**
 * Middleware para rate limiting específico de webhooks
 * Previne abuso de endpoints de webhook
 */
export const webhookRateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  const requests = new Map<string, { count: number, resetTime: number }>()

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.path.includes('/webhooks/')) {
      next()
      return
    }

    const clientId = req.ip || 'unknown'
    const now = Date.now()
    const windowStart = now - windowMs

    // Limpar entradas antigas
    requests.forEach((value, key) => {
      if (value.resetTime < windowStart) {
        requests.delete(key)
      }
    })

    // Verificar limite para este cliente
    const clientRequests = requests.get(clientId)
    
    if (!clientRequests) {
      requests.set(clientId, { count: 1, resetTime: now + windowMs })
      next()
      return
    }

    if (clientRequests.count >= maxRequests) {
      logger.warn('Webhook rate limit exceeded', {
        clientId,
        count: clientRequests.count,
        maxRequests,
        path: req.path
      })
      
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((clientRequests.resetTime - now) / 1000)
      })
      return
    }

    clientRequests.count++
    next()
  }
}

/**
 * Middleware para logging detalhado de webhooks
 * Registra informações importantes para debugging
 */
export const webhookLogger = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.path.includes('/webhooks/')) {
    next()
    return
  }

  const startTime = Date.now()
  const requestId = req.headers['x-request-id'] || `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Adicionar request ID ao request
  req.requestId = requestId as string

  logger.info('Webhook request received', {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    contentLength: req.headers['content-length'],
    ip: req.ip,
    signature: req.headers['stripe-signature'] ? 'present' : 'missing'
  })

  // Interceptar response
  const originalSend = res.send
  res.send = function(data) {
    const duration = Date.now() - startTime
    
    logger.info('Webhook request completed', {
      requestId,
      statusCode: res.statusCode,
      duration,
      success: res.statusCode < 400
    })

    return originalSend.call(this, data)
  }

  next()
}

/**
 * Middleware para tratamento de erros específicos de webhooks
 */
export const webhookErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (!req.path.includes('/webhooks/')) {
    next(error)
    return
  }

  const requestId = req.requestId || 'unknown'

  logger.error('Webhook error handler', {
    requestId,
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  })

  // Determinar status code baseado no tipo de erro
  let statusCode = 500
  let message = 'Internal webhook error'

  if (error.message.includes('signature validation')) {
    statusCode = 400
    message = 'Invalid webhook signature'
  } else if (error.message.includes('timeout')) {
    statusCode = 408
    message = 'Webhook processing timeout'
  } else if (error.message.includes('rate limit')) {
    statusCode = 429
    message = 'Rate limit exceeded'
  }

  if (!res.headersSent) {
    res.status(statusCode).json({
      success: false,
      message,
      requestId,
      timestamp: new Date().toISOString()
    })
  }
}

// Expandir interface Request para incluir campos customizados
declare global {
  namespace Express {
    interface Request {
      webhookInfo?: {
        signature: string
        timestamp: number
        userAgent: string
      }
      requestId?: string
    }
  }
}