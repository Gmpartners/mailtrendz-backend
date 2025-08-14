import { Router } from 'express'
import FolderController from '../controllers/folder.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticateToken)

// ✅ SIMPLIFICADO: Rotas básicas sem middleware organizacional
router.get('/', FolderController.getFolders)
router.post('/', FolderController.createFolder)
router.put('/:id', FolderController.updateFolder)
router.delete('/:id', FolderController.deleteFolder)
router.get('/:id/stats', FolderController.getFolderStats)
router.put('/:id/color', FolderController.updateFolderColor)

export default router