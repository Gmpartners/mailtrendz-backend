import { Router } from 'express'
import AuthController from '../controllers/auth.controller'
import DebugController from '../controllers/debug.controller'
import { authLimiter } from '../middleware/rate-limit.middleware'
import { authenticateToken } from '../middleware/auth.middleware'
import {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validatePasswordUpdate,
  validateProfileUpdate,
  validateObjectId
} from '../middleware/validation.middleware'

const router = Router()

// Rotas públicas (sem autenticação)
router.post('/register', authLimiter, validateRegister, AuthController.register)
router.post('/login', authLimiter, validateLogin, AuthController.login)
router.post('/social-login', authLimiter, AuthController.socialLogin)

// ✅ ROTAS DE TOKEN ATUALIZADAS - suporte para cookies seguros
router.post('/refresh-token', AuthController.refreshToken) // Legacy
router.post('/refresh', AuthController.refreshTokenSecure) // Nova rota segura

router.post('/request-password-reset', authLimiter, validatePasswordReset, AuthController.requestPasswordReset)
router.post('/reset-password', authLimiter, validatePasswordUpdate, AuthController.resetPassword)
router.get('/verify-email/:token', validateObjectId('token'), AuthController.verifyEmail)
router.post('/validate-password', AuthController.validatePassword)
router.get('/health', AuthController.healthCheck)
router.get('/debug/ip', DebugController.checkIpExtraction)

// Rotas protegidas (requerem autenticação)
router.use(authenticateToken)

// ✅ ROTAS DE LOGOUT ATUALIZADAS
router.post('/logout', AuthController.logout) // Legacy
router.post('/logout-secure', AuthController.logoutSecure) // Nova rota segura
router.get('/me', AuthController.getProfile)
router.put('/profile', validateProfileUpdate, AuthController.updateProfile)
router.post('/resend-verification', AuthController.resendEmailVerification)
router.get('/check', AuthController.checkAuth)

// Rotas administrativas (implementar middleware de admin depois)
router.get('/stats', AuthController.getUserStats)

export default router
