import { Router } from 'express'
import { translationController } from '../controllers/translation.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { generalLimiter } from '../middleware/rate-limit.middleware'

const router = Router()

// Apply auth middleware to all translation routes
router.use(authenticateToken)

// Use general rate limiter (already configured)
const translationRateLimit = generalLimiter

// Translation routes
router.post('/translate', translationRateLimit, translationController.translateText)
router.post('/project-name', translationRateLimit, translationController.translateProjectName)
router.post('/batch', translationRateLimit, translationController.translateBatch)
router.get('/project/:projectId/:language', translationController.getProjectTranslation)

// Admin routes (TODO: add admin middleware)
router.get('/cache/stats', translationController.getCacheStats)
router.delete('/cache', translationController.clearCache)

export default router