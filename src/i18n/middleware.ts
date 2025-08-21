import { Request, Response, NextFunction } from 'express'
import { getLanguageFromHeader, isLanguageSupported, Language, defaultLanguage } from './config'

// Extend Express Request type to include language
declare global {
  namespace Express {
    interface Request {
      language?: Language
      t?: (key: string, options?: any) => string
    }
  }
}

/**
 * I18n middleware to detect and set request language
 */
export const i18nMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Try to get language from multiple sources in order of preference
  let language: Language = defaultLanguage

  // 1. Query parameter (?lang=pt)
  if (req.query.lang && typeof req.query.lang === 'string') {
    const queryLang = req.query.lang.toLowerCase()
    if (isLanguageSupported(queryLang)) {
      language = queryLang
    }
  }
  // 2. Header (X-Language)
  else if (req.headers['x-language'] && typeof req.headers['x-language'] === 'string') {
    const headerLang = req.headers['x-language'].toLowerCase()
    if (isLanguageSupported(headerLang)) {
      language = headerLang
    }
  }
  // 3. Accept-Language header
  else if (req.headers['accept-language']) {
    language = getLanguageFromHeader(req.headers['accept-language'])
  }

  // Set language on request object
  req.language = language

  // Set translation function on request object
  req.t = (key: string, options?: any) => {
    const { t } = require('./config')
    return t(key, options, language)
  }

  // Set language header in response
  res.setHeader('Content-Language', language)

  next()
}

/**
 * Error handler with internationalization support
 */
export const i18nErrorHandler = (
  error: any, 
  req: Request, 
  res: Response, 
  _next: NextFunction
): void => {
  const language = req.language || defaultLanguage
  const { t } = require('./config')

  // Default error response
  let statusCode = 500
  let message = t('errors.internalError', {}, language)
  let code = 'INTERNAL_ERROR'

  // Handle different error types
  if (error.name === 'ValidationError') {
    statusCode = 400
    message = t('errors.validation.invalidFormat', { field: error.field }, language)
    code = 'VALIDATION_ERROR'
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401
    message = t('errors.auth.unauthorized', {}, language)
    code = 'UNAUTHORIZED'
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403
    message = t('errors.auth.insufficientPermissions', {}, language)
    code = 'FORBIDDEN'
  } else if (error.name === 'NotFoundError') {
    statusCode = 404
    message = t('errors.notFound', {}, language)
    code = 'NOT_FOUND'
  } else if (error.statusCode) {
    statusCode = error.statusCode
    if (error.translationKey) {
      message = t(error.translationKey, error.translationOptions || {}, language)
    } else if (error.message) {
      message = error.message
    }
  }

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${new Date().toISOString()}] ${error.stack || error}`)
  }

  // Send localized error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        details: error.details 
      })
    },
    language
  })
}

/**
 * Success response helper with internationalization
 */
export const sendSuccessResponse = (
  res: Response,
  data?: any,
  messageKey?: string,
  statusCode = 200
): void => {
  const req = res.req as Request
  const language = req.language || defaultLanguage
  const { t } = require('./config')

  const message = messageKey ? t(messageKey, {}, language) : t('common.success', {}, language)

  res.status(statusCode).json({
    success: true,
    message,
    data,
    language
  })
}

/**
 * Error response helper with internationalization
 */
export const sendErrorResponse = (
  res: Response,
  translationKey: string,
  statusCode = 400,
  translationOptions?: any,
  errorCode?: string
): void => {
  const req = res.req as Request
  const language = req.language || defaultLanguage
  const { t } = require('./config')

  const message = t(translationKey, translationOptions || {}, language)

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode || 'ERROR',
      message
    },
    language
  })
}

/**
 * Validation error helper
 */
export const sendValidationError = (
  res: Response,
  field: string,
  validationType: 'required' | 'invalidFormat' | 'tooShort' | 'tooLong',
  options?: any
): void => {
  const req = res.req as Request
  const language = req.language || defaultLanguage
  const { t } = require('./config')

  const translationKey = `errors.validation.${validationType}`
  const message = t(translationKey, { field, ...options }, language)

  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message,
      field,
      type: validationType
    },
    language
  })
}