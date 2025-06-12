import mongoose, { Schema, Document, Types } from 'mongoose'
import { MESSAGE_TYPES, COLLECTIONS } from '../utils/constants'

// ✅ INTERFACE CORRIGIDA COM TODOS OS MÉTODOS
export interface IMessageDocument extends Document {
  _id: Types.ObjectId
  chatId: Types.ObjectId
  type: string
  content: string
  metadata?: {
    emailUpdated?: boolean
    suggestions?: string[]
    modelUsed?: string
    model?: string
    processingTime?: number
    executionTime?: number
    enhancedFeatures?: string[]
    confidence?: number
    tokens?: number
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
}

const messageSchema = new Schema<IMessageDocument>({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: [true, 'Chat ID é obrigatório'],
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
    maxlength: 5000
  },
  
  metadata: {
    emailUpdated: { type: Boolean, default: false },
    suggestions: [{ type: String, trim: true }],
    modelUsed: { type: String, default: null },
    model: { type: String, default: null },
    processingTime: { type: Number, default: 0 },
    executionTime: { type: Number, default: 0 },
    enhancedFeatures: [{ type: String }],
    confidence: { type: Number, min: 0, max: 1 },
    tokens: { type: Number, default: 0 },
    performance: { type: Schema.Types.Mixed }
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.MESSAGES || 'messages'
})

// ✅ INDEXES
messageSchema.index({ chatId: 1, createdAt: 1 })
messageSchema.index({ type: 1 })
messageSchema.index({ createdAt: -1 })

// ✅ MÉTODOS IMPLEMENTADOS
messageSchema.methods.isUserMessage = function(this: IMessageDocument): boolean {
  return this.type === MESSAGE_TYPES.USER
}

messageSchema.methods.isAIMessage = function(this: IMessageDocument): boolean {
  return this.type === MESSAGE_TYPES.AI
}

messageSchema.methods.hasEmailUpdate = function(this: IMessageDocument): boolean {
  return !!(this.metadata && this.metadata.emailUpdated)
}

messageSchema.methods.getTokenUsage = function(this: IMessageDocument): number {
  if (!this.metadata) return 0
  return this.metadata.tokens || (this.metadata.performance && this.metadata.performance.tokensConsumed) || 0
}

messageSchema.methods.getExecutionTime = function(this: IMessageDocument): number {
  if (!this.metadata) return 0
  return this.metadata.executionTime || (this.metadata.performance && this.metadata.performance.processingTime) || 0
}

// ✅ VIRTUAL CORRIGIDO
messageSchema.virtual('stats').get(function(this: IMessageDocument) {
  const meta = this.metadata || {}
  return {
    type: this.type,
    hasEmailUpdate: !!(meta.emailUpdated),
    tokenUsage: meta.tokens || 0,
    executionTime: meta.executionTime || 0,
    hasSuggestions: !!(meta.suggestions && meta.suggestions.length > 0),
    confidence: meta.confidence,
    model: meta.model || meta.modelUsed,
    wordCount: this.content ? this.content.split(' ').length : 0,
    characterCount: this.content ? this.content.length : 0
  }
})

// ✅ STATICS
messageSchema.statics.findByChat = function(chatId: Types.ObjectId, filters = {}) {
  return this.find({ chatId, ...filters }).sort({ createdAt: 1 })
}

messageSchema.statics.findRecent = function(chatId: Types.ObjectId, limit = 50) {
  return this.find({ chatId }).sort({ createdAt: -1 }).limit(limit)
}

// ✅ JSON CONFIG
messageSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v
    ret.id = ret._id
    delete ret._id
    return ret
  }
})

export const Message = mongoose.model<IMessageDocument>('Message', messageSchema)
