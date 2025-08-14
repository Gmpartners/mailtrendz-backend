export interface IChat {
  _id: string
  id: string
  userId: string
  projectId?: string
  title: string
  messages: string[]
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
  _id: string
  id: string
  chatId: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp?: string
  createdAt: Date | string
  images?: MessageImage[]
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
    hasImages?: boolean
    imageAnalysis?: ImageAnalysis[]
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

export interface MessageImage {
  id: string
  url: string
  path: string
  originalName: string
  size: number
  mimeType: string
  uploadedAt: string
  analysis?: ImageAnalysis
}

export interface ImageAnalysis {
  description: string
  objects: string[]
  colors: string[]
  confidence: number
  tags: string[]
  isEmailRelevant: boolean
  suggestedPlacement: 'header' | 'content' | 'footer' | 'background'
  altText: string
}

export interface CreateChatDto {
  title?: string
  projectId?: string
  context?: any
}

export interface SendMessageDto {
  content: string
  type?: 'user' | 'ai' | 'system'
  images?: MessageImage[]
}

export interface CreateMessageDto {
  chatId: string
  content: string
  type?: 'user' | 'ai' | 'system'
  images?: MessageImage[]
  metadata?: any
}

export interface UpdateChatDto {
  title?: string
  isActive?: boolean
  metadata?: {
    totalMessages?: number
    emailUpdates?: number
    lastActivity?: Date | string
    enhancedMode?: boolean
    enhancedAIEnabled?: boolean
  }
}

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

export interface EnhancedChatRequest {
  message: string
  chatHistory: IMessage[]
  projectContext: ProjectContext
  userHistory?: UserHistory
  images?: MessageImage[]
}

export interface EnhancedChatResponse {
  response: string
  shouldUpdateEmail: boolean
  analysis: PromptAnalysis
  suggestions: string[]
  enhancedContent?: any
  processedImages?: ProcessedImage[]
  metadata: {
    model: string
    tokens: number
    confidence: number
    enhancedFeatures: string[]
    processingTime: number
    hasImageAnalysis: boolean
  }
}

export interface ProcessedImage {
  originalImage: MessageImage
  analysis: ImageAnalysis
  emailIntegration: {
    htmlCode: string
    placement: string
    styling: string
  }
}

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
    images?: {
      required: boolean
      placement: string[]
      style: string
      purpose: string
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
  imageAnalysis?: {
    relevantImages: number
    suggestedPlacements: string[]
    colorExtraction: string[]
    contentAlignment: number
  }
  confidence: number
  processingTime: number
  originalPrompt: string
}

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

export interface SmartEmailRequest {
  prompt: string
  projectContext: ProjectContext
  userHistory?: UserHistory
  useEnhanced: boolean
  images?: MessageImage[]
}

export interface EnhancedEmailContent {
  subject: string
  previewText: string
  html: string
  text: string
  css?: string
  components?: any[]
  images?: EmailImage[]
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
    hasImages: boolean
    imageCount: number
  }
}

export interface EmailImage {
  id: string
  url: string
  altText: string
  placement: 'header' | 'content' | 'footer' | 'background'
  styling: {
    width?: string
    height?: string
    borderRadius?: string
    margin?: string
    display?: string
  }
  htmlCode: string
}

export interface ChatMetrics {
  totalChats: number
  activeChats: number
  totalMessages: number
  averageMessagesPerChat: number
  emailUpdatesCount: number
  enhancedMessagesCount: number
  averageResponseTime: number
  imagesUploadedCount: number
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
  hasImages: boolean
  imageCount: number
}

export enum MessageType {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system'
}

// Manter compatibilidade com 'ai' e 'assistant'
export type ChatMessageRole = 'user' | 'ai' | 'assistant' | 'system';

// Função helper para normalizar roles
export function normalizeMessageRole(type: string): ChatMessageRole {
  const validRoles: ChatMessageRole[] = ['user', 'ai', 'assistant', 'system'];
  return validRoles.includes(type as ChatMessageRole) ? type as ChatMessageRole : 'user';
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

export interface ChatEvent {
  type: 'message_sent' | 'message_received' | 'email_updated' | 'chat_created' | 'image_uploaded'
  chatId: string
  userId: string
  timestamp: Date
  data?: any
}

export interface ChatSettings {
  enhancedAIEnabled: boolean
  autoUpdateEmail: boolean
  suggestionLevel: 'basic' | 'advanced'
  responseLength: 'short' | 'medium' | 'long'
  confidenceThreshold: number
  imageAnalysisEnabled: boolean
  autoImagePlacement: boolean
}