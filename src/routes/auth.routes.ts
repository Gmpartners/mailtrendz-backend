import { Router } from 'express'
import AuthController from '../controllers/auth.controller'
import { authLimiter } from '../middleware/rate-limit.middleware'
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware'
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
router.post('/refresh-token', AuthController.refreshToken)
router.post('/request-password-reset', authLimiter, validatePasswordReset, AuthController.requestPasswordReset)
router.post('/reset-password', authLimiter, validatePasswordUpdate, AuthController.resetPassword)
router.get('/verify-email/:token', validateObjectId('token'), AuthController.verifyEmail)
router.post('/validate-password', AuthController.validatePassword)
router.get('/health', AuthController.healthCheck)

// Rotas protegidas (requerem autenticação)
router.use(authenticateToken)

router.post('/logout', AuthController.logout)
router.get('/me', AuthController.getProfile)
router.put('/profile', validateProfileUpdate, AuthController.updateProfile)
router.post('/resend-verification', AuthController.resendEmailVerification)
router.get('/check', AuthController.checkAuth)

// Rotas administrativas (implementar middleware de admin depois)
router.get('/stats', AuthController.getUserStats)

export default router