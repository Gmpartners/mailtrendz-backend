export interface EmailContent {
  subject: string
  previewText?: string
  html: string
  text: string
}

export interface ProjectContext {
  userId: string
  projectName: string
  type: 'welcome' | 'newsletter' | 'campaign' | 'promotional' | 'announcement' | 'follow-up'
  industry: string
  targetAudience?: string
  tone?: string
  status?: string
}

export interface AIResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ChatMessage {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    emailUpdated?: boolean
    suggestions?: string[]
    model?: string
    tokens?: number
  }
}

export interface AIGenerationRequest {
  prompt: string
  context: ProjectContext
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface AIImprovementRequest {
  currentEmail: EmailContent
  feedback: string
  context: ProjectContext
  model?: string
}

export interface AIChatRequest {
  message: string
  chatHistory: ChatMessage[]
  projectContext: ProjectContext
  model?: string
}

export interface AIChatResponse {
  response: string
  shouldUpdateEmail: boolean
  suggestions?: string[]
  metadata?: {
    model: string
    tokens: number
    confidence: number
  }
}

export interface AIUsageStats {
  userId: string
  month: string
  totalRequests: number
  totalTokens: number
  emailsGenerated: number
  emailsImproved: number
  chatMessages: number
  cost: number
}

export interface OpenRouterModel {
  id: string
  name: string
  description: string
  pricing: {
    prompt: number
    completion: number
  }
  context_length: number
  architecture: {
    modality: string
    tokenizer: string
    instruct_type?: string
  }
}

export interface PromptTemplate {
  type: 'generation' | 'improvement' | 'chat'
  industry?: string
  template: string
  variables: string[]
  examples?: {
    input: string
    output: string
  }[]
}

export interface AIModelConfig {
  primary: string
  fallbacks: string[]
  temperature: number
  maxTokens: number
  timeout: number
}