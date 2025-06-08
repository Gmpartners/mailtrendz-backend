import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { ApiError } from '../types/api.types'
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants'
import { logger } from '../utils/logger'

// Classe customizada para erros da API
export class AppError extends Error implements ApiError {
  public statusCode: number
  public code?: string
  public details?: any
  public isOperational: boolean

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code?: string,
    details?: any
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

// Middleware principal de tratamento de erros
export const errorHandler = (
  error: Error | AppError | mongoose.Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR
  let message = 'Erro interno do servidor'
  let code: string = ERROR_CODES.INTERNAL_ERROR
  let details: any = undefined

  // Log do erro
  logger.error('Error caught by error handler', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: (req as any).user?.id,
    ip: req.ip
  })

  // Tratamento específico por tipo de erro
  if (error instanceof AppError) {
    // Erro customizado da aplicação
    statusCode = error.statusCode
    message = error.message
    code = error.code || ERROR_CODES.INTERNAL_ERROR
    details = error.details
  } else if (error instanceof mongoose.Error.ValidationError) {
    // Erro de validação do Mongoose
    statusCode = HTTP_STATUS.BAD_REQUEST
    message = 'Dados inválidos'
    code = ERROR_CODES.VALIDATION_ERROR
    details = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }))
  } else if (error instanceof mongoose.Error.CastError) {
    // Erro de cast do Mongoose (ex: ObjectId inválido)
    statusCode = HTTP_STATUS.BAD_REQUEST
    message = 'ID inválido'
    code = ERROR_CODES.INVALID_INPUT
    details = {
      field: error.path,
      value: error.value
    }
  } else if ((error as any).code === 11000) {
    // Erro de duplicação no MongoDB (E11000)
    statusCode = HTTP_STATUS.CONFLICT
    message = 'Recurso já existe'
    code = ERROR_CODES.RESOURCE_ALREADY_EXISTS
    
    const field = Object.keys((error as any).keyValue)[0]
    const value = (error as any).keyValue[field]
    details = {
      field,
      value,
      message: `${field} '${value}' já está em uso`
    }
  } else if (error.name === 'JsonWebTokenError') {
    // Erro de JWT inválido
    statusCode = HTTP_STATUS.UNAUTHORIZED
    message = 'Token inválido'
    code = ERROR_CODES.TOKEN_INVALID
  } else if (error.name === 'TokenExpiredError') {
    // Erro de JWT expirado
    statusCode = HTTP_STATUS.UNAUTHORIZED
    message = 'Token expirado'
    code = ERROR_CODES.TOKEN_EXPIRED
  } else if (error.name === 'MulterError') {
    // Erro de upload de arquivo
    statusCode = HTTP_STATUS.BAD_REQUEST
    message = 'Erro no upload do arquivo'
    code = ERROR_CODES.INVALID_INPUT
    details = {
      type: 'file_upload',
      error: error.message
    }
  } else if (error.message.includes('ECONNREFUSED')) {
    // Erro de conexão com serviços externos
    statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE
    message = 'Serviço temporariamente indisponível'
    code = ERROR_CODES.SERVICE_UNAVAILABLE
  } else if (error.message.includes('timeout')) {
    // Erro de timeout
    statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE
    message = 'Tempo limite excedido'
    code = ERROR_CODES.SERVICE_UNAVAILABLE
  }

  // Não expor detalhes internos em produção
  if (process.env.NODE_ENV === 'production' && statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    message = 'Erro interno do servidor'
    details = undefined
  }

  // Resposta de erro padronizada
  const errorResponse = {
    success: false,
    message,
    error: {
      code,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        originalMessage: error.message 
      })
    },
    meta: {
      timestamp: new Date(),
      requestId: req.headers['x-request-id'] || 'unknown',
      path: req.path,
      method: req.method
    }
  }

  res.status(statusCode).json(errorResponse)
}

// Middleware para capturar erros assíncronos
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Middleware para rotas não encontradas
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(
    `Rota ${req.originalUrl} não encontrada`,
    HTTP_STATUS.NOT_FOUND,
    ERROR_CODES.RESOURCE_NOT_FOUND,
    {
      path: req.originalUrl,
      method: req.method
    }
  )
  
  next(error)
}

// Funções utilitárias para criar erros específicos
export const createValidationError = (message: string, details?: any) => {
  return new AppError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, details)
}

export const createNotFoundError = (resource: string = 'Recurso') => {
  return new AppError(
    `${resource} não encontrado`,
    HTTP_STATUS.NOT_FOUND,
    ERROR_CODES.RESOURCE_NOT_FOUND
  )
}

export const createUnauthorizedError = (message: string = 'Não autorizado') => {
  return new AppError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS)
}

export const createForbiddenError = (message: string = 'Acesso negado') => {
  return new AppError(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.INSUFFICIENT_PERMISSIONS)
}

export const createConflictError = (message: string, details?: any) => {
  return new AppError(message, HTTP_STATUS.CONFLICT, ERROR_CODES.RESOURCE_CONFLICT, details)
}

export const createRateLimitError = (details?: any) => {
  return new AppError(
    'Limite de requisições excedido',
    HTTP_STATUS.TOO_MANY_REQUESTS,
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    details
  )
}

export const createAPILimitError = (details?: any) => {
  return new AppError(
    'Limite de API excedido',
    HTTP_STATUS.TOO_MANY_REQUESTS,
    ERROR_CODES.API_LIMIT_EXCEEDED,
    details
  )
}

export const createExternalServiceError = (service: string, originalError?: Error) => {
  return new AppError(
    `Erro no serviço ${service}`,
    HTTP_STATUS.SERVICE_UNAVAILABLE,
    ERROR_CODES.EXTERNAL_SERVICE_ERROR,
    {
      service,
      originalMessage: originalError?.message
    }
  )
}

// Middleware para logs de performance
export const performanceLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const isSlowRequest = duration > 2000 // 2 segundos
    
    if (isSlowRequest) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode,
        userId: (req as any).user?.id
      })
    }
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: (req as any).user?.id,
      ip: req.ip
    })
  })
  
  next()
}

export default {
  AppError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createConflictError,
  createRateLimitError,
  createAPILimitError,
  createExternalServiceError,
  performanceLogger
}
