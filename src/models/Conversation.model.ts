import mongoose, { Schema, Document, Types } from 'mongoose'
import { COLLECTIONS } from '../utils/constants'

export interface IConversationMessage {
  id: Types.ObjectId
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

export interface IConversationDocument extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  projectId: Types.ObjectId
  
  conversation: {
    title: string
    createdAt: Date
    lastActivity: Date
    
    messages: IConversationMessage[]
    
    context: {
      projectSnapshot: {
        name: string
        currentHTML?: string
        currentSubject?: string
        industry: string
        tone: string
      }
      conversationState: {
        lastIntent?: string
        pendingModifications: string[]
        userPreferences: Record<string, any>
      }
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
  
  addMessage(type: 'user' | 'ai', content: string, metadata?: any): Promise<void>
  updateProjectSnapshot(project: any): Promise<void>
  getRecentMessages(limit?: number): IConversationMessage[]
  markEmailModified(): Promise<void>
}

const conversationSchema = new Schema<IConversationDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true,
    index: true
  },
  
  conversation: {
    title: {
      type: String,
      required: true,
      default: 'Nova Conversa'
    },
    
    createdAt: {
      type: Date,
      default: Date.now
    },
    
    lastActivity: {
      type: Date,
      default: Date.now
    },
    
    messages: [{
      id: {
        type: Schema.Types.ObjectId,
        default: () => new Types.ObjectId()
      },
      type: {
        type: String,
        enum: ['user', 'ai'],
        required: true
      },
      content: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      metadata: {
        model: String,
        emailUpdated: {
          type: Boolean,
          default: false
        },
        modifications: [String],
        confidence: Number,
        processingTime: Number
      }
    }],
    
    context: {
      projectSnapshot: {
        name: String,
        currentHTML: String,
        currentSubject: String,
        industry: {
          type: String,
          default: 'geral'
        },
        tone: {
          type: String,
          default: 'professional'
        }
      },
      conversationState: {
        lastIntent: String,
        pendingModifications: [String],
        userPreferences: {
          type: Schema.Types.Mixed,
          default: {}
        }
      }
    }
  },
  
  stats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    emailModifications: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    lastModified: {
      type: Date,
      default: Date.now
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.CONVERSATIONS || 'conversations'
})

// Indexes para performance
conversationSchema.index({ userId: 1, 'conversation.lastActivity': -1 })
conversationSchema.index({ projectId: 1 }, { unique: true })
conversationSchema.index({ 'conversation.messages.timestamp': -1 })
conversationSchema.index({ isActive: 1, userId: 1 })

// Métodos
conversationSchema.methods.addMessage = async function(
  this: IConversationDocument,
  type: 'user' | 'ai',
  content: string,
  metadata: any = {}
): Promise<void> {
  const message: IConversationMessage = {
    id: new Types.ObjectId(),
    type,
    content,
    timestamp: new Date(),
    metadata: {
      emailUpdated: false,
      modifications: [],
      ...metadata
    }
  }
  
  this.conversation.messages.push(message)
  this.conversation.lastActivity = new Date()
  this.stats.totalMessages = this.conversation.messages.length
  this.stats.lastModified = new Date()
  
  if (metadata.emailUpdated) {
    this.stats.emailModifications += 1
  }
  
  await this.save()
}

conversationSchema.methods.updateProjectSnapshot = async function(
  this: IConversationDocument,
  project: any
): Promise<void> {
  this.conversation.context.projectSnapshot = {
    name: project.name,
    currentHTML: project.content?.html,
    currentSubject: project.content?.subject,
    industry: project.metadata?.industry || 'geral',
    tone: project.metadata?.tone || 'professional'
  }
  
  await this.save()
}

conversationSchema.methods.getRecentMessages = function(
  this: IConversationDocument,
  limit: number = 50
): IConversationMessage[] {
  return this.conversation.messages
    .slice(-limit)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

conversationSchema.methods.markEmailModified = async function(
  this: IConversationDocument
): Promise<void> {
  this.stats.emailModifications += 1
  this.stats.lastModified = new Date()
  await this.save()
}

// Middleware
conversationSchema.pre('save', function(next) {
  this.conversation.lastActivity = new Date()
  next()
})

// JSON transform
conversationSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v
    ret.id = ret._id
    delete ret._id
    return ret
  }
})

export const Conversation = mongoose.model<IConversationDocument>('Conversation', conversationSchema)