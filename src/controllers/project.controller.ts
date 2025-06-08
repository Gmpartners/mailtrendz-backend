import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth.types'
import { CreateProjectDto, UpdateProjectDto, ProjectFilters } from '../types/project.types'
import ProjectService from '../services/project.service'
import AIService from '../services/ai.service'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { asyncHandler, createNotFoundError } from '../middleware/error.middleware'

class ProjectController {
  // Criar novo projeto
  createProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Log detalhado dos dados recebidos
    console.log('📝 [CREATE PROJECT] Dados recebidos:', {
      body: JSON.stringify(req.body, null, 2),
      userId: req.user?.id,
      headers: {
        'content-type': req.headers['content-type'],
        'authorization': req.headers['authorization'] ? 'Bearer [TOKEN]' : 'undefined'
      },
      timestamp: new Date().toISOString()
    })

    const { prompt, type, industry, targetAudience, tone } = req.body as CreateProjectDto
    const userId = req.user!.id

    // Verificar campos obrigatórios
    if (!prompt || prompt.trim().length < 10) {
      console.log('❌ [CREATE PROJECT] Prompt inválido:', { prompt, length: prompt?.length })
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Prompt deve ter pelo menos 10 caracteres',
        error: { code: 'INVALID_PROMPT' }
      })
    }

    // Aplicar valores padrão para campos opcionais
    const projectData = {
      prompt: prompt.trim(),
      type: type || 'campaign',
      industry: industry || 'geral',
      targetAudience: targetAudience || 'Geral',
      tone: tone || 'profissional'
    }

    console.log('🔄 [CREATE PROJECT] Dados processados:', {
      userId,
      projectData,
      timestamp: new Date().toISOString()
    })

    // Verificar limites do usuário
    try {
      const canCreate = await ProjectService.checkUserLimits(userId)
      if (!canCreate) {
        console.log('⚠️ [CREATE PROJECT] Limite excedido:', { userId })
        return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Limite de projetos atingido. Faça upgrade do plano.',
          error: { code: 'LIMIT_EXCEEDED' }
        })
      }
    } catch (error) {
      console.error('❌ [CREATE PROJECT] Erro verificando limites:', error)
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno ao verificar limites',
        error: { code: 'INTERNAL_ERROR' }
      })
    }

    logger.info('Starting AI email generation', { 
      userId, 
      prompt: prompt.substring(0, 50),
      type: projectData.type,
      industry: projectData.industry
    })

    console.log('🤖 [CREATE PROJECT] Iniciando geração com IA...', {
      userId,
      promptPreview: prompt.substring(0, 100),
      aiConfig: {
        type: projectData.type,
        industry: projectData.industry,
        tone: projectData.tone
      }
    })

    try {
      // Criar projeto usando IA
      const project = await ProjectService.createProjectWithAI(userId, projectData)

      // Rastrear criação do projeto
      await ProjectService.trackProjectCreation(userId, project._id.toString())

      console.log('✅ [CREATE PROJECT] Projeto criado com sucesso:', {
        projectId: project._id.toString(),
        userId,
        type: project.type,
        hasContent: !!project.content,
        contentLength: project.content ? Object.keys(project.content).length : 0
      })

      logger.info('Project created successfully', { 
        projectId: project._id, 
        userId, 
        type: project.type 
      })

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
            tags: project.tags,
            color: project.color,
            createdAt: project.createdAt,
            chatId: project.chatId
          }
        }
      })
    } catch (error: any) {
      console.error('❌ [CREATE PROJECT] Erro na criação:', {
        error: error.message,
        stack: error.stack,
        userId,
        prompt: prompt.substring(0, 50),
        aiService: error.message?.includes('OpenRouter') ? 'OpenRouter Error' : 'Other Error'
      })

      logger.error('Project creation failed:', error)

      // Determinar tipo de erro
      if (error.message?.includes('OpenRouter') || error.message?.includes('AI')) {
        return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          message: 'Serviço de IA temporariamente indisponível. Tente novamente em alguns minutos.',
          error: { code: 'AI_SERVICE_ERROR' }
        })
      }

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno ao criar projeto. Nossa equipe foi notificada.',
        error: { code: 'INTERNAL_ERROR' }
      })
    }
  })

  // Buscar projetos do usuário - CORRIGIDO COM LOGS
  getUserProjects = asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('📋 [GET PROJECTS] Iniciando busca de projetos:', {
      userId: req.user?.id,
      query: req.query,
      url: req.url,
      timestamp: new Date().toISOString()
    })

    try {
      const userId = req.user!.id
      const {
        page = 1,
        limit = 12,
        search,
        type,
        category,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = req.query

      console.log('🔍 [GET PROJECTS] Parâmetros processados:', {
        userId,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search,
        type,
        category,
        sortBy,
        sortOrder
      })

      const filters: ProjectFilters = {
        userId,
        search: search as string,
        type: type as string,
        category: category as string,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        },
        sort: {
          field: sortBy as string,
          order: sortOrder as 'asc' | 'desc'
        }
      }

      console.log('⚙️ [GET PROJECTS] Chamando ProjectService.getUserProjects...')
      
      const result = await ProjectService.getUserProjects(filters)

      console.log('✅ [GET PROJECTS] Resultado obtido:', {
        projectsCount: result.projects.length,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        totalItems: result.pagination.totalItems,
        statsTotal: result.stats.total
      })

      res.json({
        success: true,
        data: {
          projects: result.projects,
          pagination: result.pagination,
          stats: result.stats
        }
      })

    } catch (error: any) {
      console.error('❌ [GET PROJECTS] Erro detalhado:', {
        message: error.message,
        stack: error.stack,
        userId: req.user?.id,
        query: req.query,
        name: error.name,
        code: error.code,
        timestamp: new Date().toISOString()
      })

      logger.error('Get user projects failed:', error)

      // Retornar erro 500 com mais detalhes para debug
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno ao buscar projetos',
        error: { 
          code: 'INTERNAL_ERROR',
          details: error.message
        }
      })
    }
  })

  // Buscar projeto específico
  getProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const project = await ProjectService.getProjectById(id, userId)

    if (!project) {
      throw createNotFoundError('Projeto')
    }

    // Incrementar visualizações
    await ProjectService.incrementProjectViews(id)

    res.json({
      success: true,
      data: { project }
    })
  })

  // Atualizar projeto
  updateProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id
    const updates = req.body as UpdateProjectDto

    const project = await ProjectService.updateProject(id, userId, updates)

    if (!project) {
      throw createNotFoundError('Projeto')
    }

    logger.info('Project updated', { 
      projectId: id, 
      userId, 
      updates: Object.keys(updates) 
    })

    res.json({
      success: true,
      message: 'Projeto atualizado com sucesso!',
      data: { project }
    })
  })

  // Deletar projeto
  deleteProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const deleted = await ProjectService.deleteProject(id, userId)

    if (!deleted) {
      throw createNotFoundError('Projeto')
    }

    logger.info('Project deleted', { projectId: id, userId })

    res.json({
      success: true,
      message: 'Projeto deletado com sucesso!'
    })
  })

  // Duplicar projeto
  duplicateProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    // Verificar limites
    const canCreate = await ProjectService.checkUserLimits(userId)
    if (!canCreate) {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Limite de projetos atingido. Faça upgrade do plano.',
        error: { code: 'LIMIT_EXCEEDED' }
      })
    }

    const duplicatedProject = await ProjectService.duplicateProject(id, userId)

    if (!duplicatedProject) {
      throw createNotFoundError('Projeto original')
    }

    logger.info('Project duplicated', { 
      originalId: id, 
      duplicatedId: duplicatedProject._id, 
      userId 
    })

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Projeto duplicado com sucesso!',
      data: { project: duplicatedProject }
    })
  })

  // Buscar analytics do projeto
  getProjectAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const analytics = await ProjectService.getProjectAnalytics(id, userId)

    if (!analytics) {
      throw createNotFoundError('Projeto')
    }

    res.json({
      success: true,
      data: { analytics }
    })
  })

  // Melhorar email do projeto
  improveProjectEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const { feedback } = req.body
    const userId = req.user!.id

    if (!feedback || feedback.trim().length < 10) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Feedback deve ter pelo menos 10 caracteres'
      })
    }

    const project = await ProjectService.getProjectById(id, userId)
    if (!project) {
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
    const improvedContent = await AIService.improveEmail(
      project.content,
      feedback,
      context
    )

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
      }
    })
  })

  // Buscar projetos populares (públicos)
  getPopularProjects = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 10 } = req.query

    const projects = await ProjectService.getPopularProjects(parseInt(limit as string))

    res.json({
      success: true,
      data: { projects }
    })
  })

  // Buscar estatísticas de tipos de projeto
  getProjectTypeStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    const stats = await ProjectService.getProjectTypeStats(userId)

    res.json({
      success: true,
      data: { stats }
    })
  })

  // Buscar estatísticas gerais dos projetos do usuário
  getUserProjectStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    const stats = await ProjectService.getUserProjectStats(userId)

    res.json({
      success: true,
      data: { stats }
    })
  })

  // Health check
  healthCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
    const health = {
      status: 'ok',
      timestamp: new Date(),
      service: 'projects',
      version: process.env.npm_package_version || '1.0.0'
    }

    res.json({
      success: true,
      data: health
    })
  })
}

export default new ProjectController()