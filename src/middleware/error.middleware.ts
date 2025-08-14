import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export const performanceLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const { method, url, ip } = req
    const { statusCode } = res
    
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        ip: ip || 'unknown'
      })
    }
  })
  
  next()
}

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  const fnReturn = fn(req, res, next)
  return Promise.resolve(fnReturn).catch(next)
}

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Route ${req.originalUrl} not found`)
  res.status(404)
  next(error)
}

export const errorHandler = (error: any, req: Request, res: Response, _next: NextFunction) => {
  let statusCode = res.statusCode !== 200 ? res.statusCode : 500
  let message = error.message

  if (error.name === 'ValidationError') {
    statusCode = 400
    message = Object.values(error.errors).map((val: any) => val.message).join(', ')
  }

  if (error.code === 11000) {
    statusCode = 400
    message = 'Recurso duplicado encontrado'
  }

  if (error.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Token inválido'
  }

  if (error.name === 'CastError') {
    statusCode = 400
    message = 'ID do recurso inválido'
  }

  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    statusCode = 503
    message = 'Serviço temporariamente indisponível - timeout'
  }

  if (error.message.includes('OpenRouter') || error.message.includes('API')) {
    statusCode = 503
    message = 'Serviço de IA temporariamente indisponível'
  }

  if (process.env.NODE_ENV === 'development' && statusCode === 503) {
    logger.warn('503 error converted to 500 in development', { originalError: error.message })
    statusCode = 500
    message = 'Erro interno do servidor (desenvolvimento)'
  }

  logger.error('Request error:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? {
      stack: error.stack,
      details: error
    } : undefined,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  })
}

export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

export const createNotFoundError = (message: string = 'Resource not found') => {
  return new AppError(message, 404)
}

export const createUnauthorizedError = (message: string = 'Unauthorized access') => {
  return new AppError(message, 401)
}

export const createForbiddenError = (message: string = 'Forbidden access') => {
  return new AppError(message, 403)
}

export const createConflictError = (message: string = 'Conflict error') => {
  return new AppError(message, 409)
}

export const createBadRequestError = (message: string = 'Bad request') => {
  return new AppError(message, 400)
}

export const createInternalServerError = (message: string = 'Internal server error') => {
  return new AppError(message, 500)
}

export const healthCheckMiddleware = (_req: Request, res: Response, next: NextFunction) => {
  const memoryUsage = process.memoryUsage()
  const usedMemory = memoryUsage.heapUsed / memoryUsage.heapTotal

  if (usedMemory > 0.9) {
    logger.warn('High memory usage detected', { usedMemory: Math.round(usedMemory * 100) + '%' })
  }

  res.setHeader('X-System-Health', usedMemory > 0.8 ? 'degraded' : 'healthy')
  res.setHeader('X-Memory-Usage', Math.round(usedMemory * 100) + '%')
  
  next()
}

export const smartRateLimitHandler = (error: any, _req: Request, res: Response, next: NextFunction) => {
  if (error.status === 429) {
    const retryAfter = error.retryAfter || 60

    res.setHeader('Retry-After', retryAfter)
    res.setHeader('X-RateLimit-Limit', error.limit || 100)
    res.setHeader('X-RateLimit-Remaining', 0)
    res.setHeader('X-RateLimit-Reset', Date.now() + (retryAfter * 1000))

    res.status(429).json({
      success: false,
      message: `Muitas requisições. Tente novamente em ${retryAfter} segundos.`,
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
      timestamp: new Date().toISOString()
    })
    return
  }

  next(error)
}

export const timeoutHandler = (timeoutMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          method: req.method,
          url: req.originalUrl,
          timeout: timeoutMs
        })

        res.status(503).json({
          success: false,
          message: 'Requisição expirou - tente novamente',
          error: 'REQUEST_TIMEOUT',
          timeout: timeoutMs,
          timestamp: new Date().toISOString()
        })
      }
    }, timeoutMs)

    res.on('finish', () => clearTimeout(timeout))
    res.on('close', () => clearTimeout(timeout))

    next()
  }
}
