import { Types } from 'mongoose'
import mongoose from 'mongoose'
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
import { EmailContent, ProjectContext } from '../types/ai.types'
import { EMAIL_COLORS, PROJECT_TYPES, API_LIMITS, PAGINATION } from '../utils/constants'
import { logger, loggerHelpers } from '../utils/logger'
import { 
  createNotFoundError, 
  createForbiddenError,
  createAPILimitError,
  AppError 
} from '../middleware/error.middleware'
import AIService from './ai.service'

// Estender o tipo do modelo para incluir métodos estáticos
interface ProjectModelType extends mongoose.Model<IProjectDocument> {
  getTypeStats(userId: string): Promise<any>
  getUserStats(userId: string): Promise<any>
}

// Usar type assertion para o modelo
const ProjectModel = Project as ProjectModelType

class ProjectService {
  // Criar novo projeto
  async createProject(projectData: any): Promise<IProject> {
    try {
      const project = new Project(projectData)
      await project.save()

      // Incrementar uso da API do usuário
      const user = await User.findById(projectData.userId)
      if (user) {
        await user.incrementAPIUsage()
      }

      loggerHelpers.project.created(
        projectData.userId, 
        project._id.toString(), 
        project.type
      )

      // Converter Document para interface usando spread operator
      const projectData2: IProject = {
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

      return projectData2
    } catch (error) {
      logger.error('Create project failed:', error)
      throw error
    }
  }

  // Criar chat associado ao projeto
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

  // Buscar projetos do usuário com filtros
  async getUserProjects(filters: ProjectFilters): Promise<ProjectResponse> {
    try {
      const {
        userId,
        search,
        type,
        category,
        status,
        tags,
        pagination,
        sort
      } = filters

      // Construir query
      const query: any = { userId: new Types.ObjectId(userId) }

      // Filtro por busca textual
      if (search) {
        query.$text = { $search: search }
      }

      // Filtro por tipo
      if (type && type !== 'all') {
        query.type = type
      }

      // Filtro por status
      if (status && status !== 'all') {
        query.status = status
      }

      // Filtro por tags
      if (tags && tags.length > 0) {
        query.tags = { $in: tags }
      }

      // Filtro por categoria
      if (category && category !== 'all') {
        const now = new Date()
        switch (category) {
          case 'recent':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            query.createdAt = { $gte: weekAgo }
            break
          case 'completed':
            query.status = 'completed'
            break
          case 'draft':
            query.status = 'draft'
            break
        }
      }

      // Paginação
      const page = pagination.page || PAGINATION.DEFAULT_PAGE
      const limit = Math.min(pagination.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT)
      const skip = (page - 1) * limit

      // Ordenação
      const sortObj: any = {}
      sortObj[sort.field] = sort.order === 'asc' ? 1 : -1

      // Executar query com contagem
      const [projects, totalItems] = await Promise.all([
        Project.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .populate('chatId', 'metadata.totalMessages metadata.lastActivity'),
        Project.countDocuments(query)
      ])

      // Calcular paginação
      const totalPages = Math.ceil(totalItems / limit)
      const hasNext = page < totalPages
      const hasPrev = page > 1

      // Calcular estatísticas
      const [allProjects, draftCount, completedCount] = await Promise.all([
        Project.countDocuments({ userId: new Types.ObjectId(userId) }),
        Project.countDocuments({ userId: new Types.ObjectId(userId), status: 'draft' }),
        Project.countDocuments({ userId: new Types.ObjectId(userId), status: 'completed' })
      ])

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentCount = await Project.countDocuments({
        userId: new Types.ObjectId(userId),
        createdAt: { $gte: weekAgo }
      })

      // Converter projects para interface usando spread operator
      const convertedProjects: IProject[] = projects.map(p => ({
        _id: p._id as Types.ObjectId,
        userId: p.userId,
        name: p.name,
        description: p.description,
        type: p.type,
        status: p.status,
        content: p.content,
        metadata: p.metadata,
        stats: p.stats,
        tags: p.tags,
        color: p.color,
        isPublic: p.isPublic,
        chatId: p.chatId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }))

      return {
        projects: convertedProjects,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNext,
          hasPrev
        },
        stats: {
          total: allProjects,
          drafts: draftCount,
          completed: completedCount,
          recent: recentCount
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
      }).populate('chatId')

      if (!project) return null

      // Converter Document para interface usando spread operator
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

  // Atualizar projeto
  async updateProject(projectId: string, userId: string, updates: UpdateProjectDto): Promise<IProject | null> {
    try {
      const project = await Project.findOneAndUpdate(
        { _id: projectId, userId: new Types.ObjectId(userId) },
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      )

      if (project) {
        const changedFields = Object.keys(updates)
        loggerHelpers.project.updated(userId, projectId, changedFields)
        
        // Converter Document para interface usando spread operator
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

      await Project.findByIdAndDelete(projectId)

      loggerHelpers.project.deleted(userId, projectId)
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

      // Converter Document para interface usando spread operator
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

  // Incrementar visualizações
  async incrementProjectViews(projectId: string): Promise<void> {
    try {
      await Project.findByIdAndUpdate(
        projectId,
        { $inc: { 'stats.views': 1 } }
      )
    } catch (error) {
      logger.error('Increment project views failed:', error)
      // Não lançar erro para não afetar a operação principal
    }
  }

  // Verificar limites do usuário
  async checkUserLimits(userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId)
      if (!user) {
        return false
      }

      // Verificar limite mensal de API
      if (!user.canMakeAPIRequest()) {
        return false
      }

      // Verificar limite de projetos por plano
      const projectCount = await Project.countDocuments({ userId: new Types.ObjectId(userId) })
      const limits = API_LIMITS[user.subscription as keyof typeof API_LIMITS]
      
      return projectCount < limits.MAX_PROJECTS
    } catch (error) {
      logger.error('Check user limits failed:', error)
      return false
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

      // Calcular métricas de performance
      const conversionRate = project.getConversionRate()
      const totalInteractions = project.stats.opens + project.stats.clicks + project.stats.uses

      // Timeline fictícia (implementar com dados reais depois)
      const timeline = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        timeline.push({
          date,
          opens: Math.floor(project.stats.opens / 7),
          clicks: Math.floor(project.stats.clicks / 7),
          uses: Math.floor(project.stats.uses / 7)
        })
      }

      // Melhorias (se houver)
      const improvements = project.metadata.lastImprovement ? [
        {
          date: project.metadata.lastImprovement.timestamp,
          feedback: project.metadata.lastImprovement.feedback,
          version: project.metadata.lastImprovement.version
        }
      ] : []

      return {
        projectId: project._id.toString(),
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
          openRate: project.stats.views > 0 ? Math.round((project.stats.opens / project.stats.views) * 100) : 0,
          clickRate: conversionRate,
          engagement: project.stats.views > 0 ? Math.round((totalInteractions / project.stats.views) * 100) : 0,
          trend: conversionRate > 15 ? 'up' : conversionRate < 5 ? 'down' : 'stable'
        }
      }
    } catch (error) {
      logger.error('Get project analytics failed:', error)
      throw error
    }
  }

  // Rastrear criação de projeto (analytics)
  async trackProjectCreation(userId: string, projectId: string): Promise<void> {
    try {
      // Implementar tracking de analytics aqui
      logger.info('Project creation tracked', { userId, projectId })
    } catch (error) {
      logger.error('Track project creation failed:', error)
      // Não lançar erro para não afetar a operação principal
    }
  }

  // Gerar nome do projeto baseado no prompt
  generateProjectName(prompt: string): string {
    const words = prompt.split(' ').slice(0, 6).join(' ')
    return `Email: ${words}${words.length < prompt.length ? '...' : ''}`
  }

  // Gerar tags baseadas no prompt e tipo
  generateTags(prompt: string, type?: string): string[] {
    const tags = ['IA', 'Gerado']
    
    if (type) {
      tags.push(this.capitalizeFirst(type))
    }

    // Extrair palavras-chave do prompt
    const keywords = prompt.toLowerCase().match(/\b(email|marketing|venda|promocao|newsletter|campanha|cliente|produto|servico|oferta|desconto)\b/g)
    if (keywords) {
      keywords.slice(0, 3).forEach(keyword => {
        const capitalizedKeyword = this.capitalizeFirst(keyword)
        if (!tags.includes(capitalizedKeyword)) {
          tags.push(capitalizedKeyword)
        }
      })
    }

    return tags
  }

  // Gerar cor baseada no tipo
  generateColor(type?: string): string {
    return EMAIL_COLORS[type as keyof typeof EMAIL_COLORS] || '#6b7280'
  }

  // Buscar projetos populares (públicos)
  async getPopularProjects(limit: number = 10): Promise<IProject[]> {
    try {
      const projects = await Project.find({ isPublic: true })
        .sort({ 'stats.uses': -1, 'stats.opens': -1 })
        .limit(limit)
      
      // Converter para interface usando spread operator
      return projects.map(p => ({
        _id: p._id as Types.ObjectId,
        userId: p.userId,
        name: p.name,
        description: p.description,
        type: p.type,
        status: p.status,
        content: p.content,
        metadata: p.metadata,
        stats: p.stats,
        tags: p.tags,
        color: p.color,
        isPublic: p.isPublic,
        chatId: p.chatId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }))
    } catch (error) {
      logger.error('Get popular projects failed:', error)
      throw error
    }
  }

  // Buscar estatísticas de tipos de projeto
  async getProjectTypeStats(userId: string) {
    try {
      return await ProjectModel.getTypeStats(userId)
    } catch (error) {
      logger.error('Get project type stats failed:', error)
      throw error
    }
  }

  // Buscar estatísticas gerais do usuário
  async getUserProjectStats(userId: string) {
    try {
      return await ProjectModel.getUserStats(userId)
    } catch (error) {
      logger.error('Get user project stats failed:', error)
      throw error
    }
  }

  // Utilitário para capitalizar primeira letra
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }
}

export default new ProjectService()
