// API Constants
export const API_VERSION = 'v1'
export const API_PREFIX = `/api/${API_VERSION}`

// Database Collections
export const COLLECTIONS = {
  USERS: 'users',
  PROJECTS: 'projects',
  CONVERSATIONS: 'conversations',
  CHATS: 'chats',
  MESSAGES: 'messages',
  REFRESH_TOKENS: 'refresh_tokens'
} as const

// User Subscription Types
export const SUBSCRIPTION_TYPES = {
  FREE: 'free',
  STARTER: 'starter',
  ENTERPRISE: 'enterprise',
  UNLIMITED: 'unlimited'
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

// API Limits
export const API_LIMITS = {
  free: {
    MONTHLY_PROJECTS: 1000,
    MONTHLY_AI_REQUESTS: 5000,
    MONTHLY_CHAT_MESSAGES: 10000,
    MAX_PROJECTS: 500
  },
  starter: {
    MONTHLY_PROJECTS: 10000,
    MONTHLY_AI_REQUESTS: 50000,
    MONTHLY_CHAT_MESSAGES: 100000,
    MAX_PROJECTS: 5000
  },
  enterprise: {
    MONTHLY_PROJECTS: 100000,
    MONTHLY_AI_REQUESTS: 500000,
    MONTHLY_CHAT_MESSAGES: 1000000,
    MAX_PROJECTS: 50000
  },
  unlimited: {
    MONTHLY_PROJECTS: 100000,
    MONTHLY_AI_REQUESTS: 500000,
    MONTHLY_CHAT_MESSAGES: 1000000,
    MAX_PROJECTS: 50000
  }
} as const

// ✅ RATE LIMITING MUITO MAIS GENEROSO
export const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000,  // 15 minutos
    MAX_REQUESTS: 50000         // ✅ AUMENTADO de 10000 para 50000
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000,  // 15 minutos
    MAX_REQUESTS: 1000          // ✅ AUMENTADO de 500 para 1000
  },
  AI: {
    WINDOW_MS: 60 * 1000,       // 1 minuto
    MAX_REQUESTS: 2000          // ✅ AUMENTADO de 500 para 2000
  },
  PROJECTS: {
    WINDOW_MS: 60 * 1000,       // 1 minuto
    MAX_REQUESTS: 5000          // ✅ AUMENTADO de 1000 para 5000
  }
} as const

// AI Models
export const AI_MODELS = {
  PRIMARY: 'anthropic/claude-4-sonnet',
  FALLBACKS: [
    'anthropic/claude-3-sonnet-20240229',
    'anthropic/claude-3-haiku-20240307',
    'openai/gpt-4-turbo-preview'
  ]
} as const

// AI Configuration
export const AI_CONFIG = {
  DEFAULT_TEMPERATURE: 0.7,
  MAX_TOKENS: 2500,
  TIMEOUT: 45000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 3000
} as const

// Email Template Colors
export const EMAIL_COLORS = {
  [PROJECT_TYPES.WELCOME]: '#10b981',
  [PROJECT_TYPES.NEWSLETTER]: '#3b82f6',
  [PROJECT_TYPES.CAMPAIGN]: '#ef4444',
  [PROJECT_TYPES.PROMOTIONAL]: '#f59e0b',
  [PROJECT_TYPES.ANNOUNCEMENT]: '#8b5cf6',
  [PROJECT_TYPES.FOLLOW_UP]: '#06b6d4'
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
    DESCRIPTION_MAX_LENGTH: 5000,    // ✅ AUMENTADO de 500 para 5000 para permitir prompts grandes
    PROMPT_MIN_LENGTH: 5,            // ✅ REDUZIDO de 10 para 5
    PROMPT_MAX_LENGTH: 10000         // ✅ AUMENTADO de 2000 para 10000 para prompts ainda maiores
  },
  CONVERSATION: {
    TITLE_MAX_LENGTH: 100,
    MESSAGE_MAX_LENGTH: 10000
  },
  CHAT: {
    TITLE_MAX_LENGTH: 100,
    MESSAGE_MAX_LENGTH: 10000
  }
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  REQUEST_TIMEOUT: 408,
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
  
  // Users
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  
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
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  PROJECT_LIMIT_EXCEEDED: 'PROJECT_LIMIT_EXCEEDED',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  
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

