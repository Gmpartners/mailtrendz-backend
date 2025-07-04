import { Response } from 'express'
import { LoginDto, RegisterDto } from '../types/auth.types'
import AuthService, { AuthService as AuthServiceClass } from '../services/auth.service'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'
import { supabase } from '../config/supabase.config'
import { logger } from '../utils/logger'

class AuthController {
  register = asyncHandler(async (req: any, res: Response) => {
    const userData: RegisterDto = req.body
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'

    const result = await AuthService.register(userData, ip)

    res.status(HTTP_STATUS.CREATED).json(result)
  })

  login = asyncHandler(async (req: any, res: Response) => {
    const credentials: LoginDto = req.body
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'

    const result = await AuthService.login(credentials, ip)

    res.json(result)
  })

  socialLogin = asyncHandler(async (req: any, res: Response) => {
    const { supabaseUserId, email, name, avatar, provider } = req.body

    logger.info('Social login attempt:', { supabaseUserId, email, provider })

    // Verificar se já existe perfil
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUserId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 significa "não encontrado", que é esperado para novos usuários
      logger.error('Error checking profile:', profileError)
      throw new Error('Erro ao verificar perfil')
    }

    if (!profile) {
      // Criar novo perfil para usuário social
      logger.info('Creating new profile for social user:', { supabaseUserId, email })
      
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: supabaseUserId,
          name: name || email.split('@')[0],
          email,
          avatar,
          subscription: 'free',
          preferences: {
            defaultIndustry: null,
            defaultTone: 'profissional',
            emailSignature: null
          }
        })
        .select()
        .single()
      
      if (insertError) {
        logger.error('Error creating profile:', insertError)
        throw new Error('Erro ao criar perfil')
      }
      
      profile = newProfile
    } else {
      // Atualizar avatar se mudou
      if (avatar && avatar !== profile.avatar) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar })
          .eq('id', supabaseUserId)
        
        if (!updateError) {
          profile.avatar = avatar
        }
      }
    }

    logger.info('Social login successful:', { userId: profile.id, provider })

    // NÃO gerar tokens customizados - o Supabase já tem os tokens!
    res.json({
      success: true,
      message: `Login com ${provider} realizado com sucesso`,
      data: {
        user: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          avatar: profile.avatar,
          subscription: profile.subscription,
          apiUsage: {
            currentMonth: 0,
            limit: profile.subscription === 'free' ? 50 : profile.subscription === 'pro' ? 500 : 5000,
            percentage: 0,
            resetDate: new Date(new Date().setMonth(new Date().getMonth() + 1, 1)).toISOString()
          },
          preferences: profile.preferences || {
            defaultIndustry: null,
            defaultTone: 'profissional',
            emailSignature: null
          },
          isEmailVerified: true, // Usuários social já são verificados
          lastLoginAt: new Date().toISOString(),
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }
      }
    })
  })

  refreshToken = asyncHandler(async (req: any, res: Response) => {
    const refreshToken = req.body.refreshToken

    if (!refreshToken) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Refresh token requerido'
      })
      return
    }

    const result = await AuthService.refreshToken(refreshToken)

    res.json(result)
  })

  logout = asyncHandler(async (req: any, res: Response) => {
    const userId = req.user?.id

    if (userId) {
      await AuthService.logout(userId)
    }

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    })
  })

  getProfile = asyncHandler(async (req: any, res: Response) => {
    const userId = req.user?.id

    if (!userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'ID do usuário não encontrado'
      })
      return
    }

    const profile = await AuthService.getUserProfile(userId)

    res.json({
      success: true,
      data: { user: profile }
    })
  })

  updateProfile = asyncHandler(async (req: any, res: Response) => {
    const userId = req.user?.id
    const updates = req.body

    const profile = await AuthService.updateProfile(userId, updates)

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: { user: profile }
    })
  })

  requestPasswordReset = asyncHandler(async (req: any, res: Response) => {
    const { email } = req.body

    await AuthService.requestPasswordReset(email)

    res.json({
      success: true,
      message: 'Se o email existir, um link de recuperação será enviado'
    })
  })

  resetPassword = asyncHandler(async (req: any, res: Response) => {
    const { token, newPassword } = req.body

    await AuthService.resetPassword(token, newPassword)

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    })
  })

  verifyEmail = asyncHandler(async (req: any, res: Response) => {
    const { token } = req.params

    await AuthService.verifyEmail(token)

    res.json({
      success: true,
      message: 'Email verificado com sucesso'
    })
  })

  resendEmailVerification = asyncHandler(async (req: any, res: Response) => {
    const userId = req.user?.id

    await AuthService.resendEmailVerification(userId)

    res.json({
      success: true,
      message: 'Email de verificação reenviado'
    })
  })

  checkAuth = asyncHandler(async (req: any, res: Response) => {
    res.json({
      success: true,
      message: 'Token válido',
      data: {
        user: {
          id: req.user?.id,
          email: req.user?.email,
          subscription: req.user?.subscription
        }
      }
    })
  })

  validatePassword = asyncHandler(async (req: any, res: Response) => {
    const { password } = req.body

    if (!password) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Senha é obrigatória'
      })
      return
    }

    const validation = AuthServiceClass.validatePasswordStrength(password)

    res.json({
      success: true,
      data: validation
    })
  })

  getUserStats = asyncHandler(async (_req: any, res: Response) => {
    const stats = await AuthService.getUserStats()

    res.json({
      success: true,
      data: { stats }
    })
  })

  healthCheck = asyncHandler(async (_req: any, res: Response) => {
    const health = {
      status: 'ok',
      timestamp: new Date(),
      service: 'auth',
      version: process.env.npm_package_version || '1.0.0'
    }

    res.json({
      success: true,
      data: health
    })
  })
}

export default new AuthController()
