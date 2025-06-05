import mongoose, { Schema, Document, Types } from 'mongoose'
import { IProject } from '../types/project.types'
import { PROJECT_TYPES, PROJECT_STATUS, COLLECTIONS, EMAIL_COLORS } from '../utils/constants'

export interface IProjectDocument extends IProject, Document {
  incrementViews(): Promise<void>
  incrementUses(): Promise<void>
  updateStats(opens: number, clicks: number): Promise<void>
  getConversionRate(): number
  isOwner(userId: string): boolean
}

const projectSchema = new Schema<IProjectDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID é obrigatório'],
    index: true
  },
  
  name: {
    type: String,
    required: [true, 'Nome do projeto é obrigatório'],
    trim: true,
    minlength: [3, 'Nome deve ter pelo menos 3 caracteres'],
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  
  description: {
    type: String,
    required: [true, 'Descrição é obrigatória'],
    trim: true,
    maxlength: [500, 'Descrição deve ter no máximo 500 caracteres']
  },
  
  type: {
    type: String,
    enum: Object.values(PROJECT_TYPES),
    required: [true, 'Tipo do projeto é obrigatório'],
    default: PROJECT_TYPES.CAMPAIGN
  },
  
  status: {
    type: String,
    enum: Object.values(PROJECT_STATUS),
    default: PROJECT_STATUS.DRAFT
  },
  
  content: {
    html: {
      type: String,
      required: [true, 'Conteúdo HTML é obrigatório']
    },
    text: {
      type: String,
      required: [true, 'Conteúdo texto é obrigatório']
    },
    subject: {
      type: String,
      required: [true, 'Assunto é obrigatório'],
      trim: true,
      maxlength: [100, 'Assunto deve ter no máximo 100 caracteres']
    },
    previewText: {
      type: String,
      trim: true,
      maxlength: [200, 'Texto de preview deve ter no máximo 200 caracteres']
    }
  },
  
  metadata: {
    industry: {
      type: String,
      required: [true, 'Indústria é obrigatória'],
      trim: true
    },
    targetAudience: {
      type: String,
      trim: true
    },
    tone: {
      type: String,
      trim: true,
      default: 'profissional'
    },
    originalPrompt: {
      type: String,
      required: [true, 'Prompt original é obrigatório'],
      trim: true,
      maxlength: [1000, 'Prompt deve ter no máximo 1000 caracteres']
    },
    version: {
      type: Number,
      default: 1
    },
    lastImprovement: {
      feedback: String,
      timestamp: Date,
      version: Number
    }
  },
  
  stats: {
    opens: {
      type: Number,
      default: 0,
      min: 0
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0
    },
    uses: {
      type: Number,
      default: 1,
      min: 0
    },
    views: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag deve ter no máximo 30 caracteres']
  }],
  
  color: {
    type: String,
    default: function() {
      return EMAIL_COLORS[this.type as keyof typeof EMAIL_COLORS] || '#6b7280'
    }
  },
  
  isPublic: {
    type: Boolean,
    default: false
  },
  
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    default: null
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.PROJECTS
})

// Indexes para performance
projectSchema.index({ userId: 1, createdAt: -1 })
projectSchema.index({ userId: 1, type: 1 })
projectSchema.index({ userId: 1, status: 1 })
projectSchema.index({ userId: 1, 'stats.uses': -1 })
projectSchema.index({ tags: 1 })
projectSchema.index({ 'metadata.industry': 1 })
projectSchema.index({ isPublic: 1, createdAt: -1 })
projectSchema.index({ 
  name: 'text', 
  description: 'text', 
  'metadata.originalPrompt': 'text' 
}, {
  weights: {
    name: 10,
    description: 5,
    'metadata.originalPrompt': 1
  }
})

// Middleware para definir cor baseada no tipo
projectSchema.pre('save', function(next) {
  if (this.isModified('type') && !this.isModified('color')) {
    this.color = EMAIL_COLORS[this.type as keyof typeof EMAIL_COLORS] || '#6b7280'
  }
  next()
})

// Métodos de instância
projectSchema.methods.incrementViews = async function(): Promise<void> {
  this.stats.views += 1
  await this.save()
}

projectSchema.methods.incrementUses = async function(): Promise<void> {
  this.stats.uses += 1
  await this.save()
}

projectSchema.methods.updateStats = async function(opens: number, clicks: number): Promise<void> {
  this.stats.opens = opens
  this.stats.clicks = clicks
  await this.save()
}

projectSchema.methods.getConversionRate = function(): number {
  if (this.stats.opens === 0) return 0
  return Math.round((this.stats.clicks / this.stats.opens) * 100)
}

projectSchema.methods.isOwner = function(userId: string): boolean {
  return this.userId.toString() === userId
}

// Método virtual para dados públicos
projectSchema.virtual('publicData').get(function() {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    type: this.type,
    status: this.status,
    tags: this.tags,
    color: this.color,
    stats: this.stats,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  }
})

// Método virtual para performance metrics
projectSchema.virtual('performance').get(function() {
  const conversionRate = this.getConversionRate()
  const engagementScore = this.stats.views > 0 ? 
    Math.round(((this.stats.opens + this.stats.clicks * 2) / this.stats.views) * 100) : 0
  
  return {
    conversionRate,
    engagementScore,
    totalInteractions: this.stats.opens + this.stats.clicks + this.stats.uses,
    efficiency: this.stats.uses > 0 ? Math.round(this.stats.clicks / this.stats.uses) : 0
  }
})

// Métodos estáticos
projectSchema.statics.findByUser = function(userId: string, filters: any = {}) {
  return this.find({ userId, ...filters }).sort({ updatedAt: -1 })
}

projectSchema.statics.findPublic = function(filters: any = {}) {
  return this.find({ isPublic: true, ...filters }).sort({ createdAt: -1 })
}

projectSchema.statics.getTypeStats = async function(userId: string) {
  const stats = await this.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgOpens: { $avg: '$stats.opens' },
        avgClicks: { $avg: '$stats.clicks' },
        totalUses: { $sum: '$stats.uses' }
      }
    }
  ])
  
  return stats
}

projectSchema.statics.getUserStats = async function(userId: string) {
  const stats = await this.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        totalOpens: { $sum: '$stats.opens' },
        totalClicks: { $sum: '$stats.clicks' },
        totalUses: { $sum: '$stats.uses' },
        avgConversion: { 
          $avg: { 
            $cond: [
              { $gt: ['$stats.opens', 0] },
              { $multiply: [{ $divide: ['$stats.clicks', '$stats.opens'] }, 100] },
              0
            ]
          }
        }
      }
    }
  ])
  
  return stats[0] || {
    totalProjects: 0,
    totalOpens: 0,
    totalClicks: 0,
    totalUses: 0,
    avgConversion: 0
  }
}

projectSchema.statics.getPopularTags = async function(userId?: string) {
  const matchStage = userId ? { userId: new Types.ObjectId(userId) } : { isPublic: true }
  
  const tags = await this.aggregate([
    { $match: matchStage },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ])
  
  return tags
}

// Configurar toJSON
projectSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v
    ret.id = ret._id
    delete ret._id
    return ret
  }
})

export const Project = mongoose.model<IProjectDocument>('Project', projectSchema)