import { Types } from 'mongoose'
import { Project, IProjectDocument } from '../models/Project.model'
import { Chat } from '../models/Chat.model'
import { 
  IProject,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilters,
  ProjectResponse,
  ProjectAnalytics,
  DuplicateProjectResponse
} from '../types/project.types'
import { PAGINATION, PROJECT_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import { 
  createNotFoundError, 
  createForbiddenError,
  createConflictError 
} from '../middleware/error.middleware'
import AIService from './ai.service'

class ProjectService {
  // Criar novo projeto
  async createProject(userId: string, createProjectDto: CreateProjectDto): Promise<IProject> {
    try {
      // Gerar conteúdo do email com IA
      const emailContent = await AIService.generateEmail(createProjectDto)

      // Criar projeto
      const project = new Project({
        userId: new Types.ObjectId(userId),
        name: `Email ${createProjectDto.type || 'campaign'}`,
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
        tags: [createProjectDto.type || 'campaign', createProjectDto.industry || 'geral'],
        color: '#6b7280',
        isPublic: false
      })

      await project.save()

      // Criar chat para o projeto
      await this.createProjectChat(project._id as Types.ObjectId, userId)

      logger.info('Project created', { 
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
      logger.error('Create project failed:', error)
      throw error
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

      // Agora DuplicateProjectResponse = IProject, então usar a mesma conversão
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

  // Métodos auxiliares privados
  private async createProjectChat(projectId: Types.ObjectId, userId: string): Promise<void> {
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
    } catch (error) {
      logger.error('Create project chat failed:', error)
      // Não lançar erro para não afetar a criação do projeto
    }
  }

  private async getUserProjectStats(userId: string) {
    return await Project.getUserStats(userId)
  }
}

export default new ProjectService()
