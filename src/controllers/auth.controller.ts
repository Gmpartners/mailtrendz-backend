import { Response } from 'express'
import { LoginDto, RegisterDto } from '../types/auth.types'
import AuthService, { AuthService as AuthServiceClass } from '../services/auth.service'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'
import { logger } from '../utils/logger'
import secureDbService from '../services/secure-db.service'
import authTokenService from '../services/auth-token.service'
// ✅ REMOVIDO: optimizedAuthService não mais necessário

class AuthController {
  register = asyncHandler(async (req: any, res: Response) => {
    const userData: RegisterDto = req.body
    const result = await AuthService.register(userData)

    res.status(HTTP_STATUS.CREATED).json(result)
  })

  login = asyncHandler(async (req: any, res: Response) => {
    const credentials: LoginDto = req.body
    const result = await AuthService.login(credentials)

    // Create tokens and set cookies for successful login
    if (result.success && result.data?.user?.id) {
      try {
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
        logger.error('Failed to create tokens after login:', error)
      }
    }

    res.json(result)
  })

  // ✅ SIMPLIFICADO: Social login unificado usando AuthService
  socialLogin = asyncHandler(async (req: any, res: Response) => {
    const { supabaseUserId, email, name, avatar, provider } = req.body
    
    // ✅ VALIDAR UUID DO SUPABASE
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!supabaseUserId || !uuidRegex.test(supabaseUserId)) {
      logger.error('❌ [SOCIAL LOGIN] Invalid UUID:', {
        supabaseUserId,
        typeof: typeof supabaseUserId,
        length: supabaseUserId?.length
      })
      
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'ID de usuário inválido. Tente fazer login novamente.',
        error: {
          code: 'INVALID_USER_ID',
          details: 'Supabase user ID deve ser um UUID válido'
        }
      })
      return
    }
    
    try {
      // ✅ Usar serviço unificado
      const result = await AuthService.socialLogin({
        supabaseUserId,
        email,
        name,
        avatar,
        provider
      })

      // ✅ Create tokens
      const tokenPair = await authTokenService.createTokenPair(
        result.data.user.id,
        result.data.user.email || email,
        result.data.user.subscription || 'starter'
      )

      // ✅ Set secure cookies
      this.setCookies(res, tokenPair)
      
      // ✅ Background tasks (não bloquear)  
      this.handleAsyncSocialLoginTasks({
        supabaseUserId,
        provider,
        isNewUser: result.data.isNewUser || false,
        avatar
      }).catch(asyncError => {
        logger.debug('Async tasks completed with warning:', asyncError.message)
      })

      // 🎉 Success response
      res.json({
        success: true,
        message: result.message,
        data: {
          user: {
            id: result.data.user.id,
            name: result.data.user.name,
            email: result.data.user.email,
            avatar: result.data.user.avatar,
            subscription: result.data.user.subscription,
            apiUsage: {
              currentMonth: result.data.creditsBalance.used,
              limit: result.data.user.subscription === 'free' ? 50 : 
                     result.data.user.subscription === 'starter' ? 500 : 
                     result.data.user.subscription === 'enterprise' ? 5000 : -1,
              percentage: result.data.creditsBalance.total > 0 ? 
                         Math.round((result.data.creditsBalance.used / result.data.creditsBalance.total) * 100) : 0,
              resetDate: result.data.creditsBalance.resetAt || 
                        new Date(new Date().setMonth(new Date().getMonth() + 1, 1)).toISOString()
            },
            preferences: result.data.user.preferences || {
              defaultIndustry: null,
              defaultTone: 'profissional',
              emailSignature: null
            },
            isEmailVerified: true,
            lastLoginAt: new Date().toISOString(),
            createdAt: result.data.user.created_at,
            updatedAt: result.data.user.updated_at
          },
          creditsBalance: result.data.creditsBalance,
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
          isNewUser: result.data.isNewUser || false
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


  // ✅ MÉTODO AUXILIAR: Tarefas assíncronas do social login
  private async handleAsyncSocialLoginTasks(params: {
    supabaseUserId: string
    provider: string
    isNewUser: boolean
    avatar?: string | null
  }): Promise<void> {
    const tasks = []

    // Task: Inicialização para novos usuários
    if (params.isNewUser) {
      tasks.push(
        secureDbService.initializeNewUser(params.supabaseUserId)
          .catch(error => logger.debug('User initialization async error:', error))
      )
    }

    // Executar todas as tasks em paralelo sem bloquear
    await Promise.allSettled(tasks)
  }

  // ✅ NOVO: Debug endpoint para estatísticas de cache
  getCacheStats = asyncHandler(async (_req: any, res: Response) => {
    const stats = authTokenService.getCacheStats()
    const memoryUsage = process.memoryUsage()
    
    res.json({
      success: true,
      data: {
        cache: stats,
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        uptime: `${Math.round(process.uptime())}s`,
        nodeEnv: process.env.NODE_ENV || 'unknown'
      }
    })
  })

}

export default new AuthController()
