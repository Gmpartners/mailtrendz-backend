import mongoose, { Schema, Document, Types } from 'mongoose'
import { IMessage } from '../types/chat.types'
import { MESSAGE_TYPES, COLLECTIONS } from '../utils/constants'

// ✅ CORREÇÃO: Interface melhorada para Message
export interface IMessageDocument extends Omit<IMessage, '_id' | 'id'>, Document {
  isUserMessage(): boolean
  isAIMessage(): boolean
  hasEmailUpdate(): boolean
  getTokenUsage(): number
  getExecutionTime(): number
}

const messageSchema = new Schema<IMessageDocument>({
  chatId: {
    type: Schema.Types.ObjectId,  // ✅ CORREÇÃO: Tipo correto para ObjectId
    ref: 'Chat',
    required: [true, 'Chat ID é obrigatório'],
    index: true
  },
  
  type: {
    type: String,  // ✅ CORREÇÃO: String em vez de ObjectId
    enum: Object.values(MESSAGE_TYPES),
    required: [true, 'Tipo da mensagem é obrigatório'],
    default: MESSAGE_TYPES.USER
  },
  
  content: {
    type: String,
    required: [true, 'Conteúdo é obrigatório'],
    trim: true,
    maxlength: [5000, 'Mensagem deve ter no máximo 5000 caracteres']
  },
  
  metadata: {
    emailUpdated: {
      type: Boolean,
      default: false
    },
    
    suggestions: [{
      type: String,
      trim: true
    }],
    
    modelUsed: {
      type: String,
      default: null
    },
    
    model: {
      type: String,
      default: null
    },
    
    processingTime: {
      type: Number,
      default: 0
    },
    
    executionTime: {
      type: Number,
      default: 0
    },
    
    enhancedFeatures: [{
      type: String
    }],
    
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    
    isWelcome: {
      type: Boolean,
      default: false
    },
    
    projectContextUsed: {
      type: Boolean,
      default: false
    },
    
    analysisData: Schema.Types.Mixed,
    originalPrompt: String,
    modifications: [Schema.Types.Mixed],
    
    performance: {
      processingTime: Number,
      modelUsed: String,
      tokensConsumed: Number,
      cacheHit: Boolean,
      retryCount: Number,
      qualityScore: Number
    },
    
    tokens: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.MESSAGES || 'messages'
})

// Indexes
messageSchema.index({ chatId: 1, createdAt: 1 })
messageSchema.index({ type: 1 })
messageSchema.index({ createdAt: -1 })

// ✅ Métodos de instância
messageSchema.methods.isUserMessage = function(): boolean {
  return this.type === MESSAGE_TYPES.USER
}

messageSchema.methods.isAIMessage = function(): boolean {
  return this.type === MESSAGE_TYPES.AI
}

messageSchema.methods.hasEmailUpdate = function(): boolean {
  return this.metadata?.emailUpdated === true
}

messageSchema.methods.getTokenUsage = function(): number {
  return this.metadata?.tokens || this.metadata?.performance?.tokensConsumed || 0
}

messageSchema.methods.getExecutionTime = function(): number {
  return this.metadata?.executionTime || this.metadata?.performance?.processingTime || 0
}

// ✅ Virtual para estatísticas
messageSchema.virtual('stats').get(function() {
  return {
    type: this.type,
    hasEmailUpdate: this.hasEmailUpdate(),
    tokenUsage: this.getTokenUsage(),
    executionTime: this.getExecutionTime(),
    hasSuggestions: this.metadata?.suggestions?.length > 0,
    confidence: this.metadata?.confidence,
    model: this.metadata?.model || this.metadata?.modelUsed,
    wordCount: this.content ? this.content.split(' ').length : 0,
    characterCount: this.content ? this.content.length : 0
  }
})

// Configurar toJSON
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