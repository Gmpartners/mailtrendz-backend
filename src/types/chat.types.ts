import { Types } from 'mongoose'

export interface IChat {
  _id: Types.ObjectId
  id?: string
  userId: string | Types.ObjectId
  projectId: string | Types.ObjectId
  title: string
  messages: Types.ObjectId[]
  isActive: boolean
  metadata: {
    totalMessages: number
    lastActivity: Date
    emailUpdates: number
    enhancedAIEnabled?: boolean
    aiMode?: 'standard' | 'enhanced' | 'adaptive'
    enhancedInteractions?: number
    lastEnhancedInteraction?: Date
  }
  createdAt: Date
  updatedAt: Date
}

export interface IMessage {
  _id: Types.ObjectId
  id?: string
  chatId: string | Types.ObjectId
  type: 'user' | 'ai' | 'system'
  content: string
  createdAt: Date
  metadata?: {
    emailUpdated?: boolean
    suggestions?: string[]
    model?: string
    tokens?: number
    confidence?: number
    executionTime?: number
    aiMode?: 'standard' | 'enhanced' | 'adaptive' | 'fallback' | 'error'
    enhancedFeatures?: string[]
    analysis?: {
      confidence: number
      intentionsCount: number
      hasVisualReqs: boolean
    }
    error?: boolean
  }
}

export interface IChatMessage extends IMessage {}

export interface CreateChatDto {
  projectId: string
  title?: string
}

export interface SendMessageDto {
  content: string
  type?: 'user' | 'system'
}

export interface UpdateChatDto {
  title?: string
  isActive?: boolean
}

export interface ChatResponse {
  chat: IChat
  messages: IMessage[]
  project: {
    id: string
    name: string
    type: string
  }
  stats: {
    totalMessages: number
    userMessages: number
    aiMessages: number
    emailUpdates: number
    lastActivity: Date
  }
  aiCapabilities?: {
    enhancedMode: boolean
    currentMode: 'standard' | 'enhanced' | 'adaptive'
    features: string[]
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
}

export interface ChatFilters {
  userId: string
  projectId?: string
  isActive?: boolean
  search?: string
  dateFrom?: Date
  dateTo?: Date
  pagination: {
    page: number
    limit: number
  }
  sort: {
    field: string
    order: 'asc' | 'desc'
  }
}

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
  timeline: {
    date: Date
    messages: number
    emailUpdates: number
  }[]
  wordCloud: {
    word: string
    frequency: number
  }[]
  sentiment: {
    positive: number
    neutral: number
    negative: number
  }
}

export interface BulkMessageDto {
  messages: {
    content: string
    type: 'user' | 'ai' | 'system'
    metadata?: any
  }[]
}
