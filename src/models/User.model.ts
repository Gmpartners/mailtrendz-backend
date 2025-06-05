import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'
import { IUser } from '../types/auth.types'
import { SUBSCRIPTION_TYPES, COLLECTIONS, API_LIMITS, SECURITY } from '../utils/constants'

export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>
  incrementAPIUsage(): Promise<void>
  resetAPIUsage(): Promise<void>
  canMakeAPIRequest(): boolean
  getAPIUsagePercentage(): number
  fullProfile: any
}

const userSchema = new Schema<IUserDocument>({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [50, 'Nome deve ter no máximo 50 caracteres']
  },
  
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [8, 'Senha deve ter pelo menos 8 caracteres'],
    select: false
  },
  
  avatar: {
    type: String,
    default: null
  },
  
  subscription: {
    type: String,
    enum: Object.values(SUBSCRIPTION_TYPES),
    default: SUBSCRIPTION_TYPES.FREE
  },
  
  apiUsage: {
    currentMonth: {
      type: Number,
      default: 0
    },
    limit: {
      type: Number,
      default: function() {
        return API_LIMITS[this.subscription as keyof typeof API_LIMITS]?.MONTHLY_AI_REQUESTS || 50
      }
    },
    resetDate: {
      type: Date,
      default: () => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth() + 1, 1)
      }
    }
  },
  
  preferences: {
    defaultIndustry: {
      type: String,
      default: null
    },
    defaultTone: {
      type: String,
      default: 'profissional'
    },
    emailSignature: {
      type: String,
      default: null,
      maxlength: [500, 'Assinatura deve ter no máximo 500 caracteres']
    }
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerificationToken: {
    type: String,
    default: null,
    select: false
  },
  
  passwordResetToken: {
    type: String,
    default: null,
    select: false
  },
  
  passwordResetExpires: {
    type: Date,
    default: null,
    select: false
  },
  
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: COLLECTIONS.USERS
})

// Indexes para performance
userSchema.index({ 'apiUsage.resetDate': 1 })
userSchema.index({ subscription: 1 })
userSchema.index({ createdAt: -1 })

// Hash da senha antes de salvar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(SECURITY.BCRYPT_ROUNDS)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error as Error)
  }
})

// Atualizar limite da API quando subscription muda
userSchema.pre('save', function(next) {
  if (this.isModified('subscription')) {
    const limits = API_LIMITS[this.subscription as keyof typeof API_LIMITS]
    if (limits) {
      this.apiUsage.limit = limits.MONTHLY_AI_REQUESTS
    }
  }
  next()
})

// Reset mensal do uso da API
userSchema.pre('save', function(next) {
  const now = new Date()
  if (this.apiUsage.resetDate <= now) {
    this.apiUsage.currentMonth = 0
    this.apiUsage.resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  }
  next()
})

// Método para comparar senhas
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    return false
  }
}

// Método para incrementar uso da API
userSchema.methods.incrementAPIUsage = async function(): Promise<void> {
  this.apiUsage.currentMonth += 1
  await this.save()
}

// Método para resetar uso da API
userSchema.methods.resetAPIUsage = async function(): Promise<void> {
  this.apiUsage.currentMonth = 0
  const now = new Date()
  this.apiUsage.resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  await this.save()
}

// Verificar se pode fazer request para API
userSchema.methods.canMakeAPIRequest = function(): boolean {
  return this.apiUsage.currentMonth < this.apiUsage.limit
}

// Obter porcentagem de uso da API
userSchema.methods.getAPIUsagePercentage = function(): number {
  return Math.round((this.apiUsage.currentMonth / this.apiUsage.limit) * 100)
}

// Método virtual para dados públicos do usuário
userSchema.virtual('publicProfile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    subscription: this.subscription,
    createdAt: this.createdAt
  }
})

// Método virtual para perfil completo
userSchema.virtual('fullProfile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    subscription: this.subscription,
    apiUsage: {
      currentMonth: this.apiUsage.currentMonth,
      limit: this.apiUsage.limit,
      percentage: this.getAPIUsagePercentage(),
      resetDate: this.apiUsage.resetDate
    },
    preferences: this.preferences,
    isEmailVerified: this.isEmailVerified,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  }
})

// Configurar toJSON para remover campos sensíveis
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password
    delete ret.emailVerificationToken
    delete ret.passwordResetToken
    delete ret.passwordResetExpires
    delete ret.__v
    ret.id = ret._id
    delete ret._id
    return ret
  }
})

export const User = mongoose.model<IUserDocument>('User', userSchema)
