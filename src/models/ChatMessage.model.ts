import mongoose, { Schema, Document, Types } from 'mongoose'
import { IMessage } from '../types/chat.types'
import { MESSAGE_TYPES, COLLECTIONS } from '../utils/constants'

export interface IChatMessageDocument extends Omit<IMessage, '_id' | 'id'>, Document {
  isUserMessage(): boolean
  isAIMessage(): boolean
  hasEmailUpdate(): boolean
  getTokenUsage(): number
  getExecutionTime(): number
}

const chatMessageSchema = new Schema<IChatMessageDocument>({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: [true, 'Chat ID é obrigatório'],
    index: true
  },
  
  type: {
    type: String,
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
    
    model: {
      type: String,
      default: null
    },
    
    tokens: {
      type: Number,
      default: 0,
      min: 0
    },
    
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null
    },
    
    executionTime: {
      type: Number,
      default: 0,
      min: 0
    },

    aiMode: {
      type: String,
      enum: ['standard', 'enhanced', 'adaptive', 'fallback', 'error'],
      default: 'standard'
    },

    enhancedFeatures: [{
      type: String
    }],

    analysis: {
      confidence: { type: Number, min: 0, max: 1 },
      intentionsCount: { type: Number, min: 0 },
      hasVisualReqs: { type: Boolean, default: false }
    },

    error: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  collection: 'chatmessages'
})

chatMessageSchema.index({ chatId: 1, createdAt: 1 })
chatMessageSchema.index({ type: 1, createdAt: -1 })
chatMessageSchema.index({ 'metadata.emailUpdated': 1 })

chatMessageSchema.methods.isUserMessage = function(): boolean {
  return this.type === MESSAGE_TYPES.USER
}

chatMessageSchema.methods.isAIMessage = function(): boolean {
  return this.type === MESSAGE_TYPES.AI
}

chatMessageSchema.methods.hasEmailUpdate = function(): boolean {
  return this.metadata?.emailUpdated === true
}

chatMessageSchema.methods.getTokenUsage = function(): number {
  return this.metadata?.tokens || 0
}

chatMessageSchema.methods.getExecutionTime = function(): number {
  return this.metadata?.executionTime || 0
}

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
