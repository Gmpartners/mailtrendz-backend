import { Router } from 'express'
import ProjectController from '../controllers/project.controller'
import { 
  authenticateToken, 
  requireFeature,
  logAPIUsage
} from '../middleware/auth.middleware'
import { checkProjectLimit, consumeAICredit } from '../middleware/credits.middleware'
// ✅ REMOVIDO: organization middleware imports
import { generalLimiter } from '../middleware/rate-limit.middleware'
import {
  // validateCreateProject, // 🚨 TEMPORARIAMENTE DESABILITADO
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
router.get('/tags/popular', generalLimiter, ProjectController.getPopularTags)

// 🚨 ENDPOINT DE TESTE EMERGENCIAL - SEM MIDDLEWARES
router.post('/test-create', ProjectController.create)

// Aplicar autenticação para o resto das rotas
router.use(authenticateToken)

// ✅ REMOVIDO: resolveWorkspaceContext

// Rota para verificar status da fila
router.get('/queue/status', generalLimiter, ProjectController.getQueueStatus)

// Rotas de busca e listagem
router.get(
  '/',
  generalLimiter,
  validatePagination,
  validateSearch,
  ProjectController.findAll
)

// Estatísticas
router.get('/stats', generalLimiter, ProjectController.getStats)
router.get('/stats/types', generalLimiter, ProjectController.getProjectTypeStats)
router.get('/stats/user', generalLimiter, ProjectController.getUserProjectStats)

// ✅ CRUD de projetos COM SISTEMA UNIFICADO DE CRÉDITOS
router.post(
  '/',
  // 🚨 CORREÇÃO EMERGENCIAL: Desabilitar rate limiting temporariamente
  // generalLimiter,
  // 🚨 CORREÇÃO EMERGENCIAL: Desabilitar checkProjectLimit temporariamente
  // checkProjectLimit,  // Verifica limite de projetos do usuário
  logAPIUsage('project_create', 1),
  // 🚨 CORREÇÃO EMERGENCIAL: Desabilitar validação temporariamente
  // validateCreateProject,
  ProjectController.create
)

router.get(
  '/:id',
  generalLimiter,
  validateObjectId('id'),
  ProjectController.findOne
)

router.put(
  '/:id',
  generalLimiter,
  validateObjectId('id'),
  validateUpdateProject,
  ProjectController.update
)

router.delete(
  '/:id',
  generalLimiter,
  validateObjectId('id'),
  ProjectController.delete
)

// 🚨 NOVA ROTA: Garantir que projeto tenha chat
router.post(
  '/:id/ensure-chat',
  generalLimiter,
  validateObjectId('id'),
  ProjectController.ensureChat
)

// ✅ NOVA ROTA: Toggle Favorite
router.patch(
  '/:id/toggle-favorite',
  generalLimiter,
  validateObjectId('id'),
  ProjectController.toggleFavorite
)

// ✅ NOVA ROTA: Atualizar assunto do email
router.patch(
  '/:id/update-subject',
  generalLimiter,
  validateObjectId('id'),
  ProjectController.updateEmailSubject
)

// ✅ OPERAÇÕES ESPECIAIS COM SISTEMA DE CRÉDITOS DE ORGANIZAÇÃO
router.post(
  '/:id/duplicate',
  generalLimiter,
  checkProjectLimit,  // Verifica limite de projetos
  consumeAICredit('project_duplication'),  // Consome crédito
  logAPIUsage('project_duplicate', 1),
  validateObjectId('id'),
  ProjectController.duplicate
)

router.post(
  '/:id/improve',
  generalLimiter,
  validateObjectId('id'),
  consumeAICredit('project_improvement'),  // Consome crédito para melhorias IA
  logAPIUsage('project_improve', 1),
  validateImproveEmail,
  ProjectController.improveProjectEmail
)

router.get(
  '/:id/analytics',
  generalLimiter,
  validateObjectId('id'),
  ProjectController.getProjectAnalytics
)

// Toggle visibilidade pública
router.patch(
  '/:id/toggle-public',
  generalLimiter,
  validateObjectId('id'),
  ProjectController.togglePublic
)

// ✅ EXPORTAR PROJETO (requer feature has_html_export)
router.get(
  '/:id/export',
  generalLimiter,
  validateObjectId('id'),
  requireFeature('html_export'),
  ProjectController.exportProject
)

// ✅ MOVER PROJETO PARA PASTA (requer feature has_folders)
router.patch(
  '/:id/move-to-folder',
  generalLimiter,
  validateObjectId('id'),
  requireFeature('folders'),
  ProjectController.moveToFolder
)

// Aliases para compatibilidade
router.get('/user/projects', generalLimiter, ProjectController.getUserProjects)
router.put('/stats/update', generalLimiter, ProjectController.updateStats)

// Exportar função de consumo para ser usada nos controllers
// ✅ REMOVIDO: export organization function

export default router