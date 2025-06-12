import { Types } from 'mongoose'

// ✅ Interfaces principais de chat
export interface IChat {
  _id: Types.ObjectId
  id: string
  userId: string
  projectId?: string
  title: string
  messages: Types.ObjectId[]
  isActive: boolean
  metadata: {
    totalMessages: number
    emailUpdates: number
    lastActivity: Date | string
    enhancedMode?: boolean
    enhancedAIEnabled?: boolean
  }
  createdAt: Date | string
  updatedAt: Date | string
}

export interface IMessage {
  _id: Types.ObjectId
  id: string
  chatId: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp?: string
  createdAt: Date | string
  metadata?: {
    emailUpdated?: boolean
    suggestions?: string[]
    modelUsed?: string
    model?: string
    processingTime?: number
    executionTime?: number
    enhancedFeatures?: string[]
    confidence?: number
    isWelcome?: boolean
    projectContextUsed?: boolean
    analysisData?: any
    originalPrompt?: string
    modifications?: any[]
    performance?: {
      processingTime?: number
      modelUsed?: string
      tokensConsumed?: number
      cacheHit?: boolean
      retryCount?: number
      qualityScore?: number
    }
    tokens?: number
  }
}

// ✅ DTOs para criação e manipulação
export interface CreateChatDto {
  title?: string
  projectId?: string
}

export interface SendMessageDto {
  content: string
  type?: 'user' | 'ai' | 'system'
}

export interface UpdateChatDto {
  title?: string
  isActive?: boolean
  metadata?: Partial<IChat['metadata']>
}

// ✅ Filtros e paginação
export interface ChatFilters {
  userId: string
  projectId?: string
  isActive?: boolean
  search?: string
  dateFrom?: Date
  dateTo?: Date
  pagination?: {
    page: number
    limit: number
  }
  sort?: {
    field: string
    order: 'asc' | 'desc'
  }
}

// ✅ Respostas da API
export interface ChatResponse {
  chat: IChat
  messages?: IMessage[]
  project?: {
    id: string
    name: string
    type: string
  }
  stats?: {
    totalMessages: number
    userMessages: number
    aiMessages: number
    emailUpdates: number
    lastActivity: Date | string
  }
}

export interface MessageResponse {
  userMessage: IMessage
  aiMessage: IMessage
  projectUpdated?: boolean
}

export interface MessagesResponse {
  messages: IMessage[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrev: boolean
  }
  stats?: {
    totalMessages: number
    userMessages: number
    aiMessages: number
    averageResponseTime?: number
  }
}

export interface ChatHistoryResponse {
  messages: IMessage[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrev: boolean
  }
  stats: {
    totalMessages: number
    userMessages: number
    aiMessages: number
    averageResponseTime: number
  }
}

// ✅ Analytics
export interface ChatAnalytics {
  chatId: string
  projectName: string
  stats: {
    totalMessages: number
    userMessages: number
    aiMessages: number
    emailUpdates: number
    averageResponseTime: number
    sessionDuration: number
  }
  timeline: any[]
  wordCloud: any[]
  sentiment: {
    positive: number
    neutral: number
    negative: number
  }
}

// ✅ Tipos específicos de Enhanced AI
export interface EnhancedChatRequest {
  message: string
  chatHistory: IMessage[]
  projectContext: ProjectContext
  userHistory?: UserHistory
}

export interface EnhancedChatResponse {
  response: string
  shouldUpdateEmail: boolean
  analysis: PromptAnalysis
  suggestions: string[]
  enhancedContent?: any
  metadata: {
    model: string
    tokens: number
    confidence: number
    enhancedFeatures: string[]
    processingTime: number
  }
}

// ✅ Contexto de projeto melhorado
export interface ProjectContext {
  userId?: string
  projectName: string
  type: string
  industry: string
  tone: string
  targetAudience?: string
  status?: string
  hasProjectContent?: boolean
  currentEmailContent?: {
    subject?: string
    html?: string
    text?: string
    previewText?: string
  }
  originalPrompt?: string
}

// ✅ Análise de prompt
export interface PromptAnalysis {
  intentions: Array<{
    action: string
    target: string
    specification?: string
    priority?: number
    scope?: string
    confidence?: number
    projectAware?: boolean
  }>
  visualRequirements: {
    colorScheme?: {
      primary: string
      detected: boolean
      source?: string
    }
    layout?: {
      type: string
      style: string
      requested?: boolean
    }
    typography?: {
      style: string
      emphasis: string
      size?: string
    }
    cta?: {
      style: string
      size: string
      color: string
      action: string
    }
  }
  contentRequirements: {
    tone: string
    length: string
    focus: string[]
    urgency: string
    personalization: string
    industry?: string
    targetAudience?: string
  }
  confidence: number
  processingTime: number
  originalPrompt: string
}

// ✅ Histórico do usuário
export interface UserHistory {
  previousProjects?: Array<{
    id: string
    name: string
    type: string
    success?: boolean
  }>
  preferredStyles?: string[]
  commonRequests?: string[]
  successPatterns?: any[]
}

// ✅ Smart Email Request
export interface SmartEmailRequest {
  prompt: string
  projectContext: ProjectContext
  userHistory?: UserHistory
  useEnhanced: boolean
}

// ✅ Enhanced Email Content
export interface EnhancedEmailContent {
  subject: string
  previewText: string
  html: string
  text: string  // ✅ PROPRIEDADE ADICIONADA
  css?: string
  components?: any[]
  analysis?: PromptAnalysis
  metadata: {
    version: string
    generated: Date
    model: string
    tokens: number
    qualityScore: number
    compatibilityScore: number
    accessibilityScore: number
    estimatedRenderTime: number
    supportedClients: string[]
    enhancedFeatures: string[]
    processingTime: number
  }
}

// ✅ Estatísticas e métricas
export interface ChatMetrics {
  totalChats: number
  activeChats: number
  totalMessages: number
  averageMessagesPerChat: number
  emailUpdatesCount: number
  enhancedMessagesCount: number
  averageResponseTime: number
  modelUsageStats: {
    [model: string]: {
      count: number
      averageTokens: number
      averageExecutionTime: number
    }
  }
}

export interface MessageMetrics {
  messageId: string
  type: 'user' | 'ai' | 'system'
  wordCount: number
  characterCount: number
  processingTime?: number
  tokensUsed?: number
  confidence?: number
  enhancedFeatures: string[]
  projectContextUsed: boolean
  modificationsApplied: number
}

// ✅ Enums
export enum MessageType {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system'
}

export enum ChatStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export enum IntentionAction {
  CREATE = 'create',
  MODIFY = 'modify',
  EDIT = 'edit',
  IMPROVE = 'improve',
  CUSTOMIZE = 'customize',
  ADD = 'add',
  REMOVE = 'remove',
  REDESIGN = 'redesign'
}

// ✅ Eventos de chat
export interface ChatEvent {
  type: 'message_sent' | 'message_received' | 'email_updated' | 'chat_created'
  chatId: string
  userId: string
  timestamp: Date
  data?: any
}

// ✅ Configurações de chat
export interface ChatSettings {
  enhancedAIEnabled: boolean
  autoUpdateEmail: boolean
  suggestionLevel: 'basic' | 'advanced'
  responseLength: 'short' | 'medium' | 'long'
  confidenceThreshold: number
}

// ✅ EXPORT DEFAULT REMOVIDO - CORRIGIDO!