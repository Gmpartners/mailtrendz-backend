import { Request } from 'express'
import { JwtPayload } from 'jsonwebtoken'

export interface IUser {
  _id: string
  name: string
  email: string
  password: string
  avatar?: string
  subscription: 'free' | 'pro' | 'enterprise'
  apiUsage: {
    currentMonth: number
    limit: number
    resetDate: Date
  }
  preferences: {
    defaultIndustry?: string
    defaultTone?: string
    emailSignature?: string
  }
  isEmailVerified: boolean
  emailVerificationToken?: string
  passwordResetToken?: string
  passwordResetExpires?: Date
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    subscription: string
  }
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
    user: Omit<IUser, 'password'>
    accessToken: string
    refreshToken: string
  }
}

export interface JwtTokenPayload extends JwtPayload {
  userId: string
  email: string
  subscription: string
}

export interface RefreshTokenPayload extends JwtPayload {
  userId: string
  tokenVersion: number
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  subscription: string
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