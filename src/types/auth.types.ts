import { Request } from 'express'
import { SubscriptionType } from './subscription.types'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    name?: string
    subscription: SubscriptionType
    credits?: number
    api_key?: string
    api_usage?: number
    api_limit?: number
    created_at?: string
    email_verified?: boolean
  }
  creditsToConsume?: number
  shouldConsumeRequest?: boolean
  requestsToConsume?: number
  subscription?: {
    planType: SubscriptionType
    creditsAvailable: number
    features: {
      maxProjects: number
      hasFolders: boolean
      hasHtmlExport: boolean
      hasEmailPreview: boolean
    }
  }
  shouldConsumeCredits?: boolean
  chat?: any
}

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data?: {
    user: any
    accessToken: string
    refreshToken: string
  }
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  subscription: SubscriptionType
  apiUsage: {
    currentMonth: number
    limit: number
    percentage: number
    resetDate: Date
  }
  preferences: {
    defaultIndustry?: string
    defaultTone?: string
    emailSignature?: string
  }
  stats: {
    totalProjects: number
    totalEmails: number
    thisMonth: number
  }
  createdAt: Date
}

export interface PasswordResetDto {
  email: string
}

export interface PasswordUpdateDto {
  token: string
  newPassword: string
  confirmPassword: string
}

export interface ProfileUpdateDto {
  name?: string
  avatar?: string
  preferences?: {
    defaultIndustry?: string
    defaultTone?: string
    emailSignature?: string
  }
}
