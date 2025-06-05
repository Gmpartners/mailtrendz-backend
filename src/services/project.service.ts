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
  // Verificar limites do usuário
  async checkUserLimits(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId)
      if (!user) return false

      const projectCount = await Project.countDocuments({ userId: new Types.ObjectId(userId) })
      const limits = API_LIMITS[user.subscription as keyof typeof API_LIMITS]
      
      return projectCount < limits.MAX_PROJECTS
    } catch (error) {
      logger.error('Check user limits failed:', error)
      return false
    }
  }

  // Gerar nome do projeto baseado no prompt
  generateProjectName(prompt: string): string {
    try {
      // Extrair palavras-chave do prompt
      const words = prompt.toLowerCase()
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
      return `Projeto ${Date.now()}`
    }
  }

  // Gerar tags baseadas no prompt e tipo
  generateTags(prompt: string, type?: string): string[] {
    try {
      const tags: string[] = []
      
      // Adicionar tipo se fornecido
      if (type) {
        tags.push(type)
      }

      // Extrair tags do prompt (palavras-chave comuns)
      const keywords = ['marketing', 'vendas', 'promocao', 'newsletter', 'boas-vindas', 'campanha']
      const promptLower = prompt.toLowerCase()
      
      keywords.forEach(keyword => {
        if (promptLower.includes(keyword)) {
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
      return ['email', 'marketing']
    }
  }

  // Gerar cor baseada no tipo
  generateColor(type?: string): string {
    if (type && EMAIL_COLORS[type as keyof typeof EMAIL_COLORS]) {
      return EMAIL_COLORS[type as keyof typeof EMAIL_COLORS]
    }
    return '#6b7280' // Cor padrão
  }

  // Criar novo projeto (versão atualizada)
  async createProject(projectData: any): Promise<IProject> {
    try {
      // Criar projeto
      const project = new Project({
        userId: new Types.ObjectId(projectData.userId),
        name: projectData.name,
        description: projectData.description,
        type: projectData.type || 'campaign',
        status: PROJECT_STATUS.DRAFT,
        content: projectData.content,
        metadata: {
          industry: projectData.metadata.industry || 'Geral',
          targetAudience: projectData.metadata.targetAudience,
          tone: projectData.metadata.tone || 'profissional',
          originalPrompt: projectData.metadata.originalPrompt,
          version: 1
        },
        tags: projectData.tags || ['email'],
        color: projectData.color || '#6b7280',
        isPublic: false
      })

      await project.save()

      logger.info('Project created', { 
        projectId: project._id.toString(), 
        userId: projectData.userId,
        type: project.type 
      })

      // Converter para interface
      const projectDataResponse: IProject = {
        _id: project._id as Types.ObjectId,
        userId: project.userId,
        name: project.name,
        description: project.description,
        type: project.type,
        status: project.status,
        content: project.content,
        metadata: project.metadata,
        stats: project.stats,
        tags: project.tags,
        color: project.color,
        isPublic: project.isPublic,
        chatId: project.chatId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }

      return projectDataResponse
    } catch (error) {
      logger.error('Create project failed:', error)
      throw error
    }
  }

  // Criar novo projeto com IA (método original corrigido)
  async createProjectWithAI(userId: string, createProjectDto: CreateProjectDto): Promise<IProject> {
    try {
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
      const emailContent = await AIService.generateEmail(createProjectDto.prompt, context)

      // Criar projeto
      const project = new Project({
        userId: new Types.ObjectId(userId),
        name: this.generateProjectName(createProjectDto.prompt),
        description: `Projeto gerado a partir do prompt: ${createProjectDto.prompt.substring(0, 100)}...`,
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

      await project.save()

      // Criar chat para o projeto
      await this.createProjectChat(project._id as Types.ObjectId, userId)

      logger.info('Project created with AI', { 
        projectId: project._id.toString(), 
        userId,
        type: project.type 
      })

      // Converter para interface
      const projectData: IProject = {
        _id: project._id as Types.ObjectId,
        userId: project.userId,
        name: project.name,
        description: project.description,
        type: project.type,
        status: project.status,
        content: project.content,
        metadata: project.metadata,
        stats: project.stats,
        tags: project.tags,
        color: project.color,
        isPublic: project.isPublic,
        chatId: project.chatId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }

      return projectData
    } catch (error) {
      logger.error('Create project with AI failed:', error)
      throw error
    }
  }

  // Criar chat para projeto (agora público)
  async createProjectChat(projectId: Types.ObjectId, userId: string): Promise<any> {
    try {
      const chat = new Chat({
        userId: new Types.ObjectId(userId),
        projectId,
        title: 'Chat do Projeto',
        isActive: true
      })

      await chat.save()

      // Atualizar projeto com chat ID
      await Project.findByIdAndUpdate(projectId, { chatId: chat._id })

      return chat
    } catch (error) {
      logger.error('Create project chat failed:', error)
      throw error
    }
  }

  // Rastrear criação do projeto
  async trackProjectCreation(userId: string, projectId: string): Promise<void> {
    try {
      // Atualizar uso da API do usuário
      await User.findByIdAndUpdate(userId, {
        $inc: { 'apiUsage.currentMonth': 1 },
        $set: { 'apiUsage.lastUsed': new Date() }
      })

      logger.info('Project creation tracked', { userId, projectId })
    } catch (error) {
      logger.error('Track project creation failed:', error)
      // Não lançar erro para não afetar o fluxo principal
    }
  }

  // Buscar projetos do usuário
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

      // Construir query
      const query: any = { userId: new Types.ObjectId(userId) }

      if (search) {
        query.$text = { $search: search }
      }

      if (type) {
        query.type = type
      }

      if (status) {
        query.status = status
      }

      if (tags && tags.length > 0) {
        query.tags = { $in: tags }
      }

      // Paginação
      const page = pagination.page || 1
      const limit = pagination.limit || PAGINATION.DEFAULT_LIMIT
      const skip = (page - 1) * limit

      // Ordenação
      const sortObj: any = {}
      sortObj[sort.field] = sort.order === 'asc' ? 1 : -1

      // Buscar projetos e contar total
      const [projects, totalItems] = await Promise.all([
        Project.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .populate('chatId', 'title metadata.totalMessages'),
        Project.countDocuments(query)
      ])

      // Estatísticas
      const stats = await this.getUserProjectStats(userId)

      const totalPages = Math.ceil(totalItems / limit)

      // Converter projetos para interface
      const projectsData: IProject[] = projects.map(project => ({
        _id: project._id as Types.ObjectId,
        userId: project.userId,
        name: project.name,
        description: project.description,
        type: project.type,
        status: project.status,
        content: project.content,
        metadata: project.metadata,
        stats: project.stats,
        tags: project.tags,
        color: project.color,
        isPublic: project.isPublic,
        chatId: project.chatId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }))

      return {
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
          drafts: await Project.countDocuments({ userId: new Types.ObjectId(userId), status: 'draft' }),
          completed: await Project.countDocuments({ userId: new Types.ObjectId(userId), status: 'completed' }),
          recent: await Project.countDocuments({ 
            userId: new Types.ObjectId(userId),
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          })
        }
      }
    } catch (error) {
      logger.error('Get user projects failed:', error)
      throw error
    }
  }

  // Buscar projeto por ID
  async getProjectById(projectId: string, userId: string): Promise<IProject | null> {
    try {
      const project = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      }).populate('chatId', 'title metadata.totalMessages')

      if (!project) {
        return null
      }

      // Incrementar visualizações
      await project.incrementViews()

      // Converter para interface
      const projectData: IProject = {
        _id: project._id as Types.ObjectId,
        userId: project.userId,
        name: project.name,
        description: project.description,
        type: project.type,
        status: project.status,
        content: project.content,
        metadata: project.metadata,
        stats: project.stats,
        tags: project.tags,
        color: project.color,
        isPublic: project.isPublic,
        chatId: project.chatId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }

      return projectData
    } catch (error) {
      logger.error('Get project by ID failed:', error)
      throw error
    }
  }

  // Incrementar visualizações do projeto
  async incrementProjectViews(projectId: string): Promise<void> {
    try {
      await Project.findByIdAndUpdate(projectId, {
        $inc: { 'stats.views': 1 }
      })
      logger.info('Project views incremented', { projectId })
    } catch (error) {
      logger.error('Increment project views failed:', error)
      // Não lançar erro para não afetar o fluxo principal
    }
  }

  // Atualizar projeto
  async updateProject(projectId: string, userId: string, updates: UpdateProjectDto): Promise<IProject | null> {
    try {
      const project = await Project.findOneAndUpdate(
        { _id: projectId, userId: new Types.ObjectId(userId) },
        { ...updates },
        { new: true, runValidators: true }
      )

      if (project) {
        logger.info('Project updated', { 
          projectId, 
          userId, 
          updates: Object.keys(updates) 
        })

        // Converter para interface
        const projectData: IProject = {
          _id: project._id as Types.ObjectId,
          userId: project.userId,
          name: project.name,
          description: project.description,
          type: project.type,
          status: project.status,
          content: project.content,
          metadata: project.metadata,
          stats: project.stats,
          tags: project.tags,
          color: project.color,
          isPublic: project.isPublic,
          chatId: project.chatId,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }

        return projectData
      }

      return null
    } catch (error) {
      logger.error('Update project failed:', error)
      throw error
    }
  }

  // Deletar projeto
  async deleteProject(projectId: string, userId: string): Promise<boolean> {
    try {
      const project = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      })

      if (!project) {
        return false
      }

      // Deletar chat associado se existir
      if (project.chatId) {
        await Chat.findByIdAndDelete(project.chatId)
      }

      // Deletar projeto
      await Project.findByIdAndDelete(projectId)

      logger.info('Project deleted', { projectId, userId })
      return true
    } catch (error) {
      logger.error('Delete project failed:', error)
      throw error
    }
  }

  // Duplicar projeto
  async duplicateProject(projectId: string, userId: string): Promise<DuplicateProjectResponse | null> {
    try {
      const originalProject = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      })

      if (!originalProject) {
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

      await duplicatedProject.save()

      // Criar chat para o projeto duplicado
      await this.createProjectChat(duplicatedProject._id as Types.ObjectId, userId)

      logger.info('Project duplicated', {
        originalId: projectId,
        duplicatedId: duplicatedProject._id.toString(),
        userId
      })

      // Converter para interface
      const projectData: DuplicateProjectResponse = {
        _id: duplicatedProject._id as Types.ObjectId,
        userId: duplicatedProject.userId,
        name: duplicatedProject.name,
        description: duplicatedProject.description,
        type: duplicatedProject.type,
        status: duplicatedProject.status,
        content: duplicatedProject.content,
        metadata: duplicatedProject.metadata,
        stats: duplicatedProject.stats,
        tags: duplicatedProject.tags,
        color: duplicatedProject.color,
        isPublic: duplicatedProject.isPublic,
        chatId: duplicatedProject.chatId,
        createdAt: duplicatedProject.createdAt,
        updatedAt: duplicatedProject.updatedAt
      }

      return projectData
    } catch (error) {
      logger.error('Duplicate project failed:', error)
      throw error
    }
  }

  // Buscar projetos populares (públicos)
  async getPopularProjects(limit: number = 10): Promise<IProject[]> {
    try {
      const projects = await Project.find({ isPublic: true })
        .sort({ 'stats.uses': -1, 'stats.views': -1 })
        .limit(limit)

      // Converter para interface
      return projects.map(project => ({
        _id: project._id as Types.ObjectId,
        userId: project.userId,
        name: project.name,
        description: project.description,
        type: project.type,
        status: project.status,
        content: project.content,
        metadata: project.metadata,
        stats: project.stats,
        tags: project.tags,
        color: project.color,
        isPublic: project.isPublic,
        chatId: project.chatId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }))
    } catch (error) {
      logger.error('Get popular projects failed:', error)
      throw error
    }
  }

  // Buscar estatísticas de tipos de projeto
  async getProjectTypeStats(userId: string): Promise<any> {
    try {
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
      ])
      
      return stats
    } catch (error) {
      logger.error('Get project type stats failed:', error)
      throw error
    }
  }

  // Buscar analytics do projeto
  async getProjectAnalytics(projectId: string, userId: string): Promise<ProjectAnalytics | null> {
    try {
      const project = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
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
          opens: Math.floor(Math.random() * (project.stats.opens / 30)),
          clicks: Math.floor(Math.random() * (project.stats.clicks / 30)),
          uses: Math.floor(Math.random() * (project.stats.uses / 30))
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
    } catch (error) {
      logger.error('Get project analytics failed:', error)
      throw error
    }
  }

  // Incrementar uso do projeto
  async incrementProjectUse(projectId: string, userId: string): Promise<void> {
    try {
      const project = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      })

      if (project) {
        await project.incrementUses()
        logger.info('Project use incremented', { projectId, userId })
      }
    } catch (error) {
      logger.error('Increment project use failed:', error)
      throw error
    }
  }

  // Buscar estatísticas gerais dos projetos do usuário (agora público)
  async getUserProjectStats(userId: string): Promise<any> {
    try {
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
      ])
      
      return stats[0] || {
        totalProjects: 0,
        totalOpens: 0,
        totalClicks: 0,
        totalUses: 0,
        avgConversion: 0
      }
    } catch (error) {
      logger.error('Get user project stats failed:', error)
      throw error
    }
  }
}

export default new ProjectService()
