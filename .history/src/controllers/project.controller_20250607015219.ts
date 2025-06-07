import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth.types'
import { CreateProjectDto, UpdateProjectDto, ProjectFilters } from '../types/project.types'
import ProjectService from '../services/project.service'
import AIService from '../services/ai.service'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { 
  asyncHandler, 
  createNotFoundError, 
  createValidationError,
  createRateLimitError,
  createExternalServiceError
} from '../middleware/error.middleware'

class ProjectController {
  // ✅ CRIAR NOVO PROJETO - MELHORADO
  createProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Log detalhado dos dados recebidos
    logger.info('📝 [CREATE PROJECT] Request received', {
      body: {
        prompt: req.body?.prompt ? `${req.body.prompt.substring(0, 100)}...` : 'undefined',
        type: req.body?.type,
        industry: req.body?.industry,
        tone: req.body?.tone,
        promptLength: req.body?.prompt?.length
      },
      userId: req.user?.id,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']?.substring(0, 50),
        'authorization': req.headers['authorization'] ? 'Bearer [PRESENT]' : 'undefined'
      },
      timestamp: new Date().toISOString()
    })

    const { prompt, type, industry, targetAudience, tone } = req.body as CreateProjectDto
    const userId = req.user!.id

    // ✅ VALIDAÇÃO RIGOROSA
    if (!prompt || typeof prompt !== 'string') {
      logger.warn('❌ [CREATE PROJECT] Invalid prompt', { 
        prompt: typeof prompt, 
        userId,
        received: req.body 
      })
      throw createValidationError('Prompt é obrigatório e deve ser uma string válida')
    }

    const trimmedPrompt = prompt.trim()
    if (trimmedPrompt.length < 10) {
      logger.warn('❌ [CREATE PROJECT] Prompt too short', { 
        promptLength: trimmedPrompt.length, 
        userId,
        prompt: trimmedPrompt
      })
      throw createValidationError('Prompt deve ter pelo menos 10 caracteres', {
        field: 'prompt',
        value: trimmedPrompt,
        minLength: 10,
        currentLength: trimmedPrompt.length
      })
    }

    if (trimmedPrompt.length > 1000) {
      logger.warn('❌ [CREATE PROJECT] Prompt too long', { 
        promptLength: trimmedPrompt.length, 
        userId 
      })
      throw createValidationError('Prompt deve ter no máximo 1000 caracteres', {
        field: 'prompt',
        maxLength: 1000,
        currentLength: trimmedPrompt.length
      })
    }

    // Aplicar valores padrão e validar tipos
    const projectData = {
      prompt: trimmedPrompt,
      type: typeof type === 'string' ? type : 'campaign',
      industry: typeof industry === 'string' ? industry : 'geral',
      targetAudience: typeof targetAudience === 'string' ? targetAudience : undefined,
      tone: typeof tone === 'string' ? tone : 'profissional'
    }

    logger.info('🔄 [CREATE PROJECT] Data validated and processed', {
      userId,
      projectData: {
        ...projectData,
        prompt: `${projectData.prompt.substring(0, 50)}...`
      },
      timestamp: new Date().toISOString()
    })

    // ✅ VERIFICAR LIMITES DO USUÁRIO COM TRATAMENTO DE ERRO
    try {
      const canCreate = await ProjectService.checkUserLimits(userId)
      if (!canCreate) {
        logger.warn('⚠️ [CREATE PROJECT] User limit exceeded', { 
          userId,
          action: 'project_creation_blocked'
        })
        throw createRateLimitError({
          message: 'Limite de projetos atingido. Faça upgrade do plano.',
          userId,
          endpoint: 'create_project'
        })
      }
    } catch (error: any) {
      if (error.statusCode === HTTP_STATUS.TOO_MANY_REQUESTS) {
        throw error // Re-throw rate limit errors
      }
      
      logger.error('❌ [CREATE PROJECT] Error checking user limits', {
        userId,
        error: error.message,
        stack: error.stack
      })
      throw createExternalServiceError('verificação de limites', error)
    }

    logger.info('Starting AI email generation', { 
      userId, 
      prompt: trimmedPrompt.substring(0, 50),
      type: projectData.type,
      industry: projectData.industry
    })

    logger.info('🤖 [CREATE PROJECT] Starting AI generation', {
      userId,
      promptPreview: trimmedPrompt.substring(0, 100),
      aiConfig: {
        type: projectData.type,
        industry: projectData.industry,
        tone: projectData.tone
      }
    })

    try {
      // ✅ CRIAR PROJETO USANDO IA COM FALLBACK
      const project = await ProjectService.createProjectWithAI(userId, projectData)

      // ✅ RASTREAR CRIAÇÃO DO PROJETO
      try {
        await ProjectService.trackProjectCreation(userId, project._id.toString())
      } catch (trackingError: any) {
        // Log mas não falhar se tracking falhar
        logger.warn('⚠️ [CREATE PROJECT] Failed to track project creation', {
          projectId: project._id.toString(),
          userId,
          error: trackingError.message
        })
      }

      logger.info('✅ [CREATE PROJECT] Project created successfully', {
        projectId: project._id.toString(),
        userId,
        type: project.type,
        hasContent: !!project.content,
        contentKeys: project.content ? Object.keys(project.content) : [],
        responseTime: new Date().toISOString()
      })

      logger.info('Project created successfully', { 
        projectId: project._id, 
        userId, 
        type: project.type 
      })

      // ✅ RESPOSTA PADRONIZADA
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Projeto criado com sucesso!',
        data: {
          project: {
            id: project._id,
            name: project.name,
            description: project.description,
            type: project.type,
            content: project.content,
            metadata: project.metadata,
            tags: project.tags,
            color: project.color,
            createdAt: project.createdAt,
            chatId: project.chatId
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: res.get('X-Response-Time')
        }
      })
    } catch (error: any) {
      logger.error('❌ [CREATE PROJECT] Project creation failed', {
        error: error.message,
        stack: error.stack,
        userId,
        prompt: trimmedPrompt.substring(0, 50),
        errorType: error.constructor.name,
        aiService: error.message?.includes('OpenRouter') ? 'OpenRouter Error' : 'Other Error'
      })

      logger.error('Project creation failed:', error)

      // ✅ DETERMINAR TIPO DE ERRO COM DETALHES
      if (error.message?.includes('OpenRouter') || error.message?.includes('AI')) {
        throw createExternalServiceError('IA', error)
      }

      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        throw createExternalServiceError('IA (timeout)', error)
      }

      if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
        throw createRateLimitError({
          service: 'AI',
          details: error.message
        })
      }

      // Se é um erro conhecido, re-throw
      if (error.statusCode && error.isOperational) {
        throw error
      }

      // Erro interno genérico
      throw new Error('Erro interno ao criar projeto. Nossa equipe foi notificada.')
    }
  })

  // ✅ BUSCAR PROJETOS DO USUÁRIO - MELHORADO
  getUserProjects = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const {
      page = 1,
      limit = 12,
      search,
      type,
      status,
      category,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query

    // Validar parâmetros de entrada
    const pageNum = Math.max(1, parseInt(page as string) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 12))

    const filters: ProjectFilters = {
      userId,
      search: typeof search === 'string' ? search.trim() : undefined,
      type: typeof type === 'string' ? type : undefined,
      status: typeof status === 'string' ? status : undefined,
      pagination: {
        page: pageNum,
        limit: limitNum
      },
      sort: {
        field: typeof sortBy === 'string' ? sortBy : 'updatedAt',
        order: sortOrder === 'asc' ? 'asc' : 'desc'
      }
    }

    logger.info('📋 [GET PROJECTS] Fetching user projects', {
      userId,
      filters: {
        ...filters,
        userId: '[REDACTED]'
      },
      timestamp: new Date().toISOString()
    })

    try {
      const result = await ProjectService.getUserProjects(filters)

      logger.info('✅ [GET PROJECTS] Projects fetched successfully', {
        userId,
        count: result.projects.length,
        totalItems: result.pagination.totalItems,
        page: result.pagination.currentPage,
        totalPages: result.pagination.totalPages
      })

      res.json({
        success: true,
        data: {
          projects: result.projects,
          pagination: result.pagination,
          stats: result.stats
        },
        meta: {
          timestamp: new Date().toISOString(),
          query: {
            page: pageNum,
            limit: limitNum,
            search: search || null,
            type: type || null,
            status: status || null
          }
        }
      })
    } catch (error: any) {
      logger.error('❌ [GET PROJECTS] Failed to fetch projects', {
        userId,
        error: error.message,
        filters
      })
      throw error
    }
  })

  // ✅ BUSCAR PROJETO ESPECÍFICO - MELHORADO
  getProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    // Validar ID
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw createValidationError('ID do projeto é obrigatório', {
        field: 'id',
        received: id
      })
    }

    logger.info('🔍 [GET PROJECT] Fetching specific project', {
      projectId: id,
      userId,
      timestamp: new Date().toISOString()
    })

    try {
      const project = await ProjectService.getProjectById(id, userId)

      if (!project) {
        logger.warn('⚠️ [GET PROJECT] Project not found', {
          projectId: id,
          userId
        })
        throw createNotFoundError('Projeto')
      }

      // ✅ INCREMENTAR VISUALIZAÇÕES DE FORMA SEGURA
      try {
        await ProjectService.incrementProjectViews(id)
      } catch (viewError: any) {
        logger.warn('⚠️ [GET PROJECT] Failed to increment views', {
          projectId: id,
          error: viewError.message
        })
        // Não falhar a requisição por causa disso
      }

      logger.info('✅ [GET PROJECT] Project fetched successfully', {
        projectId: id,
        userId,
        projectName: project.name,
        projectType: project.type
      })

      res.json({
        success: true,
        data: { project },
        meta: {
          timestamp: new Date().toISOString()
        }
      })
    } catch (error: any) {
      if (error.statusCode && error.isOperational) {
        throw error // Re-throw known errors
      }

      logger.error('❌ [GET PROJECT] Failed to fetch project', {
        projectId: id,
        userId,
        error: error.message,
        stack: error.stack
      })
      
      throw new Error('Erro ao buscar projeto')
    }
  })

  // ✅ ATUALIZAR PROJETO - MELHORADO
  updateProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id
    const updates = req.body as UpdateProjectDto

    // Validações
    if (!id || typeof id !== 'string') {
      throw createValidationError('ID do projeto é obrigatório')
    }

    if (!updates || typeof updates !== 'object') {
      throw createValidationError('Dados para atualização são obrigatórios')
    }

    logger.info('📝 [UPDATE PROJECT] Starting project update', {
      projectId: id,
      userId,
      updateFields: Object.keys(updates),
      timestamp: new Date().toISOString()
    })

    try {
      const project = await ProjectService.updateProject(id, userId, updates)

      if (!project) {
        logger.warn('⚠️ [UPDATE PROJECT] Project not found', {
          projectId: id,
          userId
        })
        throw createNotFoundError('Projeto')
      }

      logger.info('✅ [UPDATE PROJECT] Project updated successfully', {
        projectId: id,
        userId,
        updateFields: Object.keys(updates)
      })

      logger.info('Project updated', { 
        projectId: id, 
        userId, 
        updates: Object.keys(updates) 
      })

      res.json({
        success: true,
        message: 'Projeto atualizado com sucesso!',
        data: { project },
        meta: {
          timestamp: new Date().toISOString(),
          updatedFields: Object.keys(updates)
        }
      })
    } catch (error: any) {
      if (error.statusCode && error.isOperational) {
        throw error
      }

      logger.error('❌ [UPDATE PROJECT] Failed to update project', {
        projectId: id,
        userId,
        error: error.message,
        stack: error.stack
      })
      
      throw new Error('Erro ao atualizar projeto')
    }
  })

  // ✅ DELETAR PROJETO - MELHORADO
  deleteProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    if (!id || typeof id !== 'string') {
      throw createValidationError('ID do projeto é obrigatório')
    }

    logger.info('🗑️ [DELETE PROJECT] Starting project deletion', {
      projectId: id,
      userId,
      timestamp: new Date().toISOString()
    })

    try {
      const deleted = await ProjectService.deleteProject(id, userId)

      if (!deleted) {
        logger.warn('⚠️ [DELETE PROJECT] Project not found', {
          projectId: id,
          userId
        })
        throw createNotFoundError('Projeto')
      }

      logger.info('✅ [DELETE PROJECT] Project deleted successfully', {
        projectId: id,
        userId
      })

      logger.info('Project deleted', { projectId: id, userId })

      res.json({
        success: true,
        message: 'Projeto deletado com sucesso!',
        meta: {
          timestamp: new Date().toISOString(),
          deletedProjectId: id
        }
      })
    } catch (error: any) {
      if (error.statusCode && error.isOperational) {
        throw error
      }

      logger.error('❌ [DELETE PROJECT] Failed to delete project', {
        projectId: id,
        userId,
        error: error.message,
        stack: error.stack
      })
      
      throw new Error('Erro ao deletar projeto')
    }
  })

  // ✅ DUPLICAR PROJETO - MELHORADO
  duplicateProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    if (!id || typeof id !== 'string') {
      throw createValidationError('ID do projeto é obrigatório')
    }

    logger.info('📋 [DUPLICATE PROJECT] Starting project duplication', {
      originalProjectId: id,
      userId,
      timestamp: new Date().toISOString()
    })

    // Verificar limites antes de duplicar
    try {
      const canCreate = await ProjectService.checkUserLimits(userId)
      if (!canCreate) {
        logger.warn('⚠️ [DUPLICATE PROJECT] User limit exceeded', {
          userId,
          originalProjectId: id
        })
        throw createRateLimitError({
          message: 'Limite de projetos atingido. Faça upgrade do plano.',
          action: 'duplicate_project'
        })
      }
    } catch (error: any) {
      if (error.statusCode === HTTP_STATUS.TOO_MANY_REQUESTS) {
        throw error
      }
      logger.error('❌ [DUPLICATE PROJECT] Error checking user limits', {
        userId,
        error: error.message
      })
      throw createExternalServiceError('verificação de limites', error)
    }

    try {
      const duplicatedProject = await ProjectService.duplicateProject(id, userId)

      if (!duplicatedProject) {
        logger.warn('⚠️ [DUPLICATE PROJECT] Original project not found', {
          originalProjectId: id,
          userId
        })
        throw createNotFoundError('Projeto original')
      }

      logger.info('✅ [DUPLICATE PROJECT] Project duplicated successfully', {
        originalProjectId: id,
        duplicatedProjectId: duplicatedProject._id.toString(),
        userId
      })

      logger.info('Project duplicated', { 
        originalId: id, 
        duplicatedId: duplicatedProject._id, 
        userId 
      })

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Projeto duplicado com sucesso!',
        data: { project: duplicatedProject },
        meta: {
          timestamp: new Date().toISOString(),
          originalProjectId: id,
          duplicatedProjectId: duplicatedProject._id.toString()
        }
      })
    } catch (error: any) {
      if (error.statusCode && error.isOperational) {
        throw error
      }

      logger.error('❌ [DUPLICATE PROJECT] Failed to duplicate project', {
        originalProjectId: id,
        userId,
        error: error.message,
        stack: error.stack
      })
      
      throw new Error('Erro ao duplicar projeto')
    }
  })

  // ✅ BUSCAR ANALYTICS DO PROJETO - MELHORADO
  getProjectAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    if (!id || typeof id !== 'string') {
      throw createValidationError('ID do projeto é obrigatório')
    }

    logger.info('📊 [GET ANALYTICS] Fetching project analytics', {
      projectId: id,
      userId,
      timestamp: new Date().toISOString()
    })

    try {
      const analytics = await ProjectService.getProjectAnalytics(id, userId)

      if (!analytics) {
        logger.warn('⚠️ [GET ANALYTICS] Project not found', {
          projectId: id,
          userId
        })
        throw createNotFoundError('Projeto')
      }

      logger.info('✅ [GET ANALYTICS] Analytics fetched successfully', {
        projectId: id,
        userId
      })

      res.json({
        success: true,
        data: { analytics },
        meta: {
          timestamp: new Date().toISOString()
        }
      })
    } catch (error: any) {
      if (error.statusCode && error.isOperational) {
        throw error
      }

      logger.error('❌ [GET ANALYTICS] Failed to fetch analytics', {
        projectId: id,
        userId,
        error: error.message,
        stack: error.stack
      })
      
      throw new Error('Erro ao buscar analytics do projeto')
    }
  })

  // ✅ MELHORAR EMAIL DO PROJETO - MELHORADO
  improveProjectEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const { feedback } = req.body
    const userId = req.user!.id

    // Validações
    if (!id || typeof id !== 'string') {
      throw createValidationError('ID do projeto é obrigatório')
    }

    if (!feedback || typeof feedback !== 'string' || feedback.trim().length < 10) {
      throw createValidationError('Feedback deve ter pelo menos 10 caracteres', {
        field: 'feedback',
        received: feedback,
        minLength: 10
      })
    }

    logger.info('🔧 [IMPROVE EMAIL] Starting email improvement', {
      projectId: id,
      userId,
      feedbackLength: feedback.length,
      timestamp: new Date().toISOString()
    })

    try {
      const project = await ProjectService.getProjectById(id, userId)
      if (!project) {
        logger.warn('⚠️ [IMPROVE EMAIL] Project not found', {
          projectId: id,
          userId
        })
        throw createNotFoundError('Projeto')
      }

      // Preparar contexto
      const context = {
        userId,
        type: project.type,
        industry: project.metadata.industry,
        projectName: project.name,
        targetAudience: project.metadata.targetAudience,
        tone: project.metadata.tone,
        status: project.status
      }

      // Melhorar email com IA
      let improvedContent
      try {
        improvedContent = await AIService.improveEmail(
          project.content,
          feedback,
          context
        )
      } catch (aiError: any) {
        logger.error('❌ [IMPROVE EMAIL] AI service failed', {
          projectId: id,
          userId,
          error: aiError.message
        })
        throw createExternalServiceError('IA', aiError)
      }

      // Atualizar projeto
      const updatedProject = await ProjectService.updateProject(id, userId, {
        content: improvedContent,
        metadata: {
          ...project.metadata,
          version: (project.metadata.version || 1) + 1,
          lastImprovement: {
            feedback,
            timestamp: new Date(),
            version: (project.metadata.version || 1) + 1
          }
        }
      })

      logger.info('✅ [IMPROVE EMAIL] Email improved successfully', {
        projectId: id,
        userId,
        newVersion: updatedProject?.metadata.version
      })

      logger.info('Project email improved', { 
        projectId: id, 
        userId, 
        feedback: feedback.substring(0, 50) 
      })

      res.json({
        success: true,
        message: 'Email melhorado com sucesso!',
        data: { 
          project: updatedProject,
          improvements: {
            version: updatedProject?.metadata.version,
            feedback,
            timestamp: new Date()
          }
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      })
    } catch (error: any) {
      if (error.statusCode && error.isOperational) {
        throw error
      }

      logger.error('❌ [IMPROVE EMAIL] Failed to improve email', {
        projectId: id,
        userId,
        error: error.message,
        stack: error.stack
      })
      
      throw new Error('Erro ao melhorar email')
    }
  })

  // ✅ BUSCAR PROJETOS POPULARES - MELHORADO
  getPopularProjects = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 10 } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10))

    logger.info('🔥 [GET POPULAR] Fetching popular projects', {
      limit: limitNum,
      timestamp: new Date().toISOString()
    })

    try {
      const projects = await ProjectService.getPopularProjects(limitNum)

      logger.info('✅ [GET POPULAR] Popular projects fetched successfully', {
        count: projects.length,
        limit: limitNum
      })

      res.json({
        success: true,
        data: { projects },
        meta: {
          timestamp: new Date().toISOString(),
          count: projects.length,
          limit: limitNum
        }
      })
    } catch (error: any) {
      logger.error('❌ [GET POPULAR] Failed to fetch popular projects', {
        error: error.message,
        stack: error.stack
      })
      
      throw new Error('Erro ao buscar projetos populares')
    }
  })

  // ✅ BUSCAR ESTATÍSTICAS DE TIPOS - MELHORADO
  getProjectTypeStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    logger.info('📈 [GET TYPE STATS] Fetching project type statistics', {
      userId,
      timestamp: new Date().toISOString()
    })

    try {
      const stats = await ProjectService.getProjectTypeStats(userId)

      logger.info('✅ [GET TYPE STATS] Type statistics fetched successfully', {
        userId,
        statsCount: stats.length
      })

      res.json({
        success: true,
        data: { stats },
        meta: {
          timestamp: new Date().toISOString()
        }
      })
    } catch (error: any) {
      logger.error('❌ [GET TYPE STATS] Failed to fetch type statistics', {
        userId,
        error: error.message,
        stack: error.stack
      })
      
      throw new Error('Erro ao buscar estatísticas de tipos')
    }
  })

  // ✅ BUSCAR ESTATÍSTICAS GERAIS - MELHORADO
  getUserProjectStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    logger.info('📊 [GET USER STATS] Fetching user project statistics', {
      userId,
      timestamp: new Date().toISOString()
    })

    try {
      const stats = await ProjectService.getUserProjectStats(userId)

      logger.info('✅ [GET USER STATS] User statistics fetched successfully', {
        userId,
        totalProjects: stats.totalProjects
      })

      res.json({
        success: true,
        data: { stats },
        meta: {
          timestamp: new Date().toISOString()
        }
      })
    } catch (error: any) {
      logger.error('❌ [GET USER STATS] Failed to fetch user statistics', {
        userId,
        error: error.message,
        stack: error.stack
      })
      
      throw new Error('Erro ao buscar estatísticas do usuário')
    }
  })

  // ✅ HEALTH CHECK - MELHORADO
  healthCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
    logger.info('🏥 [HEALTH CHECK] Health check requested', {
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent']
    })

    const health = {
      status: 'ok',
      timestamp: new Date(),
      service: 'projects',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'unknown'
    }

    res.json({
      success: true,
      data: health,
      meta: {
        timestamp: new Date().toISOString()
      }
    })
  })
}

export default new ProjectController()
