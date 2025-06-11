// API Constants
export const API_VERSION = 'v1'
export const API_PREFIX = `/api/${API_VERSION}`

// Database Collections
export const COLLECTIONS = {
  USERS: 'users',
  PROJECTS: 'projects',
  CHATS: 'chats',
  MESSAGES: 'messages',
  REFRESH_TOKENS: 'refresh_tokens'
} as const

// User Subscription Types
export const SUBSCRIPTION_TYPES = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
} as const

// Project Types
export const PROJECT_TYPES = {
  WELCOME: 'welcome',
  NEWSLETTER: 'newsletter',
  CAMPAIGN: 'campaign',
  PROMOTIONAL: 'promotional',
  ANNOUNCEMENT: 'announcement',
  FOLLOW_UP: 'follow-up'
} as const

// Project Status
export const PROJECT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed'
} as const

// Message Types
export const MESSAGE_TYPES = {
  USER: 'user',
  AI: 'ai',
  SYSTEM: 'system'
} as const

// API Limits per subscription
export const API_LIMITS = {
  [SUBSCRIPTION_TYPES.FREE]: {
    MONTHLY_PROJECTS: 10,
    MONTHLY_AI_REQUESTS: 50,
    MONTHLY_CHAT_MESSAGES: 100,
    MAX_PROJECTS: 5
  },
  [SUBSCRIPTION_TYPES.PRO]: {
    MONTHLY_PROJECTS: 100,
    MONTHLY_AI_REQUESTS: 500,
    MONTHLY_CHAT_MESSAGES: 1000,
    MAX_PROJECTS: 50
  },
  [SUBSCRIPTION_TYPES.ENTERPRISE]: {
    MONTHLY_PROJECTS: 1000,
    MONTHLY_AI_REQUESTS: 5000,
    MONTHLY_CHAT_MESSAGES: 10000,
    MAX_PROJECTS: 500
  }
} as const

// Rate Limiting
export const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 1000 // Aumentado de 100 para 1000
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 50 // Aumentado de 5 para 50 (muito mais generoso)
  },
  AI: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 50 // Aumentado de 10 para 50
  },
  PROJECTS: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 100 // Aumentado de 20 para 100
  }
} as const

// AI Models
export const AI_MODELS = {
  PRIMARY: 'anthropic/claude-3.5-sonnet',
  FALLBACKS: [
    'openai/gpt-4-turbo',
    'anthropic/claude-3-haiku',
    'openai/gpt-3.5-turbo'
  ]
} as const

// AI Configuration
export const AI_CONFIG = {
  DEFAULT_TEMPERATURE: 0.7,
  MAX_TOKENS: 4000,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
} as const

// Email Template Colors
export const EMAIL_COLORS = {
  [PROJECT_TYPES.WELCOME]: '#10b981',    // Verde
  [PROJECT_TYPES.NEWSLETTER]: '#3b82f6', // Azul
  [PROJECT_TYPES.CAMPAIGN]: '#ef4444',   // Vermelho
  [PROJECT_TYPES.PROMOTIONAL]: '#f59e0b', // Amarelo
  [PROJECT_TYPES.ANNOUNCEMENT]: '#8b5cf6', // Roxo
  [PROJECT_TYPES.FOLLOW_UP]: '#06b6d4'   // Ciano
} as const

// Validation Rules
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false
  },
  PROJECT: {
    NAME_MIN_LENGTH: 3,
    NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 500,
    PROMPT_MIN_LENGTH: 10,
    PROMPT_MAX_LENGTH: 1000
  },
  CHAT: {
    TITLE_MAX_LENGTH: 100,
    MESSAGE_MAX_LENGTH: 5000
  }
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const

// Error Codes
export const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  
  // Authorization
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  
  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // Limits
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  API_LIMIT_EXCEEDED: 'API_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  
  // AI/External Services
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const

// Default Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  USER_PROFILE: 300,     // 5 minutes
  PROJECTS_LIST: 180,    // 3 minutes
  PROJECT_DETAILS: 300,  // 5 minutes
  CHAT_HISTORY: 120,     // 2 minutes
  ANALYTICS: 600,        // 10 minutes
  AI_MODELS: 3600        // 1 hour
} as const

// File Upload Limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MAX_FILES: 5
} as const

// Security
export const SECURITY = {
  BCRYPT_ROUNDS: 12,
  JWT_ALGORITHM: 'HS256',
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  REFRESH_TOKEN_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 days
  PASSWORD_RESET_TIMEOUT: 60 * 60 * 1000 // 1 hour
} as const

// Email Configuration
export const EMAIL_CONFIG = {
  MAX_SUBJECT_LENGTH: 78,
  MAX_PREVIEW_LENGTH: 140,
  RECOMMENDED_SUBJECT_LENGTH: 50,
  RECOMMENDED_PREVIEW_LENGTH: 90
} as const

export default {
  API_VERSION,
  API_PREFIX,
  COLLECTIONS,
  SUBSCRIPTION_TYPES,
  PROJECT_TYPES,
  PROJECT_STATUS,
  MESSAGE_TYPES,
  API_LIMITS,
  RATE_LIMITS,
  AI_MODELS,
  AI_CONFIG,
  EMAIL_COLORS,
  VALIDATION,
  HTTP_STATUS,
  ERROR_CODES,
  PAGINATION,
  CACHE_TTL,
  UPLOAD_LIMITS,
  SECURITY,
  EMAIL_CONFIG
}