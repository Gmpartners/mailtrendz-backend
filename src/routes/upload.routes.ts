import { Router } from 'express'
import UploadController from '../controllers/upload.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticateToken)

router.post('/image', UploadController.uploadImage)
router.delete('/image/:path', UploadController.deleteImage)
router.get('/images', UploadController.getUserImages)

export default router
