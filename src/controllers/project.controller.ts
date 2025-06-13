import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth.types'
import { CreateProjectDto, UpdateProjectDto, ProjectFilters } from '../types/project.types'
import ProjectService from '../services/project.service'
import AIService from '../services/ai.service'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { asyncHandler, createNotFoundError } from '../middleware/error.middleware'

class ProjectController {
  // ✅ NOVA FUNÇÃO: Gerar nome inteligente baseado no prompt
  private generateSmartProjectName(prompt: string): string {
    // Limpar o prompt
    const cleanPrompt = prompt.trim().toLowerCase()
    
    // Palavras-chave para diferentes tipos de email
    const emailTypes = {
      'newsletter': ['newsletter', 'notícias', 'novidades', 'informativo'],
      'promocional': ['promoção', 'desconto', 'oferta', 'black friday', 'liquidação', 'sale'],
      'boas-vindas': ['boas vindas', 'bem vindo', 'welcome', 'cadastro', 'novo cliente'],
      'seguimento': ['follow up', 'acompanhamento', 'lembrete', 'segunda chance'],
      'anúncio': ['anúncio', 'lançamento', 'novo produto', 'novidade'],
      'abandono': ['carrinho abandonado', 'finalizar compra', 'esqueceu'],
      'emagrecimento': ['emagrecimento', 'emagrecer', 'perder peso', 'dieta', 'fitness'],
      'vendas': ['venda', 'comprar', 'adquirir', 'produto']
    }
    
    // Tentar identificar o tipo baseado no prompt
    let detectedType = 'email'
    for (const [type, keywords] of Object.entries(emailTypes)) {
      if (keywords.some(keyword => cleanPrompt.includes(keyword))) {
        detectedType = type
        break
      }
    }
    
    // Extrair palavras importantes do prompt (substantivos e termos relevantes)
    const importantWords = cleanPrompt
      .replace(/^(crie|criar|gere|gerar|faça|fazer|desenvolva|desenvolver)\s+/i, '') // Remover verbos de ação
      .replace(/\b(um|uma|o|a|do|da|de|para|com|sobre|email|e-mail)\b/g, '') // Remover artigos e preposições
      .split(' ')
      .filter(word => word.length > 3) // Palavras com mais de 3 caracteres
      .slice(0, 3) // Pegar no máximo 3 palavras
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalizar
    
    // Construir o nome
    if (importantWords.length > 0) {
      const baseWords = importantWords.join(' ')
      return `Email ${detectedType === 'email' ? 'de' : detectedType.charAt(0).toUpperCase() + detectedType.slice(1)} - ${baseWords}`
    } else {
      // Fallback baseado no tipo detectado
      const typeNames = {
        'newsletter': 'Newsletter',
        'promocional': 'Promocional',
        'boas-vindas': 'Boas-vindas',
        'seguimento': 'Follow-up',
        'anúncio': 'Anúncio',
        'abandono': 'Carrinho Abandonado',
        'emagrecimento': 'Emagrecimento',
        'vendas': 'Vendas',
        'email': 'Marketing'
      }
      return `Email ${typeNames[detectedType as keyof typeof typeNames]} - ${new Date().toLocaleDateString('pt-BR')}`
    }
  }

  // Criar novo projeto - SIMPLIFICADO SEM FILA
  createProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    console.log('📝 [CREATE PROJECT] Dados recebidos:', {
      body: JSON.stringify(req.body, null, 2),
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    })

    const { 
      prompt, 
      type, 
      industry, 
      targetAudience, 
      tone,
      name // ✅ NOVO: Campo opcional para nome personalizado
    } = req.body as CreateProjectDto & { name?: string }
    
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

    // ✅ NOVO: Gerar nome inteligente se não fornecido
    const projectName = name?.trim() || this.generateSmartProjectName(prompt)
    
    console.log('🏷️ [CREATE PROJECT] Nome do projeto:', {
      providedName: name,
      generatedName: projectName,
      prompt: prompt.substring(0, 50)
    })

    // Aplicar valores padrão para campos opcionais
    const projectData = {
      prompt: prompt.trim(),
      name: projectName,
      type: type || 'newsletter',
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

    // Criar projeto diretamente (sem fila por enquanto)
    try {
      logger.info('Creating project directly', { 
        userId, 
        projectName,
        prompt: prompt.substring(0, 50),
        type: projectData.type
      })

      // Criar projeto usando IA
      const project = await ProjectService.createProjectWithAI(userId, projectData)

      // Rastrear criação do projeto
      await ProjectService.trackProjectCreation(
        userId, 
        project.id || project._id.toString()
      )

      console.log('✅ [CREATE PROJECT] Projeto criado com sucesso:', {
        projectId: project.id || project._id.toString(),
        projectName: project.name,
        userId,
        type: project.type
      })

      logger.info('Project created successfully', { 
        projectId: project.id || project._id, 
        projectName: project.name,
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
        message: `Projeto "${project.name}" criado com sucesso!`,
        data: {
          project: responseProject
        }
      })

    } catch (error: any) {
      console.error('❌ [CREATE PROJECT] Erro na criação:', {
        error: error.message,
        userId,
        projectName,
        prompt: prompt.substring(0, 50)
      })

      logger.error('Project creation failed:', error)

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno ao criar projeto. Nossa equipe foi notificada.',
        error: { code: 'INTERNAL_ERROR' }
      })
    }
  })

  // Endpoint para verificar status da fila
  getQueueStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        queue: {
          status: 'operational',
          message: 'Queue service is a stub - projects created directly'
        }
      }
    })
  })

  // Buscar projetos do usuário
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

      const result = await ProjectService.getUserProjects(filters)

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
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      })

      logger.error('Get user projects failed:', error)

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
    const updates = req.body as UpdateProjectDto & { name?: string }

    // ✅ NOVO: Permitir atualização do nome
    if (updates.name) {
      updates.name = updates.name.trim()
      if (updates.name.length < 3) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Nome do projeto deve ter pelo menos 3 caracteres',
          error: { code: 'INVALID_NAME' }
        })
      }
    }

    const project = await ProjectService.updateProject(id, userId, updates)

    if (!project) {
      throw createNotFoundError('Projeto')
    }

    logger.info('Project updated', { 
      projectId: id, 
      userId, 
      updates: Object.keys(updates),
      newName: updates.name
    })

    res.json({
      success: true,
      message: `Projeto "${project.name}" atualizado com sucesso!`,
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

    try {
      const duplicatedProject = await ProjectService.duplicateProject(id, userId)

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
        message: `Projeto "${duplicatedProject.name}" duplicado com sucesso!`,
        data: { project: duplicatedProject }
      })

    } catch (error: any) {
      logger.error('Project duplication failed:', error)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao duplicar projeto',
        error: { code: 'INTERNAL_ERROR' }
      })
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

  // Melhorar email do projeto - SIMPLIFICADO
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

    try {
      // Usar stub do AI Service
      await AIService.improveEmail(
        JSON.stringify(project.content),
        feedback
      )

      // Atualizar projeto com versão simples
      const updatedProject = await ProjectService.updateProject(id, userId, {
        metadata: {
          ...project.metadata,
          version: (project.metadata?.version || 1) + 1,
          lastImprovement: {
            feedback,
            timestamp: new Date(),
            version: (project.metadata?.version || 1) + 1
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
        message: 'Melhoria de email não disponível. Use o Python AI Service.',
        data: { 
          project: updatedProject,
          improvements: {
            version: updatedProject?.metadata?.version,
            feedback,
            timestamp: new Date()
          }
        }
      })

    } catch (error: any) {
      logger.error('Project email improvement failed:', error)
      
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Serviço de melhoria temporariamente indisponível',
        error: { code: 'AI_SERVICE_ERROR' }
      })
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