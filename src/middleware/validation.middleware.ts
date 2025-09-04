import { body, query, param, validationResult, FieldValidationError } from 'express-validator'
import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth.types'
import { HTTP_STATUS, ERROR_CODES, VALIDATION, PROJECT_TYPES } from '../utils/constants'

export const handleValidationErrors = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    console.log('❌ Erro de validação:', {
      body: req.body,
      errors: errors.array(),
      url: req.url,
      method: req.method,
      hasUserContext: !!req.user,
      timestamp: new Date().toISOString()
    })
    
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Dados de entrada inválidos',
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        details: errors.array().map(error => {
          const fieldError = error as FieldValidationError
          return {
            field: fieldError.path || 'unknown',
            message: fieldError.msg,
            value: fieldError.value
          }
        })
      }
    })
    return
  }
  
  next()
}

export const validateRegister = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Nome deve conter apenas letras e espaços'),
  
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome completo deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Nome completo deve conter apenas letras e espaços'),
  
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email muito longo'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres'),
  
  body('confirmPassword')
    .optional()
    .custom((value, { req }) => {
      if (value && value !== req.body.password) {
        throw new Error('Confirmação de senha não confere')
      }
      return true
    }),
  
  body()
    .custom((_value, { req }) => {
      const { name, fullName } = req.body
      if (!name && !fullName) {
        throw new Error('Nome ou nome completo é obrigatório')
      }
      return true
    }),
  
  handleValidationErrors
]

export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
  
  handleValidationErrors
]

export const validatePasswordReset = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  handleValidationErrors
]

export const validatePasswordUpdate = [
  body('token')
    .notEmpty()
    .withMessage('Token é obrigatório'),
  
  body('newPassword')
    .isLength({ min: VALIDATION.PASSWORD.MIN_LENGTH })
    .withMessage(`Nova senha deve ter pelo menos ${VALIDATION.PASSWORD.MIN_LENGTH} caracteres`)
    .matches(/(?=.*[a-z])/)
    .withMessage('Nova senha deve conter pelo menos uma letra minúscula')
    .matches(/(?=.*[A-Z])/)
    .withMessage('Nova senha deve conter pelo menos uma letra maiúscula')
    .matches(/(?=.*\d)/)
    .withMessage('Nova senha deve conter pelo menos um número'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Confirmação de senha não confere')
      }
      return true
    }),
  
  handleValidationErrors
]

export const validateCreateProject = [
  body('prompt')
    .trim()
    .isLength({ min: VALIDATION.PROJECT.PROMPT_MIN_LENGTH, max: VALIDATION.PROJECT.PROMPT_MAX_LENGTH })
    .withMessage(`Prompt deve ter entre ${VALIDATION.PROJECT.PROMPT_MIN_LENGTH} e ${VALIDATION.PROJECT.PROMPT_MAX_LENGTH} caracteres`),
  
  body('type')
    .optional()
    .default('campaign')
    .isIn(Object.values(PROJECT_TYPES))
    .withMessage('Tipo de projeto inválido'),
  
  body('industry')
    .optional()
    .default('geral')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Indústria deve ter no máximo 50 caracteres'),
  
  body('targetAudience')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Público-alvo deve ter no máximo 100 caracteres'),
  
  body('tone')
    .optional()
    .default('profissional')
    .trim()
    .isLength({ max: 30 })
    .withMessage('Tom deve ter no máximo 30 caracteres'),
  
  handleValidationErrors
]

export const validateUpdateProject = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: VALIDATION.PROJECT.NAME_MAX_LENGTH })
    .withMessage(`Nome deve ter entre 1 e ${VALIDATION.PROJECT.NAME_MAX_LENGTH} caracteres`),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: VALIDATION.PROJECT.DESCRIPTION_MAX_LENGTH })
    .withMessage(`Descrição deve ter no máximo ${VALIDATION.PROJECT.DESCRIPTION_MAX_LENGTH} caracteres`),
  
  body('type')
    .optional()
    .isIn(Object.values(PROJECT_TYPES))
    .withMessage('Tipo de projeto inválido'),
  
  body('status')
    .optional()
    .isIn(['draft', 'active', 'completed'])
    .withMessage('Status inválido'),
  
  body('content.subject')
    .optional()
    .trim()
    .isLength({ min: 0, max: 100 })
    .withMessage('Assunto deve ter no máximo 100 caracteres'),
  
  body('content.html')
    .optional()
    .isLength({ min: 0 })
    .withMessage('Conteúdo HTML inválido'),
  
  body('content.text')
    .optional()
    .isLength({ min: 0 })
    .withMessage('Conteúdo texto inválido'),
  
  body('content.previewText')
    .optional()
    .trim()
    .isLength({ min: 0, max: 200 })
    .withMessage('Preview text deve ter no máximo 200 caracteres'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags devem ser um array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Cada tag deve ter no máximo 30 caracteres'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic deve ser verdadeiro ou falso'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata deve ser um objeto'),
  
  handleValidationErrors
]

export const validateImproveEmail = [
  body('feedback')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Feedback deve ter entre 10 e 1000 caracteres'),
  
  handleValidationErrors
]

export const validateSendMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: VALIDATION.CHAT.MESSAGE_MAX_LENGTH })
    .withMessage(`Mensagem deve ter entre 1 e ${VALIDATION.CHAT.MESSAGE_MAX_LENGTH} caracteres`),
  
  body('type')
    .optional()
    .isIn(['user', 'system'])
    .withMessage('Tipo de mensagem inválido'),
  
  handleValidationErrors
]

export const validateUpdateChat = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: VALIDATION.CHAT.TITLE_MAX_LENGTH })
    .withMessage(`Título deve ter entre 1 e ${VALIDATION.CHAT.TITLE_MAX_LENGTH} caracteres`),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive deve ser verdadeiro ou falso'),
  
  handleValidationErrors
]

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100'),
  
  query('sortBy')
    .optional()
    .isIn(['created_at', 'updated_at', 'name', 'type', 'status', 'last_edited'])
    .withMessage('Campo de ordenação inválido'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Ordem deve ser asc ou desc'),
  
  handleValidationErrors
]

export const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Busca deve ter entre 1 e 100 caracteres'),
  
  query('type')
    .optional()
    .isIn([...Object.values(PROJECT_TYPES), 'all'])
    .withMessage('Tipo de filtro inválido'),
  
  query('category')
    .optional()
    .isIn(['all', 'recent', 'completed', 'draft'])
    .withMessage('Categoria inválida'),
  
  query('status')
    .optional()
    .isIn(['draft', 'active', 'completed'])
    .withMessage('Status inválido'),
  
  handleValidationErrors
]

export const validateObjectId = (paramName: string = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} deve ser um UUID válido`),
  
  handleValidationErrors
]

export const modifyEmailValidation = [
  body('project_id')
    .notEmpty()
    .withMessage('ID do projeto é obrigatório')
    .isUUID()
    .withMessage('ID do projeto deve ser um UUID válido'),
  
  body('instructions')
    .trim()
    .notEmpty()
    .withMessage('Instruções são obrigatórias')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Instruções devem ter entre 10 e 1000 caracteres'),
  
  body('preserve_structure')
    .optional()
    .isBoolean()
    .withMessage('preserve_structure deve ser um booleano'),
  
  handleValidationErrors
]

export const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Nome deve conter apenas letras e espaços'),
  
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar deve ser uma URL válida'),
  
  body('preferences.defaultIndustry')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Indústria padrão deve ter no máximo 50 caracteres'),
  
  body('preferences.defaultTone')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Tom padrão deve ter no máximo 30 caracteres'),
  
  body('preferences.emailSignature')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Assinatura deve ter no máximo 500 caracteres'),
  
  handleValidationErrors
]

export default {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validatePasswordUpdate,
  validateCreateProject,
  validateUpdateProject,
  validateImproveEmail,
  validateSendMessage,
  validateUpdateChat,
  validatePagination,
  validateSearch,
  validateObjectId,
  validateProfileUpdate,
  modifyEmailValidation
}