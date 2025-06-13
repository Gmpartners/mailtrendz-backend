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

// API Limits
export const API_LIMITS = {
  [SUBSCRIPTION_TYPES.FREE]: {
    MONTHLY_PROJECTS: 100,
    MONTHLY_AI_REQUESTS: 500,
    MONTHLY_CHAT_MESSAGES: 1000,
    MAX_PROJECTS: 50
  },
  [SUBSCRIPTION_TYPES.PRO]: {
    MONTHLY_PROJECTS: 1000,
    MONTHLY_AI_REQUESTS: 5000,
    MONTHLY_CHAT_MESSAGES: 10000,
    MAX_PROJECTS: 500
  },
  [SUBSCRIPTION_TYPES.ENTERPRISE]: {
    MONTHLY_PROJECTS: 10000,
    MONTHLY_AI_REQUESTS: 50000,
    MONTHLY_CHAT_MESSAGES: 100000,
    MAX_PROJECTS: 5000
  }
} as const

// Rate Limiting - CORRIGIDO: Limites muito mais generosos
export const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    MAX_REQUESTS: 10000 // Era 3000, agora 10000
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    MAX_REQUESTS: 500 // Era 150, agora 500
  },
  AI: {
    WINDOW_MS: 60 * 1000, // 1 minuto
    MAX_REQUESTS: 500 // Era 150, agora 500
  },
  PROJECTS: {
    WINDOW_MS: 60 * 1000, // 1 minuto
    MAX_REQUESTS: 1000 // Era 300, agora 1000
  }
} as const

// AI Models - CORRIGIDOS
export const AI_MODELS = {
  PRIMARY: 'anthropic/claude-3-sonnet-20240229',
  FALLBACKS: [
    'anthropic/claude-3-haiku-20240307',
    'openai/gpt-4-turbo-preview',
    'openai/gpt-3.5-turbo'
  ]
} as const

// AI Configuration - OTIMIZADO
export const AI_CONFIG = {
  DEFAULT_TEMPERATURE: 0.7,
  MAX_TOKENS: 2000, // Era 1500, agora 2000
  TIMEOUT: 45000, // Era 30000, agora 45000 (45s)
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 3000 // Era 2000, agora 3000
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
    DESCRIPTION_MAX_LENGTH: 500,
    PROMPT_MIN_LENGTH: 10,
    PROMPT_MAX_LENGTH: 2000 // Era 1000, agora 2000
  },
  CHAT: {
    TITLE_MAX_LENGTH: 100,
    MESSAGE_MAX_LENGTH: 10000 // Era 5000, agora 10000
  }
} as const

// HTTP Status Codes - CORRIGIDO
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
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

// Cache TTL
export const CACHE_TTL = {
  USER_PROFILE: 900,
  PROJECTS_LIST: 600,
  PROJECT_DETAILS: 900,
  CHAT_HISTORY: 300,
  ANALYTICS: 1800,
  AI_MODELS: 3600
} as const

// File Upload Limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MAX_FILES: 10
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

// Queue Configuration - CORRIGIDO: Menos restritivo
export const QUEUE_CONFIG = {
  PROJECT_CREATION: {
    MAX_CONCURRENT: 5, // Era 3, agora 5
    RETRY_LIMIT: 3, // Era 2, agora 3
    RETRY_DELAY: 2000, // Era 3000, agora 2000
    PROCESS_INTERVAL: 100, // Era 200, agora 100
    USER_COOLDOWN: 1000 // Era 3000, agora 1000 (1s)
  },
  AI_GENERATION: {
    MAX_CONCURRENT: 3, // Era 2, agora 3
    TIMEOUT: 45000, // Era 30000, agora 45000
    PRIORITY_LEVELS: {
      HIGH: 3,
      NORMAL: 2,
      LOW: 1
    }
  }
} as const

// Feature Rate Limits - CORRIGIDO: Muito mais generosos
export const FEATURE_RATE_LIMITS = {
  PROJECT_CREATION: {
    FREE_PER_MINUTE: 50, // Era 20, agora 50
    PRO_PER_MINUTE: 150, // Era 60, agora 150
    ENTERPRISE_PER_MINUTE: 500, // Era 200, agora 500
    COOLDOWN_SECONDS: 1, // Era 3, agora 1
    BURST_LIMIT: 10 // Era 5, agora 10
  },
  AI_CHAT: {
    FREE_PER_MINUTE: 100, // Era 30, agora 100
    PRO_PER_MINUTE: 300, // Era 100, agora 300
    ENTERPRISE_PER_MINUTE: 1000, // Era 500, agora 1000
    COOLDOWN_SECONDS: 0.5 // Era 1, agora 0.5
  },
  PROJECT_IMPROVEMENT: {
    FREE_PER_MINUTE: 30, // Era 10, agora 30
    PRO_PER_MINUTE: 100, // Era 30, agora 100
    ENTERPRISE_PER_MINUTE: 300, // Era 100, agora 300
    COOLDOWN_SECONDS: 2 // Era 5, agora 2
  }
} as const

// Error Messages
export const ERROR_MESSAGES = {
  RATE_LIMIT: {
    DEFAULT: 'Você está fazendo muitas requisições. Por favor, aguarde um momento.',
    PROJECT_CREATION: 'Muitas criações de projeto. Aguarde alguns segundos antes de criar outro.',
    WITH_TIME: (seconds: number) => `Por favor, aguarde ${seconds} segundos antes de tentar novamente.`
  },
  AI_SERVICE: {
    UNAVAILABLE: 'O serviço de IA está temporariamente indisponível. Tente novamente em alguns minutos.',
    TIMEOUT: 'A geração de conteúdo está demorando mais que o esperado. Por favor, tente novamente.',
    OVERLOADED: 'Sistema sobrecarregado. Sua requisição foi adicionada à fila.'
  },
  QUEUE: {
    POSITION: (position: number) => `Você está na posição ${position} da fila.`,
    ESTIMATED_TIME: (seconds: number) => `Tempo estimado: ${seconds} segundos.`
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
  UPLOAD_LIMITS,
  SECURITY,
  EMAIL_CONFIG,
  QUEUE_CONFIG,
  FEATURE_RATE_LIMITS,
  ERROR_MESSAGES
}