import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { User } from '../models/User.model'
import { LoginDto, RegisterDto, AuthResponse, UserProfile, JwtTokenPayload } from '../types/auth.types'
import { SECURITY } from '../utils/constants'
import { logger, loggerHelpers } from '../utils/logger'
import { 
  createUnauthorizedError, 
  createConflictError, 
  createNotFoundError,
  AppError 
} from '../middleware/error.middleware'

class AuthService {
  // Registro de novo usuário
  async register(userData: RegisterDto, ip: string): Promise<AuthResponse> {
    try {
      // Verificar se email já existe
      const existingUser = await User.findOne({ email: userData.email })
      if (existingUser) {
        throw createConflictError('Email já está em uso')
      }

      // Criar usuário
      const user = new User({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        emailVerificationToken: this.generateVerificationToken()
      })

      await user.save()

      // Gerar tokens
      const { accessToken, refreshToken } = this.generateTokens(user._id.toString(), user.email, user.subscription)

      // Log da ação
      loggerHelpers.auth.register(user._id.toString(), user.email, ip)

      return {
        success: true,
        message: 'Usuário criado com sucesso!',
        data: {
          user: user.fullProfile,
          accessToken,
          refreshToken
        }
      }
    } catch (error) {
      logger.error('Registration failed:', error)
      throw error
    }
  }

  // Login de usuário
  async login(credentials: LoginDto, ip: string): Promise<AuthResponse> {
    try {
      // Buscar usuário com senha
      const user = await User.findOne({ email: credentials.email }).select('+password')
      
      if (!user) {
        loggerHelpers.auth.failed(credentials.email, ip, 'user_not_found')
        throw createUnauthorizedError('Credenciais inválidas')
      }

      // Verificar senha
      const isPasswordValid = await user.comparePassword(credentials.password)
      if (!isPasswordValid) {
        loggerHelpers.auth.failed(credentials.email, ip, 'invalid_password')
        throw createUnauthorizedError('Credenciais inválidas')
      }

      // Atualizar último login
      user.lastLoginAt = new Date()
      await user.save()

      // Gerar tokens
      const { accessToken, refreshToken } = this.generateTokens(user._id.toString(), user.email, user.subscription)

      // Log da ação
      loggerHelpers.auth.login(user._id.toString(), user.email, ip)

      return {
        success: true,
        message: 'Login realizado com sucesso!',
        data: {
          user: user.fullProfile,
          accessToken,
          refreshToken
        }
      }
    } catch (error) {
      logger.error('Login failed:', error)
      throw error
    }
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any
      
      // Buscar usuário
      const user = await User.findById(decoded.userId)
      if (!user) {
        throw createUnauthorizedError('Token inválido')
      }

      // Gerar novos tokens
      const tokens = this.generateTokens(user._id.toString(), user.email, user.subscription)

      return {
        success: true,
        message: 'Token renovado com sucesso!',
        data: {
          user: user.fullProfile,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      }
    } catch (error) {
      logger.error('Token refresh failed:', error)
      throw createUnauthorizedError('Token inválido ou expirado')
    }
  }

  // Logout
  async logout(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId)
      if (user) {
        loggerHelpers.auth.logout(userId, user.email)
      }
      // Em implementação futura: invalidar refresh tokens no Redis
    } catch (error) {
      logger.error('Logout failed:', error)
      throw error
    }
  }

  // Obter perfil do usuário
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw createNotFoundError('Usuário')
      }

      // Buscar estatísticas do usuário (implementar depois)
      const stats = {
        totalProjects: 0,
        totalEmails: 0,
        thisMonth: 0
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        subscription: user.subscription,
        apiUsage: {
          currentMonth: user.apiUsage.currentMonth,
          limit: user.apiUsage.limit,
          percentage: user.getAPIUsagePercentage(),
          resetDate: user.apiUsage.resetDate
        },
        preferences: user.preferences,
        stats,
        createdAt: user.createdAt
      }
    } catch (error) {
      logger.error('Get user profile failed:', error)
      throw error
    }
  }

  // Atualizar perfil
  async updateProfile(userId: string, updates: any): Promise<UserProfile> {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw createNotFoundError('Usuário')
      }

      // Atualizar campos permitidos
      if (updates.name) user.name = updates.name
      if (updates.avatar) user.avatar = updates.avatar
      if (updates.preferences) {
        user.preferences = { ...user.preferences, ...updates.preferences }
      }

      await user.save()

      return this.getUserProfile(userId)
    } catch (error) {
      logger.error('Update profile failed:', error)
      throw error
    }
  }

  // Solicitação de reset de senha
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await User.findOne({ email })
      if (!user) {
        // Não revelar se o email existe por segurança
        return
      }

      const resetToken = this.generatePasswordResetToken()
      user.passwordResetToken = resetToken
      user.passwordResetExpires = new Date(Date.now() + SECURITY.PASSWORD_RESET_TIMEOUT)
      
      await user.save()

      // TODO: Enviar email com o token
      logger.info('Password reset requested', { userId: user._id, email })
    } catch (error) {
      logger.error('Password reset request failed:', error)
      throw error
    }
  }

  // Reset de senha
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      }).select('+passwordResetToken +passwordResetExpires')

      if (!user) {
        throw createUnauthorizedError('Token inválido ou expirado')
      }

      user.password = newPassword
      user.passwordResetToken = undefined
      user.passwordResetExpires = undefined
      
      await user.save()

      logger.info('Password reset completed', { userId: user._id })
    } catch (error) {
      logger.error('Password reset failed:', error)
      throw error
    }
  }

  // Verificação de email
  async verifyEmail(token: string): Promise<void> {
    try {
      const user = await User.findOne({ emailVerificationToken: token })
        .select('+emailVerificationToken')

      if (!user) {
        throw createUnauthorizedError('Token de verificação inválido')
      }

      user.isEmailVerified = true
      user.emailVerificationToken = undefined
      
      await user.save()

      logger.info('Email verified', { userId: user._id, email: user.email })
    } catch (error) {
      logger.error('Email verification failed:', error)
      throw error
    }
  }

  // Reenviar verificação de email
  async resendEmailVerification(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw createNotFoundError('Usuário')
      }

      if (user.isEmailVerified) {
        throw new AppError('Email já verificado', 400)
      }

      user.emailVerificationToken = this.generateVerificationToken()
      await user.save()

      // TODO: Enviar email de verificação
      logger.info('Email verification resent', { userId, email: user.email })
    } catch (error) {
      logger.error('Resend email verification failed:', error)
      throw error
    }
  }

  // Gerar tokens JWT - SIMPLIFICADO
  private generateTokens(userId: string, email: string, subscription: string) {
    try {
      // Access token - método mais simples
      const accessPayload = { userId, email, subscription }
      const accessToken = jwt.sign(
        accessPayload,
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
      )

      // Refresh token - método mais simples
      const refreshPayload = { userId, tokenVersion: 1 }
      const refreshToken = jwt.sign(
        refreshPayload,
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: '7d' }
      )

      return { accessToken, refreshToken }
    } catch (error) {
      logger.error('Generate tokens failed:', error)
      throw new Error('Falha ao gerar tokens de autenticação')
    }
  }

  // Gerar token de verificação
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  // Gerar token de reset de senha
  private generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  // Validar força da senha
  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Senha deve ter pelo menos 8 caracteres')
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula')
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula')
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Senha deve conter pelo menos um número')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Estatísticas de usuários (admin)
  async getUserStats() {
    try {
      const totalUsers = await User.countDocuments()
      const thisMonth = await User.countDocuments({
        createdAt: { 
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
        }
      })

      const bySubscription = await User.aggregate([
        {
          $group: {
            _id: '$subscription',
            count: { $sum: 1 },
            avgAPIUsage: { $avg: '$apiUsage.currentMonth' }
          }
        }
      ])

      return {
        total: totalUsers,
        thisMonth,
        bySubscription
      }
    } catch (error) {
      logger.error('Get user stats failed:', error)
      throw error
    }
  }
}

export default new AuthService()
