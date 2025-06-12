import mongoose, { Schema, Document, Types } from 'mongoose'
import { MESSAGE_TYPES, COLLECTIONS } from '../utils/constants'

// ✅ INTERFACE CORRIGIDA COM TODOS OS MÉTODOS
export interface IChatMessageDocument extends Document {
  _id: Types.ObjectId
  chatId: Types.ObjectId
  type: string
  content: string
  metadata?: {
    emailUpdated?: boolean
    suggestions?: string[]
    model?: string
    tokens?: number
    confidence?: number
    executionTime?: number
    enhancedFeatures?: string[]
    isWelcome?: boolean
    projectContextUsed?: boolean
    analysisData?: any
    originalPrompt?: string
    modifications?: any[]
    performance?: any
  }
  createdAt: Date
  updatedAt: Date
  
  // ✅ MÉTODOS DECLARADOS NA INTERFACE
  isUserMessage(): boolean
  isAIMessage(): boolean
  hasEmailUpdate(): boolean
  getTokenUsage(): number
  getExecutionTime(): number
  isEnhancedMessage(): boolean
  getConfidenceLevel(): string
}

const chatMessageSchema = new Schema<IChatMessageDocument>({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  
  type: {
    type: String,
    enum: Object.values(MESSAGE_TYPES),
    required: true,
    default: MESSAGE_TYPES.USER
  },
  
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 10000
  },
  
  metadata: {
    emailUpdated: { type: Boolean, default: false },
    suggestions: [{ type: String, trim: true }],
    model: { type: String, default: null },
    tokens: { type: Number, default: 0 },
    confidence: { type: Number, min: 0, max: 1, default: null },
    executionTime: { type: Number, default: 0 },
    enhancedFeatures: [{ type: String }],
    isWelcome: { type: Boolean, default: false },
    projectContextUsed: { type: Boolean, default: false },
    analysisData: { type: Schema.Types.Mixed },
    originalPrompt: { type: String },
    modifications: [{ type: Schema.Types.Mixed }],
    performance: { type: Schema.Types.Mixed }
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.MESSAGES || 'chatmessages'
})

// ✅ INDEXES
chatMessageSchema.index({ chatId: 1, createdAt: 1 })
chatMessageSchema.index({ type: 1 })
chatMessageSchema.index({ createdAt: -1 })

// ✅ MÉTODOS IMPLEMENTADOS
chatMessageSchema.methods.isUserMessage = function(this: IChatMessageDocument): boolean {
  return this.type === MESSAGE_TYPES.USER
}

chatMessageSchema.methods.isAIMessage = function(this: IChatMessageDocument): boolean {
  return this.type === MESSAGE_TYPES.AI
}

chatMessageSchema.methods.hasEmailUpdate = function(this: IChatMessageDocument): boolean {
  return !!(this.metadata && this.metadata.emailUpdated)
}

chatMessageSchema.methods.getTokenUsage = function(this: IChatMessageDocument): number {
  if (!this.metadata) return 0
  return this.metadata.tokens || (this.metadata.performance && this.metadata.performance.tokensConsumed) || 0
}

chatMessageSchema.methods.getExecutionTime = function(this: IChatMessageDocument): number {
  if (!this.metadata) return 0
  return this.metadata.executionTime || (this.metadata.performance && this.metadata.performance.processingTime) || 0
}

chatMessageSchema.methods.isEnhancedMessage = function(this: IChatMessageDocument): boolean {
  if (!this.metadata) return false
  return !!(this.metadata.enhancedFeatures && this.metadata.enhancedFeatures.length > 0) || 
         !!this.metadata.projectContextUsed ||
         !!this.metadata.analysisData
}

chatMessageSchema.methods.getConfidenceLevel = function(this: IChatMessageDocument): string {
  if (!this.metadata || !this.metadata.confidence) return 'unknown'
  const confidence = this.metadata.confidence
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.6) return 'medium'
  if (confidence >= 0.4) return 'low'
  return 'very-low'
}

// ✅ VIRTUAL CORRIGIDO
chatMessageSchema.virtual('stats').get(function(this: IChatMessageDocument) {
  const meta = this.metadata || {}
  return {
    type: this.type,
    hasEmailUpdate: !!(meta.emailUpdated),
    tokenUsage: meta.tokens || 0,
    executionTime: meta.executionTime || 0,
    isEnhanced: !!(meta.enhancedFeatures && meta.enhancedFeatures.length > 0),
    confidenceLevel: this.getConfidenceLevel(),
    hasSuggestions: !!(meta.suggestions && meta.suggestions.length > 0),
    suggestionCount: (meta.suggestions && meta.suggestions.length) || 0,
    confidence: meta.confidence,
    model: meta.model,
    wordCount: this.content ? this.content.split(' ').length : 0,
    characterCount: this.content ? this.content.length : 0,
    enhancedFeatures: meta.enhancedFeatures || [],
    projectContextUsed: !!meta.projectContextUsed,
    modificationsCount: (meta.modifications && meta.modifications.length) || 0
  }
})

// ✅ STATICS
chatMessageSchema.statics.findByChat = function(chatId: Types.ObjectId, filters = {}) {
  return this.find({ chatId, ...filters }).sort({ createdAt: 1 })
}

chatMessageSchema.statics.findRecent = function(chatId: Types.ObjectId, limit = 50) {
  return this.find({ chatId }).sort({ createdAt: -1 }).limit(limit)
}

// ✅ JSON CONFIG
chatMessageSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v
    ret.id = ret._id
    delete ret._id
    return ret
  }
})

export const ChatMessage = mongoose.model<IChatMessageDocument>('ChatMessage', chatMessageSchema)
