import { Router } from 'express'
import UserController from '../controllers/user.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { generalLimiter } from '../middleware/rate-limit.middleware'
import multer from 'multer'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// Rotas públicas
router.get('/health', UserController.systemHealthCheck)
router.get('/industries', UserController.getIndustries)
router.get('/templates', UserController.getTemplates)

// Rotas protegidas
router.use(authenticateToken)

// Perfil
router.get('/profile', generalLimiter, UserController.getProfile)
router.put('/profile', generalLimiter, UserController.updateProfile)
router.post('/avatar', upload.single('avatar'), UserController.uploadAvatar)
router.delete('/avatar', UserController.deleteAvatar)

// Uso da API e Créditos
router.get('/api-usage', generalLimiter, UserController.getAPIUsage)
router.get('/credits', generalLimiter, UserController.getCredits)
router.get('/stats', generalLimiter, UserController.getStats)

// Dashboard e configurações
router.get('/dashboard', generalLimiter, UserController.getDashboard)
router.get('/settings', generalLimiter, UserController.getUserSettings)
router.put('/settings', generalLimiter, UserController.updateUserSettings)


// Exportar dados (LGPD/GDPR)
router.get('/export-data', generalLimiter, UserController.exportUserData)

// Deletar conta
router.delete('/account', generalLimiter, UserController.deleteAccount)

export default router