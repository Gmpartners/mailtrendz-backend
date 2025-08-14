export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: {
    code?: string
    details?: any
    stack?: string
  }
  pagination?: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta?: {
    timestamp: Date
    version: string
    requestId: string
    executionTime: number
  }
}

export interface PaginationQuery {
  page?: string
  limit?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SearchQuery extends PaginationQuery {
  search?: string
  category?: string
  type?: string
  status?: string
  tags?: string
  dateFrom?: string
  dateTo?: string
}

export interface ApiError extends Error {
  statusCode: number
  code?: string
  details?: any
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

export interface RateLimitInfo {
  limit: number
  current: number
  remaining: number
  resetTime: Date
}

export interface HealthCheck {
  status: 'ok' | 'error'
  timestamp: Date
  uptime: number
  version: string
  services: {
    database: {
      status: 'connected' | 'disconnected'
      responseTime?: number
    }
    ai: {
      status: 'available' | 'unavailable'
      responseTime?: number
    }
    cache?: {
      status: 'connected' | 'disconnected'
      responseTime?: number
    }
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
}

export interface RequestLog {
  id: string
  method: string
  url: string
  statusCode: number
  responseTime: number
  userAgent?: string
  ip: string
  userId?: string
  timestamp: Date
  error?: string
}

export interface UsageStats {
  period: 'day' | 'week' | 'month' | 'year'
  requests: {
    total: number
    successful: number
    failed: number
  }
  users: {
    total: number
    active: number
    new: number
  }
  projects: {
    total: number
    created: number
    completed: number
  }
  ai: {
    requests: number
    tokens: number
    cost: number
  }
}

export interface WebhookPayload {
  event: string
  data: any
  timestamp: Date
  signature: string
}

export interface FileUpload {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  destination: string
  filename: string
  path: string
}