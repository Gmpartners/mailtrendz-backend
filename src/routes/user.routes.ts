import { Router } from 'express'
import UserController from '../controllers/user.controller'
import { authenticateToken, adminOnly } from '../middleware/auth.middleware'
import { generalLimiter } from '../middleware/rate-limit.middleware'
import { validateObjectId } from '../middleware/validation.middleware'

const router = Router()

// Rotas públicas
router.get('/health', UserController.systemHealthCheck)

// Rotas protegidas
router.use(authenticateToken)

// Dashboard e configurações
router.get('/dashboard', generalLimiter, UserController.getDashboard)
router.get('/settings', generalLimiter, UserController.getUserSettings)
router.put('/settings', generalLimiter, UserController.updateUserSettings)

// Notificações
router.get('/notifications', generalLimiter, UserController.getNotifications)
router.patch(
  '/notifications/:notificationId/read',
  generalLimiter,
  validateObjectId('notificationId'),
  UserController.markNotificationRead
)

// Exportar dados (LGPD/GDPR)
router.get('/export-data', generalLimiter, UserController.exportUserData)

// Deletar conta
router.delete('/account', generalLimiter, UserController.deleteAccount)

export default router