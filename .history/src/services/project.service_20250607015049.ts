import { Types } from 'mongoose'
import { Project, IProjectDocument } from '../models/Project.model'
import { Chat } from '../models/Chat.model'
import { User } from '../models/User.model'
import { 
  IProject,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilters,
  ProjectResponse,
  ProjectAnalytics,
  DuplicateProjectResponse
} from '../types/project.types'
import { PAGINATION, PROJECT_STATUS, API_LIMITS, EMAIL_COLORS, PROJECT_TYPES } from '../utils/constants'
import { logger } from '../utils/logger'
import { 
  createNotFoundError, 
  createForbiddenError,
  createConflictError 
} from '../middleware/error.middleware'
import AIService from './ai.service'

class ProjectService {
  // ✅ VERIFICAÇÃO MELHORADA DE LIMITES
  async checkUserLimits(userId: string): Promise<boolean> {
    try {
      if (!userId || !Types.ObjectId.isValid(userId)) {
        logger.warn('Invalid userId provided to checkUserLimits', { userId })
        return false
      }

      const user = await User.findById(userId).catch(error => {
        logger.error('Failed to find user:', { userId, error: error.message })
        return null
      })
      
      if (!user) {
        logger.warn('User not found for limits check', { userId })
        return false
      }

      const projectCount = await Project.countDocuments({ 
        userId: new Types.ObjectId(userId) 
      }).catch(error => {
        logger.error('Failed to count user projects:', { userId, error: error.message })
        return 0
      })
      
      const limits = API_LIMITS[user.subscription as keyof typeof API_LIMITS] || API_LIMITS.FREE
      const hasSpace = projectCount < limits.MAX_PROJECTS
      
      logger.info('User limits check completed', {
        userId,
        subscription: user.subscription,
        currentProjects: projectCount,
        maxProjects: limits.MAX_PROJECTS,
        hasSpace
      })
      
      return hasSpace
    } catch (error: any) {
      logger.error('Check user limits failed:', {
        userId,
        error: error.message,
        stack: error.stack
      })
      return false
    }
  }

  // Gerar nome do projeto baseado no prompt
  generateProjectName(prompt: string): string {
    try {
      if (!prompt || typeof prompt !== 'string') {
        return `Projeto ${Date.now()}`
      }

      // Extrair palavras-chave do prompt
      const words = prompt.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove caracteres especiais
        .split(' ')
        .filter(word => word.length > 3)
        .slice(0, 3)
      
      if (words.length === 0) {
        return `Projeto ${Date.now()}`
      }

      // Capitalizar primeira letra de cada palavra
      const capitalizedWords = words.map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      )

      return `Email ${capitalizedWords.join(' ')}`
    } catch (error) {
      logger.error('Error generating project name:', { prompt, error })
      return `Projeto ${Date.now()}`
    }
  }

  // Gerar tags baseadas no prompt e tipo
  generateTags(prompt: string, type?: string): string[] {
    try {
      const tags: string[] = []
      
      // Adicionar tipo se fornecido
      if (type && typeof type === 'string') {
        tags.push(type.toLowerCase())
      }

      if (!prompt || typeof prompt !== 'string') {
        return tags.length > 0 ? tags : ['email', 'marketing']
      }

      // Extrair tags do prompt (palavras-chave comuns)
      const keywords = ['marketing', 'vendas', 'promocao', 'newsletter', 'boas-vindas', 'campanha', 'produto', 'servico']
      const promptLower = prompt.toLowerCase()
      
      keywords.forEach(keyword => {
        if (promptLower.includes(keyword) && !tags.includes(keyword)) {
          tags.push(keyword)
        }
      })

      // Garantir pelo menos 2 tags
      if (tags.length === 0) {
        tags.push('email', 'marketing')
      } else if (tags.length === 1) {
        tags.push('email')
      }

      return tags.slice(0, 5) // Máximo 5 tags
    } catch (error) {
      logger.error('Error generating tags:', { prompt, type, error })
      return ['email', 'marketing']
    }
  }

  // Gerar cor baseada no tipo
  generateColor(type?: string): string {
    try {
      if (type && EMAIL_COLORS[type as keyof typeof EMAIL_COLORS]) {
        return EMAIL_COLORS[type as keyof typeof EMAIL_COLORS]
      }
      return '#6b7280' // Cor padrão
    } catch (error) {
      logger.error('Error generating color:', { type, error })
      return '#6b7280'
    }
  }

  // ✅ CRIAR PROJETO COM VALIDAÇÃO MELHORADA
  async createProject(projectData: any): Promise<IProject> {
    try {
      // Validação de entrada
      if (!projectData) {
        throw new Error('Project data is required')
      }

      if (!projectData.userId || !Types.ObjectId.isValid(projectData.userId)) {
        throw new Error('Valid userId is required')
      }

      if (!projectData.name || typeof projectData.name !== 'string') {
        throw new Error('Project name is required')
      }

      // Criar projeto com validação
      const project = new Project({
        userId: new Types.ObjectId(projectData.userId),
        name: projectData.name.trim(),
        description: projectData.description || '',
        type: projectData.type || 'campaign',
        status: PROJECT_STATUS.DRAFT,
        content: projectData.content || {},
        metadata: {
          industry: projectData.metadata?.industry || 'Geral',
          targetAudience: projectData.metadata?.targetAudience,
          tone: projectData.metadata?.tone || 'profissional',
          originalPrompt: projectData.metadata?.originalPrompt || '',
          version: 1
        },
        tags: Array.isArray(projectData.tags) ? projectData.tags : ['email'],
        color: projectData.color || '#6b7280',
        isPublic: Boolean(projectData.isPublic)
      })

      const savedProject = await project.save()

      logger.info('Project created successfully', { 
        projectId: savedProject._id.toString(), 
        userId: projectData.userId,
        type: savedProject.type 
      })

      // Converter para interface
      return this.convertToInterface(savedProject)
    } catch (error: any) {
      logger.error('Create project failed:', {
        error: error.message,
        stack: error.stack,
        projectData: {
          userId: projectData?.userId,
          name: projectData?.name,
          type: projectData?.type
        }
      })
      throw error
    }
  }

  // ✅ CRIAR PROJETO COM IA - MELHORADO
  async createProjectWithAI(userId: string, createProjectDto: CreateProjectDto): Promise<IProject> {
    try {
      // Validação de entrada
      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new Error('Valid userId is required')
      }

      if (!createProjectDto.prompt || typeof createProjectDto.prompt !== 'string' || createProjectDto.prompt.trim().length < 10) {
        throw new Error('Prompt must be at least 10 characters long')
      }

      logger.info('Starting AI project creation', {
        userId,
        promptLength: createProjectDto.prompt.length,
        type: createProjectDto.type
      })

      // Preparar contexto para IA
      const context = {
        userId,
        type: createProjectDto.type || 'campaign',
        industry: createProjectDto.industry || 'geral',
        targetAudience: createProjectDto.targetAudience,
        tone: createProjectDto.tone || 'profissional',
        projectName: this.generateProjectName(createProjectDto.prompt),
        status: 'draft' as const
      }

      // Gerar conteúdo do email com IA
      let emailContent
      try {
        emailContent = await AIService.generateEmail(createProjectDto.prompt, context)
      } catch (aiError: any) {
        logger.error('AI service failed:', {
          userId,
          error: aiError.message,
          prompt: createProjectDto.prompt.substring(0, 100)
        })
        
        // Fallback: criar projeto sem conteúdo IA
        emailContent = {
          subject: 'Email em construção',
          html: '<p>Conteúdo será gerado em breve...</p>',
          text: 'Conteúdo será gerado em breve...'
        }
      }

      // Criar projeto
      const project = new Project({
        userId: new Types.ObjectId(userId),
        name: this.generateProjectName(createProjectDto.prompt),
        description: `Projeto gerado a partir do prompt: ${createProjectDto.prompt.substring(0, 100)}${createProjectDto.prompt.length > 100 ? '...' : ''}`,
        type: createProjectDto.type || 'campaign',
        status: PROJECT_STATUS.DRAFT,
        content: emailContent,
        metadata: {
          industry: createProjectDto.industry || 'Geral',
          targetAudience: createProjectDto.targetAudience,
          tone: createProjectDto.tone || 'profissional',
          originalPrompt: createProjectDto.prompt,
          version: 1
        },
        tags: this.generateTags(createProjectDto.prompt, createProjectDto.type),
        color: this.generateColor(createProjectDto.type),
        isPublic: false
      })

      const savedProject = await project.save()

      // Criar chat para o projeto
      try {
        await this.createProjectChat(savedProject._id as Types.ObjectId, userId)
      } catch (chatError) {
        logger.warn('Failed to create project chat, but project was created:', {
          projectId: savedProject._id,
          error: chatError
        })
      }

      logger.info('Project created with AI successfully', { 
        projectId: savedProject._id.toString(), 
        userId,
        type: savedProject.type,
        hasAIContent: !!emailContent.html
      })

      return this.convertToInterface(savedProject)
    } catch (error: any) {
      logger.error('Create project with AI failed:', {
        userId,
        error: error.message,
        stack: error.stack,
        prompt: createProjectDto?.prompt?.substring(0, 100)
      })
      throw error
    }
  }

  // ✅ CRIAR CHAT PARA PROJETO - MELHORADO
  async createProjectChat(projectId: Types.ObjectId, userId: string): Promise<any> {
    try {
      if (!projectId || !Types.ObjectId.isValid(projectId)) {
        throw new Error('Valid projectId is required')
      }

      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new Error('Valid userId is required')
      }

      // Verificar se já existe chat para este projeto
      const existingChat = await Chat.findOne({ projectId }).catch(() => null)
      if (existingChat) {
        logger.info('Chat already exists for project', { projectId: projectId.toString() })
        return existingChat
      }

      const chat = new Chat({
        userId: new Types.ObjectId(userId),
        projectId,
        title: 'Chat do Projeto',
        isActive: true,
        metadata: {
          totalMessages: 0,
          lastActivity: new Date(),
          emailUpdates: 0
        }
      })

      const savedChat = await chat.save()

      // Atualizar projeto com chat ID
      await Project.findByIdAndUpdate(projectId, { chatId: savedChat._id }).catch(error => {
        logger.warn('Failed to update project with chatId:', { projectId, chatId: savedChat._id, error })
      })

      logger.info('Project chat created successfully', {
        projectId: projectId.toString(),
        chatId: savedChat._id.toString(),
        userId
      })

      return savedChat
    } catch (error: any) {
      logger.error('Create project chat failed:', {
        projectId: projectId?.toString(),
        userId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  // Rastrear criação do projeto
  async trackProjectCreation(userId: string, projectId: string): Promise<void> {
    try {
      if (!userId || !Types.ObjectId.isValid(userId)) {
        logger.warn('Invalid userId for tracking:', { userId })
        return
      }

      // Atualizar uso da API do usuário
      await User.findByIdAndUpdate(userId, {
        $inc: { 'apiUsage.currentMonth': 1 },
        $set: { 'apiUsage.lastUsed': new Date() }
      }).catch(error => {
        logger.warn('Failed to update user API usage:', { userId, error: error.message })
      })

      logger.info('Project creation tracked', { userId, projectId })
    } catch (error: any) {
      logger.error('Track project creation failed:', {
        userId,
        projectId,
        error: error.message
      })
      // Não lançar erro para não afetar o fluxo principal
    }
  }

  // ✅ BUSCAR PROJETOS DO USUÁRIO - MELHORADO
  async getUserProjects(filters: ProjectFilters): Promise<ProjectResponse> {
    try {
      const {
        userId,
        search,
        type,
        status,
        tags,
        pagination,
        sort
      } = filters

      // Validação
      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new Error('Valid userId is required')
      }

      // Construir query
      const query: any = { userId: new Types.ObjectId(userId) }

      if (search && typeof search === 'string' && search.trim()) {
        // Busca por texto em múltiplos campos
        const searchRegex = new RegExp(search.trim(), 'i')
        query.$or = [
          { name: searchRegex },
          { description: searchRegex },
          { tags: { $in: [searchRegex] } }
        ]
      }

      if (type && type !== 'all') {
        query.type = type
      }

      if (status && status !== 'all') {
        query.status = status
      }

      if (tags && Array.isArray(tags) && tags.length > 0) {
        query.tags = { $in: tags }
      }

      // Paginação
      const page = Math.max(1, pagination?.page || 1)
      const limit = Math.min(50, Math.max(1, pagination?.limit || PAGINATION.DEFAULT_LIMIT))
      const skip = (page - 1) * limit

      // Ordenação
      const sortObj: any = {}
      const sortField = sort?.field || 'updatedAt'
      const sortOrder = sort?.order === 'asc' ? 1 : -1
      sortObj[sortField] = sortOrder

      logger.info('Fetching user projects', {
        userId,
        query: { ...query, userId: '[ObjectId]' },
        pagination: { page, limit, skip },
        sort: sortObj
      })

      // Buscar projetos e contar total
      const [projects, totalItems] = await Promise.all([
        Project.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .populate('chatId', 'title metadata.totalMessages')
          .lean()
          .catch(error => {
            logger.error('Failed to fetch projects:', { userId, error: error.message })
            return []
          }),
        Project.countDocuments(query).catch(error => {
          logger.error('Failed to count projects:', { userId, error: error.message })
          return 0
        })
      ])

      // Estatísticas básicas
      const stats = await this.getUserProjectStatsBasic(userId)

      const totalPages = Math.ceil(totalItems / limit)

      // Converter projetos para interface
      const projectsData: IProject[] = projects.map(project => this.convertToInterface(project))

      const result: ProjectResponse = {
        projects: projectsData,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats: {
          total: stats.totalProjects,
          drafts: stats.drafts,
          completed: stats.completed,
          recent: stats.recent
        }
      }

      logger.info('User projects fetched successfully', {
        userId,
        projectsCount: projectsData.length,
        totalItems,
        page,
        totalPages
      })

      return result
    } catch (error: any) {
      logger.error('Get user projects failed:', {
        userId: filters?.userId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  // ✅ MÉTODO AUXILIAR PARA ESTATÍSTICAS BÁSICAS
  private async getUserProjectStatsBasic(userId: string) {
    try {
      const userIdObj = new Types.ObjectId(userId)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const [total, drafts, completed, recent] = await Promise.all([
        Project.countDocuments({ userId: userIdObj }).catch(() => 0),
        Project.countDocuments({ userId: userIdObj, status: 'draft' }).catch(() => 0),
        Project.countDocuments({ userId: userIdObj, status: 'completed' }).catch(() => 0),
        Project.countDocuments({ userId: userIdObj, createdAt: { $gte: sevenDaysAgo } }).catch(() => 0)
      ])

      return {
        totalProjects: total,
        drafts,
        completed,
        recent
      }
    } catch (error) {
      logger.error('Failed to get basic stats:', { userId, error })
      return {
        totalProjects: 0,
        drafts: 0,
        completed: 0,
        recent: 0
      }
    }
  }

  // ✅ BUSCAR PROJETO POR ID - MELHORADO
  async getProjectById(projectId: string, userId: string): Promise<IProject | null> {
    try {
      if (!projectId || !Types.ObjectId.isValid(projectId)) {
        logger.warn('Invalid projectId provided', { projectId })
        return null
      }

      if (!userId || !Types.ObjectId.isValid(userId)) {
        logger.warn('Invalid userId provided', { userId })
        return null
      }

      const project = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      })
      .populate('chatId', 'title metadata.totalMessages')
      .catch(error => {
        logger.error('Failed to fetch project by ID:', { projectId, userId, error: error.message })
        return null
      })

      if (!project) {
        logger.info('Project not found', { projectId, userId })
        return null
      }

      // Incrementar visualizações
      try {
        await project.incrementViews()
      } catch (error) {
        logger.warn('Failed to increment project views:', { projectId, error })
      }

      return this.convertToInterface(project)
    } catch (error: any) {
      logger.error('Get project by ID failed:', {
        projectId,
        userId,
        error: error.message,
        stack: error.stack
      })
      return null
    }
  }

  // ✅ CONVERTER DOCUMENTO PARA INTERFACE
  private convertToInterface(project: any): IProject {
    try {
      return {
        _id: project._id,
        userId: project.userId,
        name: project.name || 'Projeto sem nome',
        description: project.description || '',
        type: project.type || 'campaign',
        status: project.status || 'draft',
        content: project.content || {},
        metadata: {
          industry: project.metadata?.industry || 'Geral',
          targetAudience: project.metadata?.targetAudience,
          tone: project.metadata?.tone || 'profissional',
          originalPrompt: project.metadata?.originalPrompt || '',
          version: project.metadata?.version || 1,
          lastImprovement: project.metadata?.lastImprovement
        },
        stats: {
          opens: project.stats?.opens || 0,
          clicks: project.stats?.clicks || 0,
          uses: project.stats?.uses || 0,
          views: project.stats?.views || 0
        },
        tags: Array.isArray(project.tags) ? project.tags : ['email'],
        color: project.color || '#6b7280',
        isPublic: Boolean(project.isPublic),
        chatId: project.chatId,
        createdAt: project.createdAt || new Date(),
        updatedAt: project.updatedAt || new Date()
      }
    } catch (error) {
      logger.error('Failed to convert project to interface:', { projectId: project?._id, error })
      throw error
    }
  }

  // Incrementar visualizações do projeto
  async incrementProjectViews(projectId: string): Promise<void> {
    try {
      if (!projectId || !Types.ObjectId.isValid(projectId)) {
        return
      }

      await Project.findByIdAndUpdate(projectId, {
        $inc: { 'stats.views': 1 }
      }).catch(error => {
        logger.warn('Failed to increment project views:', { projectId, error: error.message })
      })

      logger.debug('Project views incremented', { projectId })
    } catch (error: any) {
      logger.error('Increment project views failed:', {
        projectId,
        error: error.message
      })
      // Não lançar erro para não afetar o fluxo principal
    }
  }

  // ✅ ATUALIZAR PROJETO - MELHORADO
  async updateProject(projectId: string, userId: string, updates: UpdateProjectDto): Promise<IProject | null> {
    try {
      if (!projectId || !Types.ObjectId.isValid(projectId)) {
        throw new Error('Valid projectId is required')
      }

      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new Error('Valid userId is required')
      }

      if (!updates || typeof updates !== 'object') {
        throw new Error('Updates object is required')
      }

      // Filtrar campos permitidos para atualização
      const allowedFields = ['name', 'description', 'type', 'status', 'content', 'metadata', 'tags', 'color', 'isPublic']
      const filteredUpdates: any = {}
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = updates[key as keyof UpdateProjectDto]
        }
      })

      const project = await Project.findOneAndUpdate(
        { _id: projectId, userId: new Types.ObjectId(userId) },
        { $set: filteredUpdates },
        { new: true, runValidators: true }
      ).catch(error => {
        logger.error('Failed to update project:', { projectId, userId, error: error.message })
        return null
      })

      if (project) {
        logger.info('Project updated successfully', { 
          projectId, 
          userId, 
          updates: Object.keys(filteredUpdates) 
        })

        return this.convertToInterface(project)
      }

      return null
    } catch (error: any) {
      logger.error('Update project failed:', {
        projectId,
        userId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  // ✅ DELETAR PROJETO - MELHORADO
  async deleteProject(projectId: string, userId: string): Promise<boolean> {
    try {
      if (!projectId || !Types.ObjectId.isValid(projectId)) {
        throw new Error('Valid projectId is required')
      }

      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new Error('Valid userId is required')
      }

      const project = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      }).catch(error => {
        logger.error('Failed to find project for deletion:', { projectId, userId, error: error.message })
        return null
      })

      if (!project) {
        logger.info('Project not found for deletion', { projectId, userId })
        return false
      }

      // Deletar chat associado se existir
      if (project.chatId) {
        await Chat.findByIdAndDelete(project.chatId).catch(error => {
          logger.warn('Failed to delete associated chat:', { projectId, chatId: project.chatId, error: error.message })
        })
      }

      // Deletar projeto
      await Project.findByIdAndDelete(projectId)

      logger.info('Project deleted successfully', { projectId, userId })
      return true
    } catch (error: any) {
      logger.error('Delete project failed:', {
        projectId,
        userId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  // ✅ DUPLICAR PROJETO - MELHORADO
  async duplicateProject(projectId: string, userId: string): Promise<DuplicateProjectResponse | null> {
    try {
      if (!projectId || !Types.ObjectId.isValid(projectId)) {
        throw new Error('Valid projectId is required')
      }

      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new Error('Valid userId is required')
      }

      const originalProject = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      }).catch(error => {
        logger.error('Failed to find original project for duplication:', { projectId, userId, error: error.message })
        return null
      })

      if (!originalProject) {
        logger.info('Original project not found for duplication', { projectId, userId })
        return null
      }

      const duplicatedProject = new Project({
        userId: originalProject.userId,
        name: `${originalProject.name} (Cópia)`,
        description: originalProject.description,
        type: originalProject.type,
        status: 'draft',
        content: originalProject.content,
        metadata: {
          ...originalProject.metadata,
          version: 1
        },
        tags: [...originalProject.tags, 'Duplicado'],
        color: originalProject.color,
        isPublic: false
      })

      const savedProject = await duplicatedProject.save()

      // Criar chat para o projeto duplicado
      try {
        await this.createProjectChat(savedProject._id as Types.ObjectId, userId)
      } catch (chatError) {
        logger.warn('Failed to create chat for duplicated project:', { projectId: savedProject._id, error: chatError })
      }

      logger.info('Project duplicated successfully', {
        originalId: projectId,
        duplicatedId: savedProject._id.toString(),
        userId
      })

      return this.convertToInterface(savedProject) as DuplicateProjectResponse
    } catch (error: any) {
      logger.error('Duplicate project failed:', {
        projectId,
        userId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  // ✅ PROJETOS POPULARES - MELHORADO
  async getPopularProjects(limit: number = 10): Promise<IProject[]> {
    try {
      const safeLimit = Math.min(50, Math.max(1, limit))

      const projects = await Project.find({ isPublic: true })
        .sort({ 'stats.uses': -1, 'stats.views': -1 })
        .limit(safeLimit)
        .lean()
        .catch(error => {
          logger.error('Failed to fetch popular projects:', { error: error.message })
          return []
        })

      return projects.map(project => this.convertToInterface(project))
    } catch (error: any) {
      logger.error('Get popular projects failed:', {
        limit,
        error: error.message,
        stack: error.stack
      })
      return []
    }
  }

  // ✅ ESTATÍSTICAS DE TIPOS - MELHORADO
  async getProjectTypeStats(userId: string): Promise<any> {
    try {
      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new Error('Valid userId is required')
      }

      const stats = await Project.aggregate([
        { $match: { userId: new Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            avgOpens: { $avg: '$stats.opens' },
            avgClicks: { $avg: '$stats.clicks' },
            totalUses: { $sum: '$stats.uses' }
          }
        }
      ]).catch(error => {
        logger.error('Failed to get project type stats:', { userId, error: error.message })
        return []
      })
      
      return stats
    } catch (error: any) {
      logger.error('Get project type stats failed:', {
        userId,
        error: error.message,
        stack: error.stack
      })
      return []
    }
  }

  // ✅ ANALYTICS DO PROJETO - MELHORADO
  async getProjectAnalytics(projectId: string, userId: string): Promise<ProjectAnalytics | null> {
    try {
      if (!projectId || !Types.ObjectId.isValid(projectId)) {
        throw new Error('Valid projectId is required')
      }

      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new Error('Valid userId is required')
      }

      const project = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      }).catch(error => {
        logger.error('Failed to fetch project for analytics:', { projectId, userId, error: error.message })
        return null
      })

      if (!project) {
        return null
      }

      // Timeline simulada (implementar com dados reais posteriormente)
      const timeline = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        timeline.push({
          date,
          opens: Math.max(0, Math.floor(Math.random() * (project.stats.opens / 30))),
          clicks: Math.max(0, Math.floor(Math.random() * (project.stats.clicks / 30))),
          uses: Math.max(0, Math.floor(Math.random() * (project.stats.uses / 30)))
        })
      }

      // Histórico de melhorias
      const improvements = project.metadata.lastImprovement ? [{
        date: project.metadata.lastImprovement.timestamp,
        feedback: project.metadata.lastImprovement.feedback,
        version: project.metadata.lastImprovement.version
      }] : []

      const conversionRate = project.getConversionRate()
      
      return {
        projectId,
        name: project.name,
        type: project.type,
        createdAt: project.createdAt,
        stats: {
          opens: project.stats.opens,
          clicks: project.stats.clicks,
          uses: project.stats.uses,
          views: project.stats.views,
          conversionRate
        },
        timeline,
        improvements,
        performance: {
          openRate: project.stats.views > 0 ? (project.stats.opens / project.stats.views) * 100 : 0,
          clickRate: conversionRate,
          engagement: project.stats.views > 0 ? 
            ((project.stats.opens + project.stats.clicks * 2) / project.stats.views) * 100 : 0,
          trend: conversionRate > 5 ? 'up' : conversionRate < 2 ? 'down' : 'stable'
        }
      }
    } catch (error: any) {
      logger.error('Get project analytics failed:', {
        projectId,
        userId,
        error: error.message,
        stack: error.stack
      })
      return null
    }
  }

  // Incrementar uso do projeto
  async incrementProjectUse(projectId: string, userId: string): Promise<void> {
    try {
      if (!projectId || !Types.ObjectId.isValid(projectId)) {
        return
      }

      if (!userId || !Types.ObjectId.isValid(userId)) {
        return
      }

      const project = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      }).catch(() => null)

      if (project) {
        await project.incrementUses()
        logger.info('Project use incremented', { projectId, userId })
      }
    } catch (error: any) {
      logger.error('Increment project use failed:', {
        projectId,
        userId,
        error: error.message
      })
      // Não lançar erro para não afetar o fluxo principal
    }
  }

  // ✅ ESTATÍSTICAS GERAIS DO USUÁRIO - MELHORADO
  async getUserProjectStats(userId: string): Promise<any> {
    try {
      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new Error('Valid userId is required')
      }

      const stats = await Project.aggregate([
        { $match: { userId: new Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalProjects: { $sum: 1 },
            totalOpens: { $sum: '$stats.opens' },
            totalClicks: { $sum: '$stats.clicks' },
            totalUses: { $sum: '$stats.uses' },
            avgConversion: { 
              $avg: { 
                $cond: [
                  { $gt: ['$stats.opens', 0] },
                  { $multiply: [{ $divide: ['$stats.clicks', '$stats.opens'] }, 100] },
                  0
                ]
              }
            }
          }
        }
      ]).catch(error => {
        logger.error('Failed to get user project stats:', { userId, error: error.message })
        return []
      })
      
      return stats[0] || {
        totalProjects: 0,
        totalOpens: 0,
        totalClicks: 0,
        totalUses: 0,
        avgConversion: 0
      }
    } catch (error: any) {
      logger.error('Get user project stats failed:', {
        userId,
        error: error.message,
        stack: error.stack
      })
      return {
        totalProjects: 0,
        totalOpens: 0,
        totalClicks: 0,
        totalUses: 0,
        avgConversion: 0
      }
    }
  }
}

export default new ProjectService()
