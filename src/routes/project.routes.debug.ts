import { Router } from 'express'
import ProjectController from '../controllers/project.controller'
import { 
  authenticateToken, 
  checkProjectLimit, 
  requireFeature 
} from '../middleware/auth.middleware'
import { projectLimiter, projectCreationLimiter } from '../middleware/rate-limit.middleware'
import {
  validateCreateProject,
  validateUpdateProject,
  validateImproveEmail,
  validatePagination,
  validateSearch,
  validateObjectId
} from '../middleware/validation.middleware'

const router = Router()

// Middleware de teste - simular usuário autenticado
const testAuthMiddleware = (req: any, _res: any, next: any) => {
  req.user = {
    id: '2d44ce46-d623-411a-a580-1568cc96b198', // ID do usuário que testamos
    email: 'test@test.com',
    subscription: 'free'
  }
  next()
}

// Rotas públicas ANTES da autenticação
router.get('/health', ProjectController.healthCheck)
router.get('/popular', ProjectController.getPopularProjects)
router.get('/tags/popular', projectLimiter, ProjectController.getPopularTags)

// ✅ TESTE: Rota de criação SEM autenticação para debug
router.post(
  '/test-create',
  testAuthMiddleware,
  projectCreationLimiter,
  checkProjectLimit,
  validateCreateProject,
  ProjectController.create
)

// Aplicar autenticação para o resto das rotas
router.use(authenticateToken)

// Rota para verificar status da fila
router.get('/queue/status', projectLimiter, ProjectController.getQueueStatus)

// Rotas de busca e listagem
router.get(
  '/',
  projectLimiter,
  validatePagination,
  validateSearch,
  ProjectController.findAll
)

// Estatísticas
router.get('/stats', projectLimiter, ProjectController.getStats)
router.get('/stats/types', projectLimiter, ProjectController.getProjectTypeStats)
router.get('/stats/user', projectLimiter, ProjectController.getUserProjectStats)

// ✅ CRUD de projetos individuais COM LIMITAÇÃO
router.post(
  '/',
  projectCreationLimiter,
  checkProjectLimit,              // ✅ NOVO: Verifica limite de projetos
  validateCreateProject,
  ProjectController.create
)

router.get(
  '/:id',
  projectLimiter,
  validateObjectId('id'),
  ProjectController.findOne
)

router.put(
  '/:id',
  projectLimiter,
  validateObjectId('id'),
  validateUpdateProject,
  ProjectController.update
)

router.delete(
  '/:id',
  projectLimiter,
  validateObjectId('id'),
  ProjectController.delete
)

// ✅ OPERAÇÕES ESPECIAIS COM LIMITAÇÃO
router.post(
  '/:id/duplicate',
  projectCreationLimiter,
  checkProjectLimit,              // ✅ NOVO: Verifica limite de projetos
  validateObjectId('id'),
  ProjectController.duplicate
)

router.post(
  '/:id/improve',
  validateObjectId('id'),
  validateImproveEmail,
  ProjectController.improveProjectEmail
)

router.get(
  '/:id/analytics',
  projectLimiter,
  validateObjectId('id'),
  ProjectController.getProjectAnalytics
)

// Toggle visibilidade pública
router.patch(
  '/:id/toggle-public',
  projectLimiter,
  validateObjectId('id'),
  ProjectController.togglePublic
)

// ✅ EXPORTAR PROJETO (requer feature has_html_export)
router.get(
  '/:id/export',
  projectLimiter,
  validateObjectId('id'),
  requireFeature('html_export'),  // ✅ NOVO: Verifica se tem feature
  ProjectController.exportProject
)

// ✅ MOVER PROJETO PARA PASTA (requer feature has_folders)
router.patch(
  '/:id/move-to-folder',
  projectLimiter,
  validateObjectId('id'),
  requireFeature('folders'),      // ✅ NOVO: Verifica se tem feature
  ProjectController.moveToFolder
)

// Aliases para compatibilidade
router.get('/user/projects', projectLimiter, ProjectController.getUserProjects)
router.put('/stats/update', projectLimiter, ProjectController.updateStats)

export default router
