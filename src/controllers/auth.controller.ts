import { Response, NextFunction } from 'express'
import { AuthRequest, LoginDto, RegisterDto } from '../types/auth.types'
import AuthService from '../services/auth.service'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { asyncHandler } from '../middleware/error.middleware'

class AuthController {
  // Registro de usuário
  register = asyncHandler(async (req: any, res: Response) => {
    const userData: RegisterDto = req.body
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'

    const result = await AuthService.register(userData, ip)

    // Configurar cookies para refresh token (opcional)
    if (result.data?.refreshToken) {
      res.cookie('refreshToken', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
      })
    }

    res.status(HTTP_STATUS.CREATED).json(result)
  })

  // Login de usuário
  login = asyncHandler(async (req: any, res: Response) => {
    const credentials: LoginDto = req.body
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'

    const result = await AuthService.login(credentials, ip)

    // Configurar cookies para refresh token
    if (result.data?.refreshToken) {
      res.cookie('refreshToken', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
      })
    }

    res.json(result)
  })

  // Refresh token
  refreshToken = asyncHandler(async (req: any, res: Response) => {
    // Tentar pegar refresh token do cookie ou body
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if (!refreshToken) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Refresh token requerido'
      })
    }

    const result = await AuthService.refreshToken(refreshToken)

    // Atualizar cookie
    if (result.data?.refreshToken) {
      res.cookie('refreshToken', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
    }

    res.json(result)
  })

  // Logout
  logout = asyncHandler(async (req: any, res: Response) => {
    const userId = req.user?.id

    if (userId) {
      await AuthService.logout(userId)
    }

    // Limpar cookie
    res.clearCookie('refreshToken')

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    })
  })

  // Obter perfil do usuário atual
  getProfile = asyncHandler(async (req: any, res: Response) => {
    console.log('=== DEBUG CONTROLLER getProfile ===')
    console.log('req.user recebido:', JSON.stringify(req.user, null, 2))
    
    const userId = req.user?.id
    console.log('userId extraído:', userId)

    if (!userId) {
      console.log('ERRO: userId está vazio ou undefined')
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'ID do usuário não encontrado'
      })
    }

    try {
      const profile = await AuthService.getUserProfile(userId)
      console.log('Profile retornado do service:', JSON.stringify(profile, null, 2))

      const response = {
        success: true,
        data: { user: profile }
      }
      console.log('Resposta final:', JSON.stringify(response, null, 2))
      console.log('=== FIM DEBUG CONTROLLER getProfile ===')

      res.json(response)
    } catch (error) {
      console.log('ERRO no getUserProfile:', error)
      throw error
    }
  })

  // Atualizar perfil
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

  // Solicitar reset de senha
  requestPasswordReset = asyncHandler(async (req: any, res: Response) => {
    const { email } = req.body

    await AuthService.requestPasswordReset(email)

    res.json({
      success: true,
      message: 'Se o email existir, um link de recuperação será enviado'
    })
  })

  // Reset de senha
  resetPassword = asyncHandler(async (req: any, res: Response) => {
    const { token, newPassword } = req.body

    await AuthService.resetPassword(token, newPassword)

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    })
  })

  // Verificar email
  verifyEmail = asyncHandler(async (req: any, res: Response) => {
    const { token } = req.params

    await AuthService.verifyEmail(token)

    res.json({
      success: true,
      message: 'Email verificado com sucesso'
    })
  })

  // Reenviar verificação de email
  resendEmailVerification = asyncHandler(async (req: any, res: Response) => {
    const userId = req.user?.id

    await AuthService.resendEmailVerification(userId)

    res.json({
      success: true,
      message: 'Email de verificação reenviado'
    })
  })

  // Verificar status de autenticação
  checkAuth = asyncHandler(async (req: any, res: Response) => {
    console.log('=== DEBUG CONTROLLER checkAuth ===')
    console.log('req.user:', JSON.stringify(req.user, null, 2))
    
    const response = {
      success: true,
      message: 'Token válido',
      data: {
        user: {
          id: req.user?.id,
          email: req.user?.email,
          subscription: req.user?.subscription
        }
      }
    }
    console.log('checkAuth response:', JSON.stringify(response, null, 2))
    console.log('=== FIM DEBUG CONTROLLER checkAuth ===')

    res.json(response)
  })

  // Validar força da senha (endpoint público)
  validatePassword = asyncHandler(async (req: any, res: Response) => {
    const { password } = req.body

    if (!password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Senha é obrigatória'
      })
    }

    // Use método estático da classe AuthService
    const AuthServiceClass = require('../services/auth.service').default
    const validation = AuthServiceClass.validatePasswordStrength(password)

    res.json({
      success: true,
      data: validation
    })
  })

  // Estatísticas de usuários (admin apenas)
  getUserStats = asyncHandler(async (req: any, res: Response) => {
    // Verificação de admin pode ser feita via middleware
    const stats = await AuthService.getUserStats()

    res.json({
      success: true,
      data: { stats }
    })
  })

  // Health check do serviço de auth
  healthCheck = asyncHandler(async (req: any, res: Response) => {
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
