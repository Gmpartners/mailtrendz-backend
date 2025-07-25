import { Router } from 'express'
import ProjectController from '../controllers/project.controller'
import { 
  authenticateToken, 
  checkProjectLimit, 
  requireFeature,
  consumeCredits,
  logAPIUsage
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

// Rotas públicas ANTES da autenticação
router.get('/health', ProjectController.healthCheck)
router.get('/popular', ProjectController.getPopularProjects)
router.get('/tags/popular', projectLimiter, ProjectController.getPopularTags)

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

// ✅ CRUD de projetos individuais COM LIMITAÇÃO E CONSUMO DE CRÉDITOS
router.post(
  '/',
  projectCreationLimiter,
  checkProjectLimit,
  consumeCredits(1),
  logAPIUsage('project_create', 1),
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

// ✅ OPERAÇÕES ESPECIAIS COM LIMITAÇÃO E CONSUMO DE CRÉDITOS
router.post(
  '/:id/duplicate',
  projectCreationLimiter,
  checkProjectLimit,
  consumeCredits(1),
  logAPIUsage('project_duplicate', 1),
  validateObjectId('id'),
  ProjectController.duplicate
)

router.post(
  '/:id/improve',
  validateObjectId('id'),
  consumeCredits(1),
  logAPIUsage('project_improve', 1),
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
  requireFeature('html_export'),
  ProjectController.exportProject
)

// ✅ MOVER PROJETO PARA PASTA (requer feature has_folders)
router.patch(
  '/:id/move-to-folder',
  projectLimiter,
  validateObjectId('id'),
  requireFeature('folders'),
  ProjectController.moveToFolder
)

// Aliases para compatibilidade
router.get('/user/projects', projectLimiter, ProjectController.getUserProjects)
router.put('/stats/update', projectLimiter, ProjectController.updateStats)

export default router
