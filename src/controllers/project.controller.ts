import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import ProjectService from '../services/project.service'
import { CreateProjectDto, UpdateProjectDto, ProjectQuery } from '../types/project.types'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'
import { supabaseAdmin, supabase } from '../config/supabase.config'

function getUserToken(req: AuthRequest): string | undefined {
  const authHeader = req.headers.authorization
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
}

class ProjectController {
  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const projectData: CreateProjectDto = req.body


    const project = await ProjectService.create(userId, projectData, userToken)

    // ❌ REMOVIDO: Duplo logging - já é feito pelo middleware logAPIUsage
    // await supabaseAdmin.rpc('increment_api_usage', {
    //   p_user_id: userId,
    //   p_endpoint: '/projects/create',
    //   p_tokens: 0,
    //   p_cost: 0
    // })

    const response = {
      success: true,
      message: 'Projeto criado com sucesso',
      data: { project }
    }

    res.status(HTTP_STATUS.CREATED).json(response)

  })

  // 🚨 NOVA FUNÇÃO: Garantir que projeto tenha chat
  ensureChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)

    const chatId = await ProjectService.ensureProjectHasChat(projectId, userId, userToken)

    res.json({
      success: true,
      message: 'Chat garantido para o projeto',
      data: { chatId }
    })
  })

  findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)
    
    // ✅ CORRIGIDO: Tipos string | undefined tratados adequadamente
    const query: ProjectQuery = {
      search: req.query.search as string || undefined,
      type: req.query.type as string || undefined, 
      status: req.query.status as string || undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      sortBy: req.query.sortBy as string || undefined,
      order: (req.query.order as string) === 'desc' ? 'desc' : 'asc',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      folder_id: req.query.folder_id as string || undefined,
    }

    // ✅ DEBUG: Log simplificado
    console.log('📁 [PROJECT CONTROLLER] Query params:', {
      user_id: userId,
      folder_id: query.folder_id,
      page: query.page,
      limit: query.limit
    })

    const result = await ProjectService.findByUser(userId, query, userToken)

    // ✅ CORRIGIDO: Estrutura de resposta consistente com o frontend
    res.json({
      success: true,
      data: {
        projects: result.data || [], // Garantir que sempre seja um array
        pagination: {
          currentPage: result.pagination.page,
          totalPages: result.pagination.totalPages,
          totalItems: result.pagination.total,
          hasNext: result.pagination.page < result.pagination.totalPages,
          hasPrev: result.pagination.page > 1
        },
        stats: {
          total: result.pagination.total,
          drafts: (result.data || []).filter((p: any) => p.status === 'draft').length,
          completed: (result.data || []).filter((p: any) => p.status === 'completed').length,
          recent: result.data?.length || 0
        }
      }
    })
  })

  findOne = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.id
    // ✅ CORRIGIDO: Garantir que userId não seja undefined
    const userId = req.user!.id
    const userToken = getUserToken(req)

    const project = await ProjectService.findById(projectId, userId, userToken)
    
    const { data: hasHtmlExport } = await supabase.rpc('user_has_feature', {
      p_user_id: userId,
      p_feature: 'has_html_export'
    })

    const { data: hasEmailPreview } = await supabase.rpc('user_has_feature', {
      p_user_id: userId,
      p_feature: 'has_email_preview'
    })

    if (!hasEmailPreview && project.content.html) {
      project.content.html = '<p>Visualização de HTML não disponível no plano Free. Faça upgrade para visualizar.</p>'
    }

    res.json({
      success: true,
      data: { 
        project,
        permissions: {
          canExportHtml: hasHtmlExport || false,
          canPreviewEmail: hasEmailPreview || false
        }
      }
    })
  })

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const updates: UpdateProjectDto = req.body

    console.log('📝 [PROJECT CONTROLLER] Update request received:', {
      projectId,
      userId,
      hasUserToken: !!userToken,
      updateFields: Object.keys(updates),
      hasContent: !!updates.content,
      hasMetadata: !!updates.metadata,
      contentFields: updates.content ? Object.keys(updates.content) : [],
      metadataFields: updates.metadata ? Object.keys(updates.metadata) : [],
      timestamp: new Date().toISOString()
    })

    const project = await ProjectService.update(projectId, userId, updates, userToken)

    console.log('✅ [PROJECT CONTROLLER] Update successful:', {
      projectId,
      userId,
      updatedProjectName: project.name,
      hasContent: !!project.content,
      timestamp: new Date().toISOString()
    })

    res.json({
      success: true,
      message: 'Projeto atualizado com sucesso',
      data: { project }
    })
  })

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)

    await ProjectService.delete(projectId, userId, userToken)

    res.json({
      success: true,
      message: 'Projeto deletado com sucesso'
    })
  })

  duplicate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)

    const project = await ProjectService.duplicate(projectId, userId, userToken)

    const response = {
      success: true,
      message: 'Projeto duplicado com sucesso',
      data: { project }
    }

    res.status(HTTP_STATUS.CREATED).json(response)

  })

  // ✅ NOVA FUNCIONALIDADE: Toggle Favorite
  toggleFavorite = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)

    console.log('⭐ [PROJECT CONTROLLER] Toggle favorite request:', {
      userId,
      projectId,
      timestamp: new Date().toISOString()
    })

    try {
      // Buscar projeto atual para verificar estado do favorito
      const currentProject = await ProjectService.findById(projectId, userId, userToken)
      
      // Toggle do estado favorito
      const newFavoriteState = !currentProject.is_favorite
      
      // Atualizar projeto
      const project = await ProjectService.update(
        projectId, 
        userId, 
        { is_favorite: newFavoriteState }, 
        userToken
      )

      console.log('✅ [PROJECT CONTROLLER] Favorite toggled successfully:', {
        projectId,
        projectName: project.name,
        wasFavorite: currentProject.is_favorite,
        nowFavorite: newFavoriteState,
        userId
      })

      res.json({
        success: true,
        message: newFavoriteState 
          ? `"${project.name}" adicionado aos favoritos`
          : `"${project.name}" removido dos favoritos`,
        data: { 
          project,
          is_favorite: newFavoriteState,
          action: newFavoriteState ? 'added' : 'removed'
        }
      })
    } catch (error: any) {
      console.error('❌ [PROJECT CONTROLLER] Toggle favorite error:', {
        error: error.message,
        projectId,
        userId,
        stack: error.stack
      })

      if (error.message.includes('not found')) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Projeto não encontrado'
        })
        return
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro ao atualizar favorito'
      })
    }
  })

  getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const stats = await ProjectService.getStats(userId, userToken)

    res.json({
      success: true,
      data: { stats }
    })
  })

  updateStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
    await ProjectService.updateStats()

    res.json({
      success: true,
      message: 'Estatísticas atualizadas com sucesso'
    })
  })

  getPopularTags = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id
    const userToken = getUserToken(req)
    const limit = parseInt(req.query.limit as string) || 20
    const tags = await ProjectService.getPopularTags(userId, limit, userToken)

    res.json({
      success: true,
      data: { tags }
    })
  })

  togglePublic = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const { isPublic } = req.body

    const project = await ProjectService.update(projectId, userId, { isPublic }, userToken)

    res.json({
      success: true,
      message: `Projeto ${isPublic ? 'publicado' : 'despublicado'} com sucesso`,
      data: { project }
    })
  })

  exportProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.id
    // ✅ CORRIGIDO: Garantir que userId não seja undefined
    const userId = req.user!.id
    const userToken = getUserToken(req)

    const { data: hasHtmlExport } = await supabase.rpc('user_has_feature', {
      p_user_id: userId,
      p_feature: 'has_html_export'
    })

    if (!hasHtmlExport) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Exportação de HTML não disponível no seu plano',
        error: {
          code: 'FEATURE_NOT_AVAILABLE',
          feature: 'has_html_export',
          currentPlan: req.user?.subscription
        }
      })
      return
    }

    const project = await ProjectService.findById(projectId, userId, userToken)

    res.json({
      success: true,
      data: {
        name: project.name,
        html: project.content.html,
        text: project.content.text,
        subject: project.content.subject,
        metadata: project.metadata
      }
    })
  })

  healthCheck = asyncHandler(async (_req: AuthRequest, res: Response) => {
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

  getPopularProjects = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const { data: projects } = await supabaseAdmin
      .from('projects_with_stats')
      .select('*')
      .eq('is_public', true)
      .order('views', { ascending: false })
      .limit(10)

    res.json({
      success: true,
      data: { projects: projects || [] }
    })
  })

  getQueueStatus = asyncHandler(async (_req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        queue: {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0
        }
      }
    })
  })

  getUserProjects = asyncHandler(async (req: AuthRequest, res: Response) => {
    // ✅ CORRIGIDO: Garantir que userId não seja undefined
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const limit = parseInt(req.query.limit as string) || 20

    // ✅ MODIFICADO: Usar o método findByUser que já tem a lógica correta
    const query: ProjectQuery = {
      limit,
      page: 1,
      order: 'desc',
      sortBy: 'created_at'
    }

    const result = await ProjectService.findByUser(userId, query, userToken)

    res.json({
      success: true,
      data: { projects: result.data || [] }
    })
  })

  getUserProjectStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const stats = await ProjectService.getStats(userId, userToken)

    res.json({
      success: true,
      data: { stats }
    })
  })

  getProjectTypeStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)

    const supabase = require('../config/supabase.config').getSupabaseWithAuth(userToken)
    
    let query = supabase
      .from('projects')
      .select('type')

    // ✅ MODIFICADO: Usar a mesma lógica do service
    query = query.eq('user_id', userId)

    const { data: projects } = await query

    const typeStats = projects?.reduce((acc: Record<string, number>, project: { type: string }) => {
      acc[project.type] = (acc[project.type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    res.json({
      success: true,
      data: { typeStats }
    })
  })

  createProject = this.create
  getProject = this.findOne
  updateProject = this.update
  deleteProject = this.delete
  duplicateProject = this.duplicate

  improveProjectEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)

    const project = await ProjectService.findById(projectId, userId, userToken)

    const response = {
      success: true,
      message: 'Funcionalidade de melhoria em desenvolvimento',
      data: { project }
    }

    res.json(response)

    // ✅ NOVO: Consumir créditos da organização após resposta bem-sucedida
  })

  getProjectAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)

    const project = await ProjectService.findById(projectId, userId, userToken)

    const analytics = {
      projectId,
      period: 'last_30_days',
      metrics: {
        opens: project.opens || 0,
        clicks: project.clicks || 0,
        uses: project.uses || 0,
        views: project.views || 0,
        conversionRate: project.conversion_rate || 0
      },
      timeline: [],
      topReferrers: []
    }

    res.json({
      success: true,
      data: { analytics }
    })
  })

  moveToFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const { folderId } = req.body

    const project = await ProjectService.update(
      projectId, 
      userId, 
      { folder_id: folderId }, 
      userToken
    )

    res.json({
      success: true,
      message: folderId 
        ? 'Projeto movido para a pasta com sucesso'
        : 'Projeto removido da pasta com sucesso',
      data: { project }
    })
  })

  updateEmailSubject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const { subject } = req.body

    if (!subject || typeof subject !== 'string') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Assunto do email é obrigatório'
      })
      return
    }

    const project = await ProjectService.update(
      projectId,
      userId,
      { 
        content: {
          subject: subject.trim()
        }
      },
      userToken
    )

    res.json({
      success: true,
      message: 'Assunto do email atualizado com sucesso',
      data: { 
        project,
        subject: subject.trim()
      }
    })
  })
}

export default new ProjectController()