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

class AuthController {
  register = asyncHandler(async (req: any, res: Response) => {
    const userData: RegisterDto = req.body
    const ip = ipTrackingService.extractRealIp(req)
    const userAgent = req.headers['user-agent']

    // Verificar se o IP está bloqueado
    const { blocked, reason } = await ipTrackingService.isIpBlocked(ip)
    if (blocked) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: reason || 'Registro temporariamente bloqueado para este IP'
      })
      return
    }

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

    // Verificar se o IP está bloqueado
    const { blocked, reason } = await ipTrackingService.isIpBlocked(ip)
    if (blocked) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: reason || 'Login temporariamente bloqueado para este IP'
      })
      return
    }

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

  socialLogin = asyncHandler(async (req: any, res: Response) => {
    const { supabaseUserId, email, name, avatar, provider } = req.body
    const ipAddress = ipTrackingService.extractRealIp(req)
    const userAgent = req.headers['user-agent']

    logger.info('🔐 [SOCIAL LOGIN] Starting authentication:', { 
      supabaseUserId, 
      email, 
      provider,
      hasAvatar: !!avatar,
      ipAddress 
    })

    try {
      // ✅ SECURE: Usar secureDbService para verificação de perfil
      let profile = await secureDbService.getUserProfile(supabaseUserId)
      let isNewUser = false

      // 🆕 Usuário não tem perfil - criar novo
      if (!profile) {
        isNewUser = true
        logger.info('🆕 [SOCIAL LOGIN] Creating new profile:', { supabaseUserId, email })
        
        profile = await secureDbService.createUserProfile(supabaseUserId, {
          name: name || email.split('@')[0],
          email,
          avatar,
          subscription: 'starter', // ✅ Mudado para starter (conforme logs do usuário)
          preferences: {
            defaultIndustry: null,
            defaultTone: 'profissional',
            emailSignature: null
          }
        })
        
        logger.info('✅ [SOCIAL LOGIN] Profile created successfully:', { userId: profile.id })
        
        // ✅ NOVO: Garantir inicialização completa para novos usuários
        try {
          logger.info('🔧 [SOCIAL LOGIN] Ensuring complete user initialization...')
          await secureDbService.initializeNewUser(supabaseUserId)
          logger.info('✅ [SOCIAL LOGIN] User fully initialized')
        } catch (initError) {
          logger.error('⚠️ [SOCIAL LOGIN] Initialization warning (continuing):', initError)
          // Não bloqueia o login se inicialização falhar
        }
        
      } else {
        // 🔄 Usuário existente - atualizar avatar se necessário
        logger.info('🔄 [SOCIAL LOGIN] Existing user, checking for updates:', { userId: profile.id })
        
        if (avatar && avatar !== profile.avatar) {
          logger.info('🖼️ [SOCIAL LOGIN] Updating avatar:', { oldAvatar: profile.avatar, newAvatar: avatar })
          
          try {
            const updatedProfile = await secureDbService.updateUserAvatar(supabaseUserId, avatar)
            profile = updatedProfile
            logger.info('✅ [SOCIAL LOGIN] Avatar updated successfully')
          } catch (updateError) {
            logger.warn('⚠️ [SOCIAL LOGIN] Failed to update avatar:', updateError)
          }
        }
      }

      // 🎯 Inicialização para novos usuários
      if (isNewUser) {
        try {
          logger.info('🚀 [SOCIAL LOGIN] Initializing new user resources:', { supabaseUserId })
          await secureDbService.initializeNewUser(supabaseUserId)
        } catch (error: any) {
          logger.error('⚠️ [SOCIAL LOGIN] Warning - initialization error:', error)
          // Não quebra o fluxo, apenas loga o aviso
        }
      }

      // 🌐 Rastrear IP do usuário
      try {
        logger.info('🌐 [SOCIAL LOGIN] Attempting IP tracking:', {
          userId: supabaseUserId,
          ipAddress,
          userAgent,
          provider,
          isNewUser
        })
        
        await ipTrackingService.trackUserIp({
          userId: supabaseUserId,
          ipAddress,
          userAgent,
          provider,
          isSignup: isNewUser
        })
        
        logger.info('✅ [SOCIAL LOGIN] IP tracking completed')
      } catch (ipError: any) {
        logger.error('⚠️ [SOCIAL LOGIN] IP tracking error:', {
          error: ipError.message,
          stack: ipError.stack
        })
        // Não bloqueia o login se falhar o tracking
      }

      // 💰 Obter informações de uso e créditos
      logger.info('💰 [SOCIAL LOGIN] Fetching usage info:', { userId: supabaseUserId })
      const usageInfo = await subscriptionService.getUsageInfo(supabaseUserId)
      
      const creditsBalance = usageInfo ? {
        available: usageInfo.usage.available,
        used: usageInfo.usage.used,
        total: usageInfo.usage.total,
        unlimited: usageInfo.usage.unlimited,
        resetAt: usageInfo.billing.currentPeriodEnd
      } : {
        // Fallback para novos usuários
        available: 3,
        used: 0,
        total: 3,
        unlimited: false,
        resetAt: null
      }

      // ✅ NOVO: Criar tokens padronizados para login social
      const tokenPair = await authTokenService.createTokenPair(
        profile.id,
        profile.email || email, // Usar email do payload se profile.email for null
        profile.subscription || 'free' // Garantir que não seja null
      )

      // Definir cookies seguros
      this.setCookies(res, tokenPair)

      logger.info('✅ [SOCIAL LOGIN] Authentication successful:', { 
        userId: profile.id, 
        provider,
        isNewUser,
        subscription: profile.subscription,
        creditsAvailable: creditsBalance.available
      })

      // 🎉 Resposta de sucesso com tokens padronizados
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
          // ✅ NOVO: Tokens padronizados incluídos na resposta
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn
        }
      })

    } catch (error: any) {
      logger.error('💥 [SOCIAL LOGIN] Critical error:', {
        error: error.message,
        stack: error.stack,
        supabaseUserId,
        email,
        provider
      })

      // Re-throw para ser capturado pelo asyncHandler
      throw error
    }
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
}

export default new AuthController()
