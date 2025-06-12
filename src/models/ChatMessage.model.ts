import mongoose, { Schema, Document, Types } from 'mongoose'
import { IMessage } from '../types/chat.types'
import { MESSAGE_TYPES, COLLECTIONS } from '../utils/constants'

// ✅ CORREÇÃO: Interface melhorada para ChatMessage
export interface IChatMessageDocument extends Omit<IMessage, '_id' | 'id'>, Document {
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
    maxlength: [10000, 'Mensagem deve ter no máximo 10000 caracteres'] // ✅ Aumentado limite
  },
  
  metadata: {
    emailUpdated: {
      type: Boolean,
      default: false
    },
    
    suggestions: [{
      type: String,
      trim: true,
      maxlength: [200, 'Sugestão muito longa']
    }],
    
    model: {
      type: String,
      default: null,
      trim: true
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
    
    // ✅ NOVO: Campos para Enhanced AI
    enhancedFeatures: [{
      type: String,
      trim: true
    }],
    
    isWelcome: {
      type: Boolean,
      default: false
    },
    
    projectContextUsed: {
      type: Boolean,
      default: false
    },
    
    analysisData: {
      intentions: [{
        action: String,
        target: String,
        confidence: Number
      }],
      visualRequirements: Schema.Types.Mixed,
      contentRequirements: Schema.Types.Mixed
    },
    
    originalPrompt: {
      type: String,
      trim: true
    },
    
    // ✅ NOVO: Histórico de modificações
    modifications: [{
      timestamp: {
        type: Date,
        default: Date.now
      },
      type: {
        type: String,
        enum: ['content', 'style', 'structure', 'optimization']
      },
      description: String,
      beforeValue: String,
      afterValue: String
    }],
    
    // ✅ NOVO: Dados de performance
    performance: {
      processingTime: Number,
      modelUsed: String,
      tokensConsumed: Number,
      cacheHit: Boolean,
      retryCount: Number,
      qualityScore: Number
    }
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.MESSAGES || 'chatmessages'
})

// ✅ NOVO: Indexes para performance melhorada
chatMessageSchema.index({ chatId: 1, createdAt: 1 })
chatMessageSchema.index({ chatId: 1, type: 1 })
chatMessageSchema.index({ type: 1, createdAt: -1 })
chatMessageSchema.index({ 'metadata.emailUpdated': 1 })
chatMessageSchema.index({ 'metadata.model': 1 })
chatMessageSchema.index({ 'metadata.projectContextUsed': 1 })
chatMessageSchema.index({ createdAt: -1 })

// ✅ NOVO: Index de texto para busca
chatMessageSchema.index({ 
  content: 'text',
  'metadata.originalPrompt': 'text'
}, {
  weights: { 
    content: 10,
    'metadata.originalPrompt': 5
  }
})

// Middleware para validação antes de salvar
chatMessageSchema.pre('save', function(next) {
  // Garantir que metadata existe
  if (!this.metadata) {
    this.metadata = {}
  }
  
  // Validar confidence se fornecido
  if (this.metadata.confidence !== null && 
      (this.metadata.confidence < 0 || this.metadata.confidence > 1)) {
    this.metadata.confidence = null
  }
  
  // Limpar sugestões vazias
  if (this.metadata.suggestions) {
    this.metadata.suggestions = this.metadata.suggestions
      .filter(s => s && s.trim().length > 0)
      .slice(0, 10) // Máximo 10 sugestões
  }
  
  // Limpar enhanced features vazios
  if (this.metadata.enhancedFeatures) {
    this.metadata.enhancedFeatures = this.metadata.enhancedFeatures
      .filter(f => f && f.trim().length > 0)
      .slice(0, 20) // Máximo 20 features
  }
  
  next()
})

// ✅ NOVOS: Métodos de instância melhorados
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
  return this.metadata?.tokens || this.metadata?.performance?.tokensConsumed || 0
}

chatMessageSchema.methods.getExecutionTime = function(): number {
  return this.metadata?.executionTime || this.metadata?.performance?.processingTime || 0
}

chatMessageSchema.methods.isEnhancedMessage = function(): boolean {
  return !!(this.metadata?.enhancedFeatures?.length > 0 || 
           this.metadata?.projectContextUsed ||
           this.metadata?.analysisData)
}

chatMessageSchema.methods.getConfidenceLevel = function(): string {
  const confidence = this.metadata?.confidence
  if (!confidence) return 'unknown'
  
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.6) return 'medium'
  if (confidence >= 0.4) return 'low'
  return 'very-low'
}

// ✅ NOVO: Método virtual para estatísticas completas
chatMessageSchema.virtual('stats').get(function() {
  return {
    type: this.type,
    hasEmailUpdate: this.hasEmailUpdate(),
    tokenUsage: this.getTokenUsage(),
    executionTime: this.getExecutionTime(),
    isEnhanced: this.isEnhancedMessage(),
    confidenceLevel: this.getConfidenceLevel(),
    hasSuggestions: this.metadata?.suggestions?.length > 0,
    suggestionCount: this.metadata?.suggestions?.length || 0,
    confidence: this.metadata?.confidence,
    model: this.metadata?.model || this.metadata?.performance?.modelUsed,
    wordCount: this.content ? this.content.split(' ').length : 0,
    characterCount: this.content ? this.content.length : 0,
    enhancedFeatures: this.metadata?.enhancedFeatures || [],
    projectContextUsed: this.metadata?.projectContextUsed || false,
    modificationsCount: this.metadata?.modifications?.length || 0,
    qualityScore: this.metadata?.performance?.qualityScore
  }
})

// ✅ NOVOS: Métodos estáticos melhorados
chatMessageSchema.statics.findByChat = function(chatId: string, filters: any = {}) {
  return this.find({ chatId, ...filters }).sort({ createdAt: 1 })
}

chatMessageSchema.statics.findRecent = function(chatId: string, limit: number = 50) {
  return this.find({ chatId })
    .sort({ createdAt: -1 })
    .limit(limit)
}

chatMessageSchema.statics.findWithEmailUpdates = function(chatId: string) {
  return this.find({ 
    chatId, 
    'metadata.emailUpdated': true 
  }).sort({ createdAt: 1 })
}

chatMessageSchema.statics.findEnhancedMessages = function(chatId: string) {
  return this.find({
    chatId,
    $or: [
      { 'metadata.enhancedFeatures.0': { $exists: true } },
      { 'metadata.projectContextUsed': true },
      { 'metadata.analysisData': { $exists: true } }
    ]
  }).sort({ createdAt: 1 })
}

chatMessageSchema.statics.getChatStats = async function(chatId: string) {
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
        },
        enhancedMessages: {
          $sum: { $cond: ['$metadata.projectContextUsed', 1, 0] }
        },
        avgConfidence: { $avg: '$metadata.confidence' }
      }
    }
  ])
  
  return stats
}

chatMessageSchema.statics.getPerformanceMetrics = async function(chatId: string) {
  const metrics = await this.aggregate([
    { 
      $match: { 
        chatId: new Types.ObjectId(chatId), 
        type: MESSAGE_TYPES.AI 
      } 
    },
    {
      $group: {
        _id: null,
        avgExecutionTime: { $avg: '$metadata.executionTime' },
        minExecutionTime: { $min: '$metadata.executionTime' },
        maxExecutionTime: { $max: '$metadata.executionTime' },
        avgConfidence: { $avg: '$metadata.confidence' },
        totalAIMessages: { $sum: 1 },
        modelsUsed: { $addToSet: '$metadata.model' },
        enhancedMessagesCount: {
          $sum: { $cond: ['$metadata.projectContextUsed', 1, 0] }
        },
        avgQualityScore: { $avg: '$metadata.performance.qualityScore' },
        totalTokensConsumed: { $sum: '$metadata.tokens' }
      }
    }
  ])
  
  return metrics[0] || {
    avgExecutionTime: 0,
    minExecutionTime: 0,
    maxExecutionTime: 0,
    avgConfidence: 0,
    totalAIMessages: 0,
    modelsUsed: [],
    enhancedMessagesCount: 0,
    avgQualityScore: 0,
    totalTokensConsumed: 0
  }
}

chatMessageSchema.statics.getConversationFlow = async function(chatId: string) {
  const messages = await this.find({ chatId })
    .sort({ createdAt: 1 })
    .select('type createdAt metadata.emailUpdated metadata.projectContextUsed metadata.confidence')
  
  const flow = messages.map((msg, index) => ({
    position: index + 1,
    type: msg.type,
    timestamp: msg.createdAt,
    emailUpdated: msg.metadata?.emailUpdated || false,
    projectContextUsed: msg.metadata?.projectContextUsed || false,
    confidence: msg.metadata?.confidence,
    timeSincePrevious: index > 0 ? 
      msg.createdAt.getTime() - messages[index - 1].createdAt.getTime() : 0
  }))
  
  return flow
}

chatMessageSchema.statics.searchMessages = function(
  chatId: string, 
  query: string, 
  limit: number = 20
) {
  return this.find({
    chatId,
    $text: { $search: query }
  })
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit)
}

chatMessageSchema.statics.getMessagesByTimeRange = function(
  chatId: string,
  startDate: Date,
  endDate: Date
) {
  return this.find({
    chatId,
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ createdAt: 1 })
}

chatMessageSchema.statics.getModificationHistory = async function(chatId: string) {
  const messages = await this.find({
    chatId,
    'metadata.modifications.0': { $exists: true }
  }).sort({ createdAt: 1 })
  
  const modifications = []
  
  messages.forEach(msg => {
    if (msg.metadata?.modifications) {
      msg.metadata.modifications.forEach(mod => {
        modifications.push({
          messageId: msg._id,
          timestamp: mod.timestamp,
          type: mod.type,
          description: mod.description,
          beforeValue: mod.beforeValue,
          afterValue: mod.afterValue
        })
      })
    }
  })
  
  return modifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

// ✅ NOVO: Método para limpar mensagens antigas
chatMessageSchema.statics.cleanupOldMessages = async function(
  retentionDays: number = 90
) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    'metadata.emailUpdated': { $ne: true } // Preservar mensagens que atualizaram emails
  })
  
  return {
    deletedCount: result.deletedCount,
    cutoffDate
  }
}

// Configurar toJSON para incluir virtuals
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