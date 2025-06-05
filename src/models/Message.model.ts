import mongoose, { Schema, Document, Types } from 'mongoose'
import { IMessage } from '../types/chat.types'
import { MESSAGE_TYPES, COLLECTIONS } from '../utils/constants'

export interface IMessageDocument extends IMessage, Document {
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
    }
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.MESSAGES
})

// Indexes para performance
messageSchema.index({ chatId: 1, createdAt: 1 })
messageSchema.index({ type: 1, createdAt: -1 })
messageSchema.index({ 'metadata.emailUpdated': 1 })
messageSchema.index({ 'metadata.model': 1 })
messageSchema.index({ createdAt: -1 })

// Métodos de instância
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
  return this.metadata?.tokens || 0
}

messageSchema.methods.getExecutionTime = function(): number {
  return this.metadata?.executionTime || 0
}

// Método virtual para estatísticas
messageSchema.virtual('stats').get(function() {
  return {
    type: this.type,
    hasEmailUpdate: this.hasEmailUpdate(),
    tokenUsage: this.getTokenUsage(),
    executionTime: this.getExecutionTime(),
    hasSuggestions: this.metadata?.suggestions?.length > 0,
    suggestionCount: this.metadata?.suggestions?.length || 0,
    confidence: this.metadata?.confidence,
    model: this.metadata?.model,
    wordCount: this.content.split(' ').length,
    characterCount: this.content.length
  }
})

// Métodos estáticos
messageSchema.statics.findByChat = function(chatId: string, filters: any = {}) {
  return this.find({ chatId, ...filters }).sort({ createdAt: 1 })
}

messageSchema.statics.findRecent = function(chatId: string, limit: number = 50) {
  return this.find({ chatId })
    .sort({ createdAt: -1 })
    .limit(limit)
}

messageSchema.statics.findWithEmailUpdates = function(chatId: string) {
  return this.find({ 
    chatId, 
    'metadata.emailUpdated': true 
  }).sort({ createdAt: 1 })
}

messageSchema.statics.getChatStats = async function(chatId: string) {
  const stats = await this.aggregate([
    { $match: { chatId: new Types.ObjectId(chatId) } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgTokens: { $avg: '$metadata.tokens' },
        avgExecutionTime: { $avg: '$metadata.executionTime' },
        totalTokens: { $sum: '$metadata.tokens' },
        emailUpdates: { 
          $sum: { $cond: ['$metadata.emailUpdated', 1, 0] } 
        }
      }
    }
  ])
  
  return stats
}

messageSchema.statics.getTokenUsage = async function(chatId: string, dateFrom?: Date, dateTo?: Date) {
  const matchStage: any = { chatId: new Types.ObjectId(chatId) }
  
  if (dateFrom || dateTo) {
    matchStage.createdAt = {}
    if (dateFrom) matchStage.createdAt.$gte = dateFrom
    if (dateTo) matchStage.createdAt.$lte = dateTo
  }
  
  const usage = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: '$metadata.tokens' },
        totalMessages: { $sum: 1 },
        avgTokensPerMessage: { $avg: '$metadata.tokens' },
        emailUpdates: { 
          $sum: { $cond: ['$metadata.emailUpdated', 1, 0] } 
        }
      }
    }
  ])
  
  return usage[0] || {
    totalTokens: 0,
    totalMessages: 0,
    avgTokensPerMessage: 0,
    emailUpdates: 0
  }
}

messageSchema.statics.getPerformanceMetrics = async function(chatId: string) {
  const metrics = await this.aggregate([
    { $match: { chatId: new Types.ObjectId(chatId), type: MESSAGE_TYPES.AI } },
    {
      $group: {
        _id: null,
        avgExecutionTime: { $avg: '$metadata.executionTime' },
        minExecutionTime: { $min: '$metadata.executionTime' },
        maxExecutionTime: { $max: '$metadata.executionTime' },
        avgConfidence: { $avg: '$metadata.confidence' },
        totalAIMessages: { $sum: 1 },
        modelsUsed: { $addToSet: '$metadata.model' }
      }
    }
  ])
  
  return metrics[0] || {
    avgExecutionTime: 0,
    minExecutionTime: 0,
    maxExecutionTime: 0,
    avgConfidence: 0,
    totalAIMessages: 0,
    modelsUsed: []
  }
}

messageSchema.statics.searchMessages = function(chatId: string, query: string, limit: number = 20) {
  return this.find({
    chatId,
    $text: { $search: query }
  })
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit)
}

messageSchema.statics.getConversationFlow = async function(chatId: string) {
  const messages = await this.find({ chatId })
    .sort({ createdAt: 1 })
    .select('type createdAt metadata.emailUpdated')
  
  const flow = messages.map((msg, index) => ({
    position: index + 1,
    type: msg.type,
    timestamp: msg.createdAt,
    emailUpdated: msg.metadata?.emailUpdated || false,
    timeSincePrevious: index > 0 ? 
      msg.createdAt.getTime() - messages[index - 1].createdAt.getTime() : 0
  }))
  
  return flow
}

// Text search index
messageSchema.index({ 
  content: 'text' 
}, {
  weights: { content: 1 }
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