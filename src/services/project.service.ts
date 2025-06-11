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
import EnhancedAIService from './ai/enhanced/EnhancedAIService'

const convertProjectToInterface = (project: IProjectDocument): IProject => {
  return {
    _id: project._id as Types.ObjectId,
    id: project._id.toString(),
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
}

class ProjectService {
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

  generateProjectName(prompt: string): string {
    try {
      const words = prompt.toLowerCase()
        .split(' ')
        .filter(word => word.length > 3)
        .slice(0, 3)
      
      if (words.length === 0) {
        return `Projeto ${Date.now()}`
      }

      const capitalizedWords = words.map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      )

      return `Email ${capitalizedWords.join(' ')}`
    } catch (error) {
      return `Projeto ${Date.now()}`
    }
  }

  generateTags(prompt: string, type?: string): string[] {
    try {
      const tags: string[] = []
      
      if (type) {
        tags.push(type)
      }

      const keywords = ['marketing', 'vendas', 'promocao', 'newsletter', 'boas-vindas', 'campanha']
      const promptLower = prompt.toLowerCase()
      
      keywords.forEach(keyword => {
        if (promptLower.includes(keyword)) {
          tags.push(keyword)
        }
      })

      if (tags.length === 0) {
        tags.push('email', 'marketing')
      } else if (tags.length === 1) {
        tags.push('email')
      }

      return tags.slice(0, 5)
    } catch (error) {
      return ['email', 'marketing']
    }
  }

  generateColor(type?: string): string {
    if (type && EMAIL_COLORS[type as keyof typeof EMAIL_COLORS]) {
      return EMAIL_COLORS[type as keyof typeof EMAIL_COLORS]
    }
    return '#6b7280'
  }

  async createProject(projectData: any): Promise<IProject> {
    try {
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

      return convertProjectToInterface(project)
    } catch (error) {
      logger.error('Create project failed:', error)
      throw error
    }
  }

  async createProjectWithAI(userId: string, createProjectDto: CreateProjectDto): Promise<IProject> {
    try {
      console.log('🚀 [PROJECT SERVICE] Criando projeto com IA Enhanced:', {
        userId,
        promptLength: createProjectDto.prompt.length,
        type: createProjectDto.type
      })

      const context = {
        userId,
        type: createProjectDto.type || 'campaign',
        industry: createProjectDto.industry || 'geral',
        targetAudience: createProjectDto.targetAudience,
        tone: createProjectDto.tone || 'profissional',
        projectName: this.generateProjectName(createProjectDto.prompt),
        status: 'draft' as const
      }

      const smartRequest = {
        prompt: createProjectDto.prompt,
        projectContext: context,
        useEnhanced: true
      }

      const enhancedResult = await EnhancedAIService.generateSmartEmail(smartRequest)

      const project = new Project({
        userId: new Types.ObjectId(userId),
        name: this.generateProjectName(createProjectDto.prompt),
        description: `Projeto inteligente gerado: ${createProjectDto.prompt.substring(0, 100)}...`,
        type: createProjectDto.type || 'campaign',
        status: PROJECT_STATUS.DRAFT,
        content: {
          subject: enhancedResult.subject,
          previewText: enhancedResult.previewText,
          html: enhancedResult.html,
          text: enhancedResult.html.replace(/<[^>]*>/g, '')
        },
        metadata: {
          industry: createProjectDto.industry || 'Geral',
          targetAudience: createProjectDto.targetAudience,
          tone: createProjectDto.tone || 'profissional',
          originalPrompt: createProjectDto.prompt,
          version: 1,
          enhancedFeatures: enhancedResult.metadata.enhancedFeatures,
          qualityScore: enhancedResult.metadata.qualityScore,
          aiModel: enhancedResult.metadata.model
        },
        tags: this.generateTags(createProjectDto.prompt, createProjectDto.type),
        color: this.generateColor(createProjectDto.type),
        isPublic: false
      })

      await project.save()
      await this.createProjectChat(project._id as Types.ObjectId, userId)

      logger.info('Project created with Enhanced AI', { 
        projectId: project._id.toString(), 
        userId,
        type: project.type,
        qualityScore: enhancedResult.metadata.qualityScore,
        enhancedFeatures: enhancedResult.metadata.enhancedFeatures.length
      })

      return convertProjectToInterface(project)
    } catch (error) {
      logger.error('Create project with Enhanced AI failed:', error)
      throw error
    }
  }

  async createProjectChat(projectId: Types.ObjectId, userId: string): Promise<any> {
    try {
      const chat = new Chat({
        userId: new Types.ObjectId(userId),
        projectId,
        title: 'Chat Inteligente',
        isActive: true
      })

      await chat.save()
      await Project.findByIdAndUpdate(projectId, { chatId: chat._id })

      return chat
    } catch (error) {
      logger.error('Create project chat failed:', error)
      throw error
    }
  }

  async improveProjectWithAI(projectId: string, userId: string, feedback: string): Promise<IProject | null> {
    try {
      console.log('🔧 [PROJECT SERVICE] Melhorando projeto com IA Enhanced:', {
        projectId,
        userId,
        feedbackLength: feedback.length
      })

      const project = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      })

      if (!project) {
        return null
      }

      const context = {
        userId,
        type: project.type,
        industry: project.metadata.industry,
        targetAudience: project.metadata.targetAudience,
        tone: project.metadata.tone,
        projectName: project.name,
        status: project.status
      }

      const enhancedResponse = await EnhancedAIService.smartChatWithAI(
        feedback,
        [],
        context
      )

      if (enhancedResponse.shouldUpdateEmail && enhancedResponse.enhancedContent) {
        project.content = {
          subject: enhancedResponse.enhancedContent.subject,
          previewText: enhancedResponse.enhancedContent.previewText,
          html: enhancedResponse.enhancedContent.html,
          text: enhancedResponse.enhancedContent.html.replace(/<[^>]*>/g, '')
        }

        project.metadata.version += 1
        project.metadata.lastImprovement = {
          feedback,
          timestamp: new Date().toISOString(),
          version: project.metadata.version
        }

        await project.save()

        logger.info('Project improved with Enhanced AI', {
          projectId,
          userId,
          newVersion: project.metadata.version
        })
      }

      return convertProjectToInterface(project)
    } catch (error) {
      logger.error('Improve project with Enhanced AI failed:', error)
      throw error
    }
  }

  async trackProjectCreation(userId: string, projectId: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { 'apiUsage.currentMonth': 1 },
        $set: { 'apiUsage.lastUsed': new Date() }
      })

      logger.info('Project creation tracked', { userId, projectId })
    } catch (error) {
      logger.error('Track project creation failed:', error)
    }
  }

  async getUserProjects(filters: ProjectFilters): Promise<ProjectResponse> {
    console.log('🔧 [PROJECT SERVICE] Iniciando getUserProjects:', {
      userId: filters.userId,
      search: filters.search,
      type: filters.type,
      pagination: filters.pagination,
      sort: filters.sort,
      timestamp: new Date().toISOString()
    })

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

      if (!userId) {
        throw new Error('UserId é obrigatório')
      }

      console.log('📝 [PROJECT SERVICE] Validação passou, construindo query...')

      const query: any = { userId: new Types.ObjectId(userId) }

      if (search) {
        query.$text = { $search: search }
      }

      if (type && type !== 'all') {
        query.type = type
      }

      if (status && status !== 'all') {
        query.status = status
      }

      if (tags && tags.length > 0) {
        query.tags = { $in: tags }
      }

      console.log('🔍 [PROJECT SERVICE] Query construída:', JSON.stringify(query, null, 2))

      const page = pagination.page || 1
      const limit = pagination.limit || PAGINATION.DEFAULT_LIMIT
      const skip = (page - 1) * limit

      console.log('📄 [PROJECT SERVICE] Parâmetros de paginação:', { page, limit, skip })

      const sortObj: any = {}
      sortObj[sort.field] = sort.order === 'asc' ? 1 : -1

      console.log('📊 [PROJECT SERVICE] Ordenação:', sortObj)

      console.log('🔍 [PROJECT SERVICE] Executando busca no banco...')
      
      const [projects, totalItems] = await Promise.all([
        Project.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .populate({
          path: 'chatId',
          select: 'title metadata.totalMessages'
        }),
        Project.countDocuments(query)
      ])

      console.log('✅ [PROJECT SERVICE] Busca concluída:', {
        projectsEncontrados: projects.length,
        totalItems,
        query: JSON.stringify(query)
      })

      console.log('📊 [PROJECT SERVICE] Buscando estatísticas...')
      
      let stats
      try {
        stats = await this.getUserProjectStats(userId)
        console.log('✅ [PROJECT SERVICE] Stats obtidas:', stats)
      } catch (statsError) {
        console.error('❌ [PROJECT SERVICE] Erro ao buscar stats (usando fallback):', statsError)
        stats = {
          totalProjects: totalItems,
          totalOpens: 0,
          totalClicks: 0,
          totalUses: 0,
          avgConversion: 0
        }
      }

      const totalPages = Math.ceil(totalItems / limit)

      console.log('🔧 [PROJECT SERVICE] Convertendo projetos para interface...')

      const projectsData: IProject[] = projects.map(project => convertProjectToInterface(project))

      console.log('✅ [PROJECT SERVICE] Conversão concluída, montando resposta final...')

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
          drafts: await Project.countDocuments({ userId: new Types.ObjectId(userId), status: 'draft' }),
          completed: await Project.countDocuments({ userId: new Types.ObjectId(userId), status: 'completed' }),
          recent: await Project.countDocuments({ 
            userId: new Types.ObjectId(userId),
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          })
        }
      }

      console.log('🎉 [PROJECT SERVICE] getUserProjects concluído com sucesso:', {
        projectsRetornados: result.projects.length,
        pagination: result.pagination,
        stats: result.stats
      })

      return result
      
    } catch (error: any) {
      console.error('❌ [PROJECT SERVICE] Erro em getUserProjects:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        userId: filters.userId,
        timestamp: new Date().toISOString()
      })

      logger.error('Get user projects failed:', error)
      throw error
    }
  }

  async getProjectById(projectId: string, userId: string): Promise<IProject | null> {
    try {
      const project = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      }).populate({
          path: 'chatId',
          select: 'title metadata.totalMessages'
        })

      if (!project) {
        return null
      }

      await project.incrementViews()

      return convertProjectToInterface(project)
    } catch (error) {
      logger.error('Get project by ID failed:', error)
      throw error
    }
  }

  async incrementProjectViews(projectId: string): Promise<void> {
    try {
      await Project.findByIdAndUpdate(projectId, {
        $inc: { 'stats.views': 1 }
      })
      logger.info('Project views incremented', { projectId })
    } catch (error) {
      logger.error('Increment project views failed:', error)
    }
  }

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

        return convertProjectToInterface(project)
      }

      return null
    } catch (error) {
      logger.error('Update project failed:', error)
      throw error
    }
  }

  async deleteProject(projectId: string, userId: string): Promise<boolean> {
    try {
      const project = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      })

      if (!project) {
        return false
      }

      if (project.chatId) {
        await Chat.findByIdAndDelete(project.chatId)
      }

      await Project.findByIdAndDelete(projectId)

      logger.info('Project deleted', { projectId, userId })
      return true
    } catch (error) {
      logger.error('Delete project failed:', error)
      throw error
    }
  }

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
      await this.createProjectChat(duplicatedProject._id as Types.ObjectId, userId)

      logger.info('Project duplicated', {
        originalId: projectId,
        duplicatedId: duplicatedProject._id.toString(),
        userId
      })

      return convertProjectToInterface(duplicatedProject)
    } catch (error) {
      logger.error('Duplicate project failed:', error)
      throw error
    }
  }

  async getPopularProjects(limit: number = 10): Promise<IProject[]> {
    try {
      const projects = await Project.find({ isPublic: true })
        .sort({ 'stats.uses': -1, 'stats.views': -1 })
        .limit(limit)

      return projects.map(project => convertProjectToInterface(project))
    } catch (error) {
      logger.error('Get popular projects failed:', error)
      throw error
    }
  }

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

  async getProjectAnalytics(projectId: string, userId: string): Promise<ProjectAnalytics | null> {
    try {
      const project = await Project.findOne({
        _id: projectId,
        userId: new Types.ObjectId(userId)
      })

      if (!project) {
        return null
      }

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

  async getUserProjectStats(userId: string): Promise<any> {
    console.log('📊 [PROJECT SERVICE] Buscando stats para usuário:', userId)
    
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
      
      const result = stats[0] || {
        totalProjects: 0,
        totalOpens: 0,
        totalClicks: 0,
        totalUses: 0,
        avgConversion: 0
      }

      console.log('✅ [PROJECT SERVICE] Stats calculadas:', result)
      return result
      
    } catch (error) {
      console.error('❌ [PROJECT SERVICE] Erro ao calcular stats:', error)
      logger.error('Get user project stats failed:', error)
      
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