// Cache TTL
export const CACHE_TTL = {
  USER_PROFILE: 900,
  PROJECTS_LIST: 600,
  PROJECT_DETAILS: 900,
  CONVERSATION_HISTORY: 300,
  ANALYTICS: 1800,
  AI_MODELS: 3600
} as const

// Security
export const SECURITY = {
  BCRYPT_ROUNDS: 12,
  JWT_ALGORITHM: 'HS256',
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000,
  REFRESH_TOKEN_TIMEOUT: 7 * 24 * 60 * 60 * 1000,
  PASSWORD_RESET_TIMEOUT: 60 * 60 * 1000
} as const

// Email Configuration
export const EMAIL_CONFIG = {
  MAX_SUBJECT_LENGTH: 78,
  MAX_PREVIEW_LENGTH: 140,
  RECOMMENDED_SUBJECT_LENGTH: 50,
  RECOMMENDED_PREVIEW_LENGTH: 90
} as const

// ✅ FEATURE RATE LIMITS MUITO MAIS GENEROSOS
export const FEATURE_RATE_LIMITS = {
  PROJECT_CREATION: {
    FREE_PER_MINUTE: 500,        // ✅ AUMENTADO de 50 para 500
    PRO_PER_MINUTE: 1500,        // ✅ AUMENTADO de 150 para 1500
    ENTERPRISE_PER_MINUTE: 5000, // ✅ AUMENTADO de 500 para 5000
    COOLDOWN_SECONDS: 0.1,       // ✅ REDUZIDO de 1 para 0.1
    BURST_LIMIT: 100             // ✅ AUMENTADO de 10 para 100
  },
  AI_CONVERSATION: {
    FREE_PER_MINUTE: 1000,       // ✅ AUMENTADO de 100 para 1000
    PRO_PER_MINUTE: 3000,        // ✅ AUMENTADO de 300 para 3000
    ENTERPRISE_PER_MINUTE: 10000, // ✅ AUMENTADO de 1000 para 10000
    COOLDOWN_SECONDS: 0.1        // ✅ REDUZIDO de 0.5 para 0.1
  },
  PROJECT_IMPROVEMENT: {
    FREE_PER_MINUTE: 300,        // ✅ AUMENTADO de 30 para 300
    PRO_PER_MINUTE: 1000,        // ✅ AUMENTADO de 100 para 1000
    ENTERPRISE_PER_MINUTE: 3000, // ✅ AUMENTADO de 300 para 3000
    COOLDOWN_SECONDS: 0.2        // ✅ REDUZIDO de 2 para 0.2
  }
} as const

// ✅ ERROR MESSAGES MAIS AMIGÁVEIS
export const ERROR_MESSAGES = {
  RATE_LIMIT: {
    DEFAULT: 'Você está fazendo muitas requisições. Por favor, aguarde um momento.',
    PROJECT_CREATION: 'Muitas criações de projeto. Aguarde alguns segundos antes de criar outro.',
    WITH_TIME: (seconds: number) => {
      if (seconds <= 1) return 'Por favor, aguarde um momento antes de tentar novamente.'
      if (seconds <= 5) return `Por favor, aguarde ${seconds} segundos antes de tentar novamente.`
      return `Por favor, aguarde ${Math.ceil(seconds/5)*5} segundos antes de tentar novamente.`
    }
  },
  AI_SERVICE: {
    UNAVAILABLE: 'O serviço de IA está temporariamente indisponível. Tente novamente em alguns minutos.',
    TIMEOUT: 'A geração de conteúdo está demorando mais que o esperado. Por favor, tente novamente.',
    OVERLOADED: 'Sistema sobrecarregado. Sua requisição foi adicionada à fila.'
  },
  PYTHON_AI: {
    CONNECTION_FAILED: 'Falha na conexão com o serviço Python AI.',
    TIMEOUT: 'Timeout na comunicação com o serviço Python AI.',
    INVALID_RESPONSE: 'Resposta inválida do serviço Python AI.'
  }
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
  SECURITY,
  EMAIL_CONFIG,
  FEATURE_RATE_LIMITS,
  ERROR_MESSAGES
}