import { supabase, supabaseAdmin } from '../config/supabase.config'
import { Database } from '../database/types'
import { RegisterDto, LoginDto } from '../types/auth.types'
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants'
import { logger } from '../utils/logger'
import { ApiError } from '../utils/api-error'
import subscriptionService from './subscription.service'
import secureDbService from './secure-db.service'
import { getRedirectUrl } from '../utils/url-helper'

type Profile = Database['public']['Tables']['profiles']['Row']

class AuthService {
  async register(userData: RegisterDto, ip: string) {
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: false,
        user_metadata: {
          name: userData.name
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new ApiError('Email já cadastrado', HTTP_STATUS.CONFLICT, ERROR_CODES.USER_ALREADY_EXISTS)
        }
        throw authError
      }

      if (!authData.user) {
        throw new ApiError('Erro ao criar usuário', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Inicialização automática via trigger do banco

      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password
      })

      if (sessionError) {
        logger.error('Error creating session after registration:', sessionError)
        throw sessionError
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        logger.error('Error fetching profile after registration:', profileError)
      }

      // Obter informações de créditos
      const usageInfo = await subscriptionService.getUsageInfo(authData.user.id)
      const creditsBalance = usageInfo ? {
        available: usageInfo.usage.available,
        used: usageInfo.usage.used,
        total: usageInfo.usage.total,
        unlimited: usageInfo.usage.unlimited,
        resetAt: usageInfo.billing.currentPeriodEnd
      } : null

      logger.info(`New user registered: ${userData.email} from IP: ${ip}`)

      return {
        success: true,
        message: 'Usuário criado com sucesso',
        data: {
          user: profile,
          accessToken: sessionData.session?.access_token,
          refreshToken: sessionData.session?.refresh_token,
          creditsBalance
        }
      }
    } catch (error) {
      logger.error('Registration error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao criar usuário', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async login(credentials: LoginDto, ip: string) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new ApiError('Email ou senha inválidos', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS)
        }
        throw authError
      }

      if (!authData.user || !authData.session) {
        throw new ApiError('Erro ao fazer login', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) {
        throw new ApiError('Perfil não encontrado', HTTP_STATUS.NOT_FOUND)
      }

      // Obter informações de créditos
      const usageInfo = await subscriptionService.getUsageInfo(authData.user.id)
      const creditsBalance = usageInfo ? {
        available: usageInfo.usage.available,
        used: usageInfo.usage.used,
        total: usageInfo.usage.total,
        unlimited: usageInfo.usage.unlimited,
        resetAt: usageInfo.billing.currentPeriodEnd
      } : null

      logger.info(`User logged in: ${credentials.email} from IP: ${ip}`)

      return {
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: profile,
          accessToken: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          creditsBalance
        }
      }
    } catch (error) {
      logger.error('Login error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao fazer login', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const { data: sessionData, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      })

      if (error || !sessionData.session) {
        throw new ApiError('Token inválido ou expirado', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionData.user!.id)
        .single()

      // Obter informações de créditos
      const usageInfo = await subscriptionService.getUsageInfo(sessionData.user!.id)
      const creditsBalance = usageInfo ? {
        available: usageInfo.usage.available,
        used: usageInfo.usage.used,
        total: usageInfo.usage.total,
        unlimited: usageInfo.usage.unlimited,
        resetAt: usageInfo.billing.currentPeriodEnd
      } : null

      return {
        success: true,
        message: 'Token renovado com sucesso',
        data: {
          user: profile,
          accessToken: sessionData.session.access_token,
          refreshToken: sessionData.session.refresh_token,
          creditsBalance
        }
      }
    } catch (error) {
      logger.error('Token refresh error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao renovar token', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async logout(userId: string) {
    try {
      await supabase.auth.signOut()
      logger.info(`User logged out: ${userId}`)
      return { success: true }
    } catch (error) {
      logger.error('Logout error:', error)
      throw new ApiError('Erro ao fazer logout', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async getUserProfile(userId: string): Promise<Profile> {
    try {
      // ✅ SEGURO: Usar secureDbService ao invés de bypass direto
      const profile = await secureDbService.getUserProfile(userId)

      if (!profile) {
        throw new ApiError('Usuário não encontrado', HTTP_STATUS.NOT_FOUND, ERROR_CODES.USER_NOT_FOUND)
      }

      // Buscar email da tabela auth.users se não existir no profile
      if (!profile.email) {
        try {
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
          
          if (!authError && authUser?.user?.email) {
            profile.email = authUser.user.email
          }
        } catch (authError) {
          logger.warn('Could not fetch email from auth.users:', authError)
          // Continue without email rather than failing
        }
      }

      return profile
    } catch (error) {
      logger.error('Get profile error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao buscar perfil', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async updateProfile(userId: string, updates: Partial<Profile>) {
    try {
      const allowedUpdates = ['name', 'avatar', 'preferences']
      const filteredUpdates: any = {}

      for (const key of allowedUpdates) {
        if (key in updates) {
          filteredUpdates[key] = updates[key as keyof Profile]
        }
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .update(filteredUpdates)
        .eq('id', userId)
        .select()
        .single()

      if (error || !profile) {
        throw new ApiError('Erro ao atualizar perfil', HTTP_STATUS.BAD_REQUEST)
      }

      return profile
    } catch (error) {
      logger.error('Update profile error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao atualizar perfil', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async requestPasswordReset(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getRedirectUrl('/reset-password')
      })

      if (error) {
        logger.error('Password reset request error:', error)
      }

      return { success: true }
    } catch (error) {
      logger.error('Password reset error:', error)
      return { success: true }
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      })

      if (verifyError || !sessionData.session) {
        throw new ApiError('Token inválido ou expirado', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.TOKEN_INVALID)
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        throw new ApiError('Erro ao atualizar senha', HTTP_STATUS.BAD_REQUEST)
      }

      logger.info(`Password reset successful for user: ${sessionData.user?.email}`)

      return { success: true }
    } catch (error) {
      logger.error('Reset password error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao redefinir senha', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async verifyEmail(token: string) {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      })

      if (error) {
        throw new ApiError('Token inválido ou expirado', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.TOKEN_INVALID)
      }

      return { success: true }
    } catch (error) {
      logger.error('Email verification error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao verificar email', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async resendEmailVerification(userId: string) {
    try {
      const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (!user.user) {
        throw new ApiError('Usuário não encontrado', HTTP_STATUS.NOT_FOUND)
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.user.email!
      })

      if (error) {
        logger.error('Resend verification error:', error)
      }

      return { success: true }
    } catch (error) {
      logger.error('Resend email error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao reenviar email', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async getUserStats() {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('subscription')

      if (error) {
        throw error
      }

      const counts = {
        total: profiles.length,
        free: 0,
        starter: 0,
        enterprise: 0,
        unlimited: 0
      }

      profiles.forEach(profile => {
        const subscription = profile.subscription as keyof typeof counts
        if (subscription in counts && subscription !== 'total') {
          counts[subscription]++
        }
      })

      return counts
    } catch (error) {
      logger.error('Get user stats error:', error)
      throw new ApiError('Erro ao buscar estatísticas', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  static validatePasswordStrength(password: string) {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    const strength = {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
      score: 0,
      feedback: [] as string[]
    }

    if (password.length >= minLength) strength.score += 25
    else strength.feedback.push('Mínimo 8 caracteres')

    if (hasUpperCase && hasLowerCase) strength.score += 25
    else strength.feedback.push('Use maiúsculas e minúsculas')

    if (hasNumbers) strength.score += 25
    else strength.feedback.push('Adicione números')

    if (hasSpecialChar) strength.score += 25
    else strength.feedback.push('Adicione caracteres especiais')

    return strength
  }
}

export { AuthService }
export default new AuthService()
