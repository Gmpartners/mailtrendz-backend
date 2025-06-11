import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth.types'
import { CreateProjectDto, UpdateProjectDto, ProjectFilters } from '../types/project.types'
import ProjectService from '../services/project.service'
import AIService from '../services/ai.service'
import { projectQueue } from '../services/queue.service'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { asyncHandler, createNotFoundError } from '../middleware/error.middleware'

class ProjectController {
  // Criar novo projeto COM FILA
  createProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('📝 [CREATE PROJECT] Dados recebidos:', {
      body: JSON.stringify(req.body, null, 2),
      userId: req.user?.id,
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

    // ✅ NOVO: Verificar status da fila
    const queueStatus = projectQueue.getQueueStatus()
    const userPosition = projectQueue.getUserQueuePosition(userId)
    
    console.log('📊 [CREATE PROJECT] Status da fila:', {
      queueLength: queueStatus.queueLength,
      processing: queueStatus.processing,
      userPosition,
      userCooldown: queueStatus.userCooldowns[userId]
    })

    // ✅ NOVO: Adicionar à fila ao invés de processar diretamente
    try {
      logger.info('Adding project to queue', { 
        userId, 
        prompt: prompt.substring(0, 50),
        type: projectData.type,
        queueStatus
      })

      // Adicionar à fila com processador
      const project = await projectQueue.add(
        userId,
        projectData,
        async (data) => {
          // Este código será executado quando chegar a vez na fila
          console.log('🤖 [QUEUE] Processando projeto:', {
            userId,
            promptPreview: data.prompt.substring(0, 100)
          })

          // Criar projeto usando IA
          const createdProject = await ProjectService.createProjectWithAI(userId, data)

          // Rastrear criação do projeto
          await ProjectService.trackProjectCreation(
            userId, 
            createdProject.id || createdProject._id.toString()
          )

          return createdProject
        },
        2 // Prioridade padrão
      )

      console.log('✅ [CREATE PROJECT] Projeto criado com sucesso:', {
        projectId: project.id || project._id.toString(),
        userId,
        type: project.type
      })

      logger.info('Project created successfully', { 
        projectId: project.id || project._id, 
        userId, 
        type: project.type 
      })

      // GARANTIR QUE SEMPRE RETORNE ID
      const responseProject = {
        id: project.id || project._id.toString(),
        name: project.name,
        description: project.description,
        type: project.type,
        content: project.content,
        tags: project.tags,
        color: project.color,
        createdAt: project.createdAt,
        chatId: project.chatId,
        metadata: project.metadata,
        status: project.status
      }

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Projeto criado com sucesso!',
        data: {
          project: responseProject,
          queue: {
            position: userPosition,
            estimatedTime: userPosition > 0 ? userPosition * 3 : 0 // segundos estimados
          }
        }
      })

    } catch (error: any) {
      console.error('❌ [CREATE PROJECT] Erro na criação:', {
        error: error.message,
        userId,
        prompt: prompt.substring(0, 50)
      })

      logger.error('Project creation failed:', error)

      // ✅ NOVO: Mensagens de erro mais específicas
      if (error.message?.includes('aguarde')) {
        return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          message: error.message,
          error: { 
            code: 'RATE_LIMIT',
            cooldownSeconds: parseInt(error.message.match(/\d+/)?.[0] || '60')
          }
        })
      }

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

  // ✅ NOVO: Endpoint para verificar status da fila
  getQueueStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const status = projectQueue.getQueueStatus()
    const position = projectQueue.getUserQueuePosition(userId)

    res.json({
      success: true,
      data: {
        queue: {
          length: status.queueLength,
          processing: status.processing,
          userPosition: position,
          userCooldown: status.userCooldowns[userId] || 0,
          estimatedWaitTime: position > 0 ? position * 3 : 0
        }
      }
    })
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

  // Duplicar projeto COM FILA
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

    // ✅ NOVO: Usar fila para duplicação também
    try {
      const duplicatedProject = await projectQueue.add(
        userId,
        { originalId: id },
        async (data) => {
          return await ProjectService.duplicateProject(data.originalId, userId)
        },
        1 // Prioridade menor que criação nova
      )

      if (!duplicatedProject) {
        throw createNotFoundError('Projeto original')
      }

      logger.info('Project duplicated', { 
        originalId: id, 
        duplicatedId: duplicatedProject.id || duplicatedProject._id, 
        userId 
      })

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Projeto duplicado com sucesso!',
        data: { project: duplicatedProject }
      })

    } catch (error: any) {
      if (error.message?.includes('aguarde')) {
        return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          message: error.message,
          error: { code: 'RATE_LIMIT' }
        })
      }

      throw error
    }
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

  // Melhorar email do projeto COM FILA
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

    // ✅ NOVO: Usar fila para melhorias também
    try {
      const improvedProject = await projectQueue.add(
        userId,
        { projectId: id, feedback, project },
        async (data) => {
          // Preparar contexto
          const context = {
            userId,
            type: data.project.type,
            industry: data.project.metadata.industry,
            projectName: data.project.name,
            targetAudience: data.project.metadata.targetAudience,
            tone: data.project.metadata.tone,
            status: data.project.status
          }

          // Melhorar email com IA
          const improvedContent = await AIService.improveEmail(
            data.project.content,
            data.feedback,
            context
          )

          // Atualizar projeto
          return await ProjectService.updateProject(data.projectId, userId, {
            content: improvedContent,
            metadata: {
              ...data.project.metadata,
              version: (data.project.metadata.version || 1) + 1,
              lastImprovement: {
                feedback: data.feedback,
                timestamp: new Date(),
                version: (data.project.metadata.version || 1) + 1
              }
            }
          })
        },
        3 // Alta prioridade para melhorias
      )

      logger.info('Project email improved', { 
        projectId: id, 
        userId, 
        feedback: feedback.substring(0, 50) 
      })

      res.json({
        success: true,
        message: 'Email melhorado com sucesso!',
        data: { 
          project: improvedProject,
          improvements: {
            version: improvedProject?.metadata.version,
            feedback,
            timestamp: new Date()
          }
        }
      })

    } catch (error: any) {
      if (error.message?.includes('aguarde')) {
        return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          message: error.message,
          error: { code: 'RATE_LIMIT' }
        })
      }

      throw error
    }
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