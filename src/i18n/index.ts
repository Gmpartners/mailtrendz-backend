// Main exports
export { default as i18n, t, getLanguageFromHeader, isLanguageSupported, supportedLanguages, defaultLanguage, translationCache } from './config'

export { 
  i18nMiddleware, 
  i18nErrorHandler,
  sendSuccessResponse,
  sendErrorResponse,
  sendValidationError 
} from './middleware'

export type { Language } from './config'

// Utility functions for common use cases
export const createTranslatedError = (translationKey: string, options?: any, statusCode = 400) => {
  const error = new Error() as any
  error.translationKey = translationKey
  error.translationOptions = options
  error.statusCode = statusCode
  error.name = 'TranslatedError'
  return error
}

export const createValidationError = (field: string, type: string, options?: any) => {
  return createTranslatedError(`errors.validation.${type}`, { field, ...options }, 400)
}

export const createAuthError = (type: string, options?: any) => {
  const statusCode = type === 'insufficientPermissions' ? 403 : 401
  return createTranslatedError(`errors.auth.${type}`, options, statusCode)
}

export const createProjectError = (type: string, options?: any) => {
  const statusCode = type === 'notFound' ? 404 : 400
  return createTranslatedError(`errors.project.${type}`, options, statusCode)
}

export const createSubscriptionError = (type: string, options?: any) => {
  const statusCode = type === 'notFound' ? 404 : 400
  return createTranslatedError(`errors.subscription.${type}`, options, statusCode)
}