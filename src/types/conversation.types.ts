export interface IConversationMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  metadata: {
    model?: string
    emailUpdated: boolean
    modifications: string[]
    confidence?: number
    processingTime?: number
  }
}

export interface IProjectSnapshot {
  name: string
  currentHTML?: string
  currentSubject?: string
  industry: string
  tone: string
}

export interface IConversationState {
  lastIntent?: string
  pendingModifications: string[]
  userPreferences: Record<string, any>
}

export interface IConversation {
  id: string
  userId: string
  projectId: string
  
  conversation: {
    title: string
    createdAt: Date
    lastActivity: Date
    messages: IConversationMessage[]
    context: {
      projectSnapshot: IProjectSnapshot
      conversationState: IConversationState
    }
  }
  
  stats: {
    totalMessages: number
    emailModifications: number
    averageResponseTime: number
    lastModified: Date
  }
  
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateConversationDto {
  projectId: string
  title?: string
}

export interface SendMessageDto {
  content: string
}

export interface UpdateConversationDto {
  title?: string
  isActive?: boolean
}

export interface ConversationFilters {
  projectId?: string
  isActive?: boolean
  search?: string
  dateFrom?: Date
  dateTo?: Date
  sort?: {
    field: string
    order: 'asc' | 'desc'
  }
  pagination?: {
    page: number
    limit: number
  }
}

export interface MessageResponse {
  conversation: IConversation
  messageAdded: boolean
  projectUpdated: boolean
}

export interface ConversationResponse {
  conversation: IConversation
  project?: {
    id: string
    name: string
    type: string
  }
  stats: {
    totalMessages: number
    emailModifications: number
    averageResponseTime: number
    lastModified: Date
  }
}

export interface ConversationListResponse {
  conversations: IConversation[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrev: boolean
  }
  stats: {
    totalConversations: number
    activeConversations: number
    totalMessages: number
    totalEmailModifications: number
  }
}

export interface ConversationAnalytics {
  totalMessages: number
  userMessages: number
  aiMessages: number
  emailModifications: number
  averageResponseTime: number
  conversationDuration: number
  lastActivity: Date
}
