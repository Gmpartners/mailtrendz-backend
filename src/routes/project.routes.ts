import { Router } from 'express'
import ProjectController from '../controllers/project.controller'
import { authenticateToken, checkAPILimits } from '../middleware/auth.middleware'
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

// ✅ CORREÇÃO: Rotas públicas ANTES da autenticação
router.get('/health', ProjectController.healthCheck)
router.get('/popular', ProjectController.getPopularProjects)

// ✅ AGORA aplicar autenticação para o resto das rotas
router.use(authenticateToken)

// ✅ NOVO: Rota para verificar status da fila
router.get('/queue/status', projectLimiter, ProjectController.getQueueStatus)

// Rotas de busca e listagem
router.get(
  '/',
  projectLimiter,
  validatePagination,
  validateSearch,
  ProjectController.getUserProjects
)

// Estatísticas
router.get('/stats', projectLimiter, ProjectController.getUserProjectStats)
router.get('/stats/types', projectLimiter, ProjectController.getProjectTypeStats)

// CRUD de projetos individuais
router.post(
  '/',
  projectCreationLimiter,
  checkAPILimits,
  validateCreateProject,
  ProjectController.createProject
)

router.get(
  '/:id',
  projectLimiter,
  validateObjectId('id'),
  ProjectController.getProject
)

router.put(
  '/:id',
  projectLimiter,
  validateObjectId('id'),
  validateUpdateProject,
  ProjectController.updateProject
)

router.delete(
  '/:id',
  projectLimiter,
  validateObjectId('id'),
  ProjectController.deleteProject
)

// Operações especiais
router.post(
  '/:id/duplicate',
  projectCreationLimiter,
  validateObjectId('id'),
  ProjectController.duplicateProject
)

router.post(
  '/:id/improve',
  checkAPILimits,
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

export default router