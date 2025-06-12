import mongoose, { Schema, Document, Types } from 'mongoose'
import { IChat } from '../types/chat.types'
import { COLLECTIONS } from '../utils/constants'

// ✅ INTERFACE CORRIGIDA COM TODOS OS MÉTODOS
export interface IChatDocument extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  projectId: Types.ObjectId
  title: string
  messages: Types.ObjectId[]
  isActive: boolean
  metadata: {
    totalMessages: number
    lastActivity: Date
    emailUpdates: number
  }
  createdAt: Date
  updatedAt: Date
  
  // ✅ MÉTODOS DECLARADOS NA INTERFACE
  addMessage(messageId: Types.ObjectId): Promise<void>
  updateActivity(): Promise<void>
  incrementEmailUpdates(): Promise<void>
  getMessageCount(): number
  isOwner(userId: string): boolean
}

const chatSchema = new Schema<IChatDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID é obrigatório']
  },
  
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID é obrigatório'],
    unique: true
  },
  
  title: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [100, 'Título deve ter no máximo 100 caracteres'],
    default: 'Novo Chat'
  },
  
  messages: [{
    type: Schema.Types.ObjectId,
    ref: 'Message'
  }],
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  metadata: {
    totalMessages: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    emailUpdates: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.CHATS
})

// ✅ INDEXES
chatSchema.index({ userId: 1, createdAt: -1 })
chatSchema.index({ userId: 1, isActive: 1 })
chatSchema.index({ 'metadata.lastActivity': -1 })

// ✅ MIDDLEWARE
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.metadata.lastActivity = new Date()
  }
  next()
})

// ✅ MÉTODOS IMPLEMENTADOS
chatSchema.methods.addMessage = async function(this: IChatDocument, messageId: Types.ObjectId): Promise<void> {
  this.messages.push(messageId)
  this.metadata.totalMessages = this.messages.length
  this.metadata.lastActivity = new Date()
  await this.save()
}

chatSchema.methods.updateActivity = async function(this: IChatDocument): Promise<void> {
  this.metadata.lastActivity = new Date()
  await this.save()
}

chatSchema.methods.incrementEmailUpdates = async function(this: IChatDocument): Promise<void> {
  this.metadata.emailUpdates += 1
  await this.save()
}

chatSchema.methods.getMessageCount = function(this: IChatDocument): number {
  return this.messages.length
}

chatSchema.methods.isOwner = function(this: IChatDocument, userId: string): boolean {
  return this.userId.toString() === userId
}

// ✅ VIRTUAL CORRIGIDO
chatSchema.virtual('stats').get(function(this: IChatDocument) {
  const lastActivity = this.metadata?.lastActivity || new Date()
  const createdAt = this.createdAt || new Date()
  
  return {
    totalMessages: this.metadata?.totalMessages || 0,
    emailUpdates: this.metadata?.emailUpdates || 0,
    lastActivity: lastActivity,
    isRecent: (Date.now() - (lastActivity instanceof Date ? lastActivity.getTime() : Date.parse(lastActivity))) < (24 * 60 * 60 * 1000),
    ageInDays: Math.floor((Date.now() - (createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt))) / (24 * 60 * 60 * 1000))
  }
})

// ✅ STATICS
chatSchema.statics.findByUser = function(userId: string, filters: any = {}) {
  return this.find({ userId, ...filters })
    .populate('projectId', 'name type')
    .sort({ 'metadata.lastActivity': -1 })
}

chatSchema.statics.findByProject = function(projectId: string) {
  return this.findOne({ projectId })
    .populate('messages')
    .populate('projectId', 'name type')
}

chatSchema.statics.getActiveChats = function(userId: string) {
  return this.find({ 
    userId, 
    isActive: true,
    'metadata.lastActivity': { 
      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  })
  .populate('projectId', 'name type')
  .sort({ 'metadata.lastActivity': -1 })
  .limit(10)
}

chatSchema.statics.getUserStats = async function(userId: string) {
  const stats = await this.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalChats: { $sum: 1 },
        activeChats: { 
          $sum: { $cond: ['$isActive', 1, 0] } 
        },
        totalMessages: { $sum: '$metadata.totalMessages' },
        totalEmailUpdates: { $sum: '$metadata.emailUpdates' },
        avgMessagesPerChat: { $avg: '$metadata.totalMessages' },
        avgEmailUpdatesPerChat: { $avg: '$metadata.emailUpdates' }
      }
    }
  ])
  
  return stats[0] || {
    totalChats: 0,
    activeChats: 0,
    totalMessages: 0,
    totalEmailUpdates: 0,
    avgMessagesPerChat: 0,
    avgEmailUpdatesPerChat: 0
  }
}

chatSchema.statics.getRecentActivity = async function(userId: string, days: number = 7) {
  const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  
  return this.aggregate([
    { 
      $match: { 
        userId: new Types.ObjectId(userId),
        'metadata.lastActivity': { $gte: dateLimit }
      } 
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$metadata.lastActivity'
          }
        },
        chats: { $sum: 1 },
        messages: { $sum: '$metadata.totalMessages' },
        emailUpdates: { $sum: '$metadata.emailUpdates' }
      }
    },
    { $sort: { '_id': 1 } }
  ])
}

// ✅ JSON CONFIG
chatSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v
    ret.id = ret._id
    delete ret._id
    return ret
  }
})

export const Chat = mongoose.model<IChatDocument>('Chat', chatSchema)
