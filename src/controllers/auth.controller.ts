import { Response } from 'express'
import { LoginDto, RegisterDto } from '../types/auth.types'
import AuthService, { AuthService as AuthServiceClass } from '../services/auth.service'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'
import { logger } from '../utils/logger'
import subscriptionService from '../services/subscription.service'
import ipTrackingService from '../services/ip-tracking.service'
import secureDbService from '../services/secure-db.service'
import authTokenService from '../services/auth-token.service'
// ✅ REMOVIDO: optimizedAuthService não mais necessário

class AuthController {
  register = asyncHandler(async (req: any, res: Response) => {
    const userData: RegisterDto = req.body
    const ip = ipTrackingService.extractRealIp(req)
    const userAgent = req.headers['user-agent']

    // ✅ IP BLOCKING REMOVIDO - Permitir múltiplas contas por IP

    const result = await AuthService.register(userData, ip)

    // Rastrear IP após registro bem-sucedido
    if (result.success && result.data?.user?.id) {
      try {
        await ipTrackingService.trackUserIp({
          userId: result.data.user.id,
          ipAddress: ip,
          userAgent,
          isSignup: true
        })
      } catch (error) {
        logger.error('Failed to track IP after registration:', error)
      }
    }

    res.status(HTTP_STATUS.CREATED).json(result)
  })

  login = asyncHandler(async (req: any, res: Response) => {
    const credentials: LoginDto = req.body
    const ip = ipTrackingService.extractRealIp(req)
    const userAgent = req.headers['user-agent']

    // ✅ IP BLOCKING REMOVIDO - Permitir logins múltiplos por IP

    const result = await AuthService.login(credentials, ip)

    // Rastrear IP após login bem-sucedido
    if (result.success && result.data?.user?.id) {
      try {
        await ipTrackingService.trackUserIp({
          userId: result.data.user.id,
          ipAddress: ip,
          userAgent,
          provider: 'email'
        })

        // ✅ NOVO: Criar tokens padronizados e definir cookies seguros
        const tokenPair = await authTokenService.createTokenPair(
          result.data.user.id,
          result.data.user.email || '',
          result.data.user.subscription || 'free'
        )

        // Definir cookies seguros
        this.setCookies(res, tokenPair)

        // Atualizar resposta com novos tokens
        result.data = {
          ...result.data,
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken
        } as any

      } catch (error) {
        logger.error('Failed to track IP or create tokens after login:', error)
      }
    }

    res.json(result)
  })

  // ✅ SIMPLIFICADO: Social login com fluxo único e direto
  socialLogin = asyncHandler(async (req: any, res: Response) => {
    const { supabaseUserId, email, name, avatar, provider } = req.body
    const ipAddress = ipTrackingService.extractRealIp(req)
    const userAgent = req.headers['user-agent']
    
    logger.info('🚀 [SOCIAL LOGIN] Starting authentication:', { 
      supabaseUserId, 
      email, 
      provider
    })

    try {
      // ✅ STEP 1: Get or create user profile
      const { profile, isNewUser } = await this.getOrCreateUserProfile(supabaseUserId, { email, name, avatar })
      
      // ✅ STEP 2: Get usage info
      const usageInfo = await subscriptionService.getUsageInfo(supabaseUserId)
      
      // ✅ STEP 3: Background tasks (não bloquear)
      this.handleAsyncSocialLoginTasks({
        supabaseUserId,
        ipAddress,
        userAgent,
        provider,
        isNewUser,
        avatar
      }).catch(asyncError => {
        logger.debug('Async tasks completed with warning:', asyncError.message)
      })
      
      // ✅ STEP 4: Prepare credits data
      const creditsBalance = usageInfo ? {
        available: usageInfo.usage.available,
        used: usageInfo.usage.used,
        total: usageInfo.usage.total,
        unlimited: usageInfo.usage.unlimited,
        resetAt: usageInfo.billing.currentPeriodEnd
      } : this.getDefaultCreditsBalance()

      // ✅ STEP 5: Create tokens
      const tokenPair = await authTokenService.createTokenPair(
        profile.id,
        profile.email || email,
        profile.subscription || 'starter'
      )

      // ✅ STEP 6: Set secure cookies
      this.setCookies(res, tokenPair)
      
      logger.info('✅ [SOCIAL LOGIN] Authentication completed:', { 
        userId: profile.id, 
        provider,
        isNewUser,
        subscription: profile.subscription
      })

      // 🎉 Success response
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
              currentMonth: creditsBalance.used,
              limit: profile.subscription === 'free' ? 50 : 
                     profile.subscription === 'starter' ? 500 : 
                     profile.subscription === 'enterprise' ? 5000 : -1,
              percentage: creditsBalance.total > 0 ? 
                         Math.round((creditsBalance.used / creditsBalance.total) * 100) : 0,
              resetDate: creditsBalance.resetAt || 
                        new Date(new Date().setMonth(new Date().getMonth() + 1, 1)).toISOString()
            },
            preferences: profile.preferences || {
              defaultIndustry: null,
              defaultTone: 'profissional',
              emailSignature: null
            },
            isEmailVerified: true,
            lastLoginAt: new Date().toISOString(),
            createdAt: profile.created_at,
            updatedAt: profile.updated_at
          },
          creditsBalance,
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn
        }
      })

    } catch (error: any) {
      logger.error('❌ [SOCIAL LOGIN] Authentication failed:', {
        error: error.message,
        supabaseUserId,
        email,
        provider
      })

      throw error
    }
  })

  // ✅ REMOVIDO: socialLoginUltraFast - Simplificação do sistema

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

  // ✅ NOVO: Refresh token com cookies seguros
  refreshTokenSecure = asyncHandler(async (req: any, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if (!refreshToken) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Refresh token requerido',
        code: 'REFRESH_TOKEN_MISSING'
      })
      return
    }

    // Usando import estático já definido no topo do arquivo
    const tokenPair = await authTokenService.refreshAccessToken(refreshToken)

    if (!tokenPair) {
      // Limpar cookies inválidos
      res.clearCookie('refreshToken')
      res.clearCookie('tokenExpiresAt')
      
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Refresh token inválido ou expirado',
        code: 'REFRESH_TOKEN_INVALID'
      })
      return
    }

    // Definir novos cookies seguros
    this.setCookies(res, tokenPair)

    res.json({
      success: true,
      message: 'Token renovado com sucesso',
      data: {
        accessToken: tokenPair.accessToken,
        expiresIn: tokenPair.expiresIn
      }
    })
  })

  // ✅ NOVO: Logout com limpeza de cookies
  logoutSecure = asyncHandler(async (req: any, res: Response) => {
    const userId = req.user?.id
    const refreshToken = req.cookies?.refreshToken

    if (userId && refreshToken) {
      try {
        // Usando import estático já definido no topo do arquivo
        await authTokenService.revokeAllUserTokens(userId)
      } catch (error) {
        logger.error('Error revoking tokens during logout:', error)
      }
    }

    // Limpar todos os cookies relacionados
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    })
    res.clearCookie('tokenExpiresAt', {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    })

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    })
  })

  // ✅ Método auxiliar para definir cookies seguros
  private setCookies(res: Response, tokenPair: any) {
    // Set refresh token as httpOnly cookie (secure)
    res.cookie('refreshToken', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    })

    // Set access token expiry info for frontend
    res.cookie('tokenExpiresAt', Date.now() + (tokenPair.expiresIn * 1000), {
      httpOnly: false, // Frontend can read this for UI
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokenPair.expiresIn * 1000,
      path: '/'
    })
  }

  // ✅ MÉTODO AUXILIAR: Get ou criar perfil de usuário otimizado
  private async getOrCreateUserProfile(userId: string, userData: { email: string, name?: string, avatar?: string }) {
    try {
      // Tentar buscar perfil existente primeiro
      let profile = await secureDbService.getUserProfile(userId)
      let isNewUser = false

      if (!profile) {
        // Criar novo perfil
        isNewUser = true
        profile = await secureDbService.createUserProfile(userId, {
          name: userData.name || userData.email.split('@')[0],
          email: userData.email,
          avatar: userData.avatar,
          subscription: 'starter',
          preferences: {
            defaultIndustry: null,
            defaultTone: 'profissional',
            emailSignature: null
          }
        })
      } else if (userData.avatar && userData.avatar !== profile.avatar) {
        // Atualizar avatar se necessário
        try {
          profile = await secureDbService.updateUserAvatar(userId, userData.avatar)
        } catch (updateError) {
          logger.warn('⚠️ [AUTH] Avatar update failed (não crítico):', updateError)
        }
      }

      return { profile, isNewUser }
    } catch (error) {
      logger.error('❌ [AUTH] Profile operation failed:', error)
      throw error
    }
  }

  // ✅ MÉTODO AUXILIAR: Tarefas assíncronas do social login
  private async handleAsyncSocialLoginTasks(params: {
    supabaseUserId: string
    ipAddress: string
    userAgent: string
    provider: string
    isNewUser: boolean
    avatar?: string | null
  }): Promise<void> {
    const tasks = []

    // Task 1: IP tracking (apenas para novos usuários ou sem cache recente)
    tasks.push(
      ipTrackingService.trackUserIp({
        userId: params.supabaseUserId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        provider: params.provider,
        isSignup: params.isNewUser
      }).catch(error => logger.debug('IP tracking async error:', error))
    )

    // Task 2: Inicialização para novos usuários
    if (params.isNewUser) {
      tasks.push(
        secureDbService.initializeNewUser(params.supabaseUserId)
          .catch(error => logger.debug('User initialization async error:', error))
      )
    }

    // Executar todas as tasks em paralelo sem bloquear
    await Promise.allSettled(tasks)
  }

  // ✅ REMOVIDO: handleUltraFastAsyncTasks - Não mais necessário

  // ✅ MÉTODO AUXILIAR: Créditos padrão para fallback
  private getDefaultCreditsBalance() {
    return {
      available: 3,
      used: 0,
      total: 3,
      unlimited: false,
      resetAt: null
    }
  }
}

export default new AuthController()
