import { Router } from 'express'
import FolderController from '../controllers/folder.controller'
import { authenticateToken, requireFeature } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticateToken)

// ✅ TODAS AS ROTAS DE FOLDERS REQUEREM FEATURE
router.get('/', requireFeature('folders'), FolderController.getFolders)

router.post('/', requireFeature('folders'), FolderController.createFolder)

router.put('/:id', requireFeature('folders'), FolderController.updateFolder)

router.delete('/:id', requireFeature('folders'), FolderController.deleteFolder)

router.post('/move-project', requireFeature('folders'), FolderController.moveProject)

router.get('/:id/projects', requireFeature('folders'), FolderController.getFolderProjects)

export default router