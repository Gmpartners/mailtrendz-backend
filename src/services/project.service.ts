import { getSupabaseWithAuth, supabaseAdmin } from '../config/supabase.config'
import { Database } from '../database/types'
import { 
  CreateProjectDto, 
  UpdateProjectDto, 
  ProjectQuery, 
  ProjectStats,
  ProjectWithStats
} from '../types/project.types'
import { ApiError } from '../utils/api-error'
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants'
import { logger } from '../utils/logger'
import iaService from './iaservice'

type Project = Database['public']['Tables']['projects']['Row']
type ProjectInsert = Database['public']['Tables']['projects']['Insert']
type ProjectUpdate = Database['public']['Tables']['projects']['Update']

class ProjectService {
  async create(userId: string, projectData: CreateProjectDto, userToken?: string): Promise<Project> {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      let projectName = projectData.name
      let htmlContent = projectData.html || ''
      let subjectContent = projectData.subject || ''
      
      // ✅ SE HOUVER IMAGENS, PROCESSAR COM IA PRIMEIRO
      if (projectData.images && projectData.images.length > 0) {
        logger.info('Processing project with images', {
          imageCount: projectData.images.length,
          prompt: projectData.prompt?.substring(0, 50)
        })
        
        try {
          // Preparar dados para IA - extrair apenas strings válidas
          const imageUrls: string[] = []
          const imageIntents: Array<{ url: string; intent: 'analyze' | 'include' }> = []
          
          projectData.images.forEach(img => {
            let url: string | undefined
            let intent: 'analyze' | 'include' = 'include'
            
            if (typeof img === 'string') {
              url = img
            } else if (img && typeof img === 'object') {
              url = img.uploadUrl || img.url
              intent = img.intent || 'include'
            }
            
            if (url && typeof url === 'string' && url.length > 0) {
              imageUrls.push(url)
              imageIntents.push({ url, intent })
            }
          })
          
          // Gerar HTML com IA
          const iaResponse = await iaService.generateHTML({
            userInput: projectData.prompt || 'Criar email baseado nas imagens anexadas',
            imageUrls: imageUrls,
            imageIntents: imageIntents,
            context: {
              industry: projectData.industry || 'geral',
              tone: projectData.tone || 'profissional',
              targetAudience: projectData.targetAudience
            },
            userId
          })
          
          // Usar o HTML gerado pela IA
          htmlContent = iaResponse.html
          subjectContent = iaResponse.subject
          
          logger.info('IA generated HTML with images successfully', {
            htmlLength: htmlContent.length,
            subject: subjectContent,
            imagesProcessed: iaResponse.metadata.imagesAnalyzed
          })
          
        } catch (iaError: any) {
          logger.error('Error generating HTML with IA for images:', iaError)
          // Continuar sem HTML se IA falhar
        }
      }
      
      if (!projectName || typeof projectName !== 'string' || projectName.trim() === '') {
        projectName = this.generateProjectName(projectData.prompt || projectData.description || '')
        logger.info(`Generated project name: "${projectName}" from prompt: "${(projectData.prompt || '').substring(0, 50)}..."`)
      } else {
        projectName = projectName.trim()
        logger.info(`Using provided project name: "${projectName}"`)
      }
      
      if (!projectName || projectName.length === 0) {
        const fallbackName = `Projeto ${new Date().toLocaleString('pt-BR')}`
        logger.warn(`Project name was empty, using fallback: "${fallbackName}"`)
        projectName = fallbackName
      }
      
      if (projectName.length > 100) {
        projectName = projectName.substring(0, 97) + '...'
        logger.info(`Project name truncated to: "${projectName}"`)
      }
      
      logger.info(`Creating project with name: "${projectName}" for user: ${userId}`)
      
      const newProject: ProjectInsert = {
        user_id: userId,
        name: projectName,
        description: projectData.description || projectData.prompt || '',
        type: projectData.type || 'campaign',
        content: {
          html: htmlContent,
          text: projectData.text || '',
          subject: subjectContent,
          previewText: projectData.previewText || ''
        },
        metadata: {
          industry: projectData.industry || 'outros',
          targetAudience: projectData.targetAudience || '',
          tone: projectData.tone || 'profissional',
          originalPrompt: projectData.prompt || '',
          version: 1
        },
        tags: projectData.tags || [],
        chat_id: projectData.chatId || null
      }

      logger.info('Project data to insert:', {
        user_id: newProject.user_id,
        name: newProject.name,
        name_length: newProject.name?.length,
        name_type: typeof newProject.name,
        description_length: newProject.description?.length,
        type: newProject.type,
        hasUserToken: !!userToken,
        hasHtml: !!newProject.content?.html,
        htmlLength: newProject.content?.html?.length || 0
      })

      const { data: project, error } = await supabase
        .from('projects')
        .insert(newProject)
        .select()
        .single()

      if (error) {
        logger.error('Supabase error creating project:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          projectName: newProject.name,
          userId: userId,
          hasUserToken: !!userToken
        })
        throw new ApiError('Erro ao criar projeto no banco de dados', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      if (!project) {
        logger.error('Project creation returned no data')
        throw new ApiError('Erro ao criar projeto - nenhum dado retornado', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      logger.info(`✅ Project created successfully: ${project.id} with name: "${project.name}" by user ${userId}`)
      return project
    } catch (error) {
      logger.error('Create project error:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        projectName: projectData.name,
        userId: userId,
        hasUserToken: !!userToken
      })
      
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao criar projeto', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  private generateProjectName(prompt: string): string {
    try {
      const now = new Date()
      const defaultName = `Projeto ${now.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })}`
      
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        logger.info('No valid prompt provided, using default name')
        return defaultName
      }
      
      const cleanPrompt = prompt
        .trim()
        .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF\-]/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
      
      if (!cleanPrompt || cleanPrompt.length === 0) {
        logger.info('Prompt became empty after cleaning, using default name')
        return defaultName
      }
      
      const words = cleanPrompt.split(' ').filter(word => word.length > 0)
      let name = ''
      
      for (const word of words) {
        const potentialName = name + (name ? ' ' : '') + word
        if (potentialName.length > 50) break
        name = potentialName
      }
      
      if (!name || name.length < 3) {
        logger.info('Generated name too short, using default name')
        return defaultName
      }
      
      name = name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      
      logger.info(`Generated name: "${name}" from prompt: "${prompt.substring(0, 30)}..."`)
      return name
      
    } catch (error) {
      logger.error('Error generating project name:', error)
      const now = new Date()
      return `Projeto ${now.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })}`
    }
  }

  async findById(projectId: string, userId?: string, userToken?: string): Promise<ProjectWithStats> {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { data: project, error } = await supabase
        .from('projects_with_stats')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error || !project) {
        throw new ApiError('Projeto não encontrado', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND)
      }

      if (!project.is_public && (!userId || project.user_id !== userId)) {
        throw new ApiError('Acesso negado', HTTP_STATUS.FORBIDDEN, ERROR_CODES.INSUFFICIENT_PERMISSIONS)
      }

      return project as ProjectWithStats
    } catch (error) {
      logger.error('Find project error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao buscar projeto', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async findByUser(userId: string, query: ProjectQuery = {}, userToken?: string) {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      let queryBuilder = supabase
        .from('projects_with_stats')
        .select('*')
        .eq('user_id', userId)

      if (query.type) {
        queryBuilder = queryBuilder.eq('type', query.type)
      }

      if (query.status) {
        queryBuilder = queryBuilder.eq('status', query.status)
      }

      if (query.search) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`)
      }

      if (query.tags && query.tags.length > 0) {
        queryBuilder = queryBuilder.contains('tags', query.tags)
      }

      const sortField = query.sortBy || 'updated_at'
      const sortOrder = query.order || 'desc'
      queryBuilder = queryBuilder.order(sortField, { ascending: sortOrder === 'asc' })

      const limit = query.limit || 20
      const offset = ((query.page || 1) - 1) * limit
      queryBuilder = queryBuilder.range(offset, offset + limit - 1)

      const { data: projects, error, count } = await queryBuilder

      if (error) {
        logger.error('Error fetching user projects:', error)
        throw new ApiError('Erro ao buscar projetos', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return {
        data: projects || [],
        pagination: {
          page: query.page || 1,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    } catch (error) {
      logger.error('Find user projects error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao buscar projetos', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async update(projectId: string, userId: string, updates: UpdateProjectDto, userToken?: string): Promise<Project> {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id, user_id, metadata')
        .eq('id', projectId)
        .single()

      if (!existingProject || existingProject.user_id !== userId) {
        throw new ApiError('Projeto não encontrado', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND)
      }

      const projectUpdate: ProjectUpdate = {}

      if (updates.name !== undefined) projectUpdate.name = updates.name
      if (updates.description !== undefined) projectUpdate.description = updates.description
      if (updates.type !== undefined) projectUpdate.type = updates.type
      if (updates.status !== undefined) projectUpdate.status = updates.status
      if (updates.tags !== undefined) projectUpdate.tags = updates.tags
      if (updates.isPublic !== undefined) projectUpdate.is_public = updates.isPublic

      if (updates.content) {
        projectUpdate.content = {
          html: updates.content.html,
          text: updates.content.text,
          subject: updates.content.subject,
          previewText: updates.content.previewText
        }
      }

      if (updates.metadata) {
        projectUpdate.metadata = {
          ...existingProject.metadata,
          ...updates.metadata,
          version: (existingProject.metadata.version || 0) + 1
        }
      }

      const { data: project, error } = await supabase
        .from('projects')
        .update(projectUpdate)
        .eq('id', projectId)
        .select()
        .single()

      if (error || !project) {
        logger.error('Error updating project:', error)
        throw new ApiError('Erro ao atualizar projeto', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      logger.info(`Project updated: ${projectId} by user ${userId}`)
      return project
    } catch (error) {
      logger.error('Update project error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao atualizar projeto', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async delete(projectId: string, userId: string, userToken?: string): Promise<void> {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId)

      if (error) {
        if (error.code === 'PGRST116') {
          throw new ApiError('Projeto não encontrado', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND)
        }
        throw error
      }

      logger.info(`Project deleted: ${projectId} by user ${userId}`)
    } catch (error) {
      logger.error('Delete project error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao deletar projeto', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async duplicate(projectId: string, userId: string, userToken?: string): Promise<Project> {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { data: original } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single()

      if (!original) {
        throw new ApiError('Projeto não encontrado', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND)
      }

      const originalName = original.name || 'Projeto Sem Nome'
      const duplicatedName = `${originalName} (Cópia)`

      const newProject: ProjectInsert = {
        ...original,
        id: undefined,
        name: duplicatedName,
        created_at: undefined,
        updated_at: undefined
      }

      const { data: project, error } = await supabase
        .from('projects')
        .insert(newProject)
        .select()
        .single()

      if (error || !project) {
        logger.error('Error duplicating project:', error)
        throw new ApiError('Erro ao duplicar projeto', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      logger.info(`Project duplicated: ${projectId} -> ${project.id} by user ${userId}`)
      return project
    } catch (error) {
      logger.error('Duplicate project error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao duplicar projeto', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async getStats(userId: string, userToken?: string): Promise<ProjectStats> {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { data: projects } = await supabase
        .from('projects_with_stats')
        .select('type, opens, clicks, uses')
        .eq('user_id', userId)

      const stats: ProjectStats = {
        total: projects?.length || 0,
        byType: {},
        totalOpens: 0,
        totalClicks: 0,
        totalUses: 0,
        avgConversionRate: 0
      }

      if (projects && projects.length > 0) {
        let totalConversionRate = 0
        let projectsWithOpens = 0

        projects.forEach((project: any) => {
          if (!stats.byType[project.type]) {
            stats.byType[project.type] = { count: 0, avgOpens: 0, avgClicks: 0 }
          }
          
          stats.byType[project.type].count++
          stats.totalOpens += project.opens
          stats.totalClicks += project.clicks
          stats.totalUses += project.uses

          if (project.opens > 0) {
            projectsWithOpens++
            totalConversionRate += (project.clicks / project.opens) * 100
          }
        })

        Object.keys(stats.byType).forEach(type => {
          const typeProjects = projects.filter((p: any) => p.type === type)
          stats.byType[type].avgOpens = typeProjects.reduce((sum: number, p: any) => sum + p.opens, 0) / typeProjects.length
          stats.byType[type].avgClicks = typeProjects.reduce((sum: number, p: any) => sum + p.clicks, 0) / typeProjects.length
        })

        stats.avgConversionRate = projectsWithOpens > 0 ? totalConversionRate / projectsWithOpens : 0
      }

      return stats
    } catch (error) {
      logger.error('Get stats error:', error)
      throw new ApiError('Erro ao buscar estatísticas', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async updateStats() {
    try {
      logger.info('Stats update skipped to avoid RLS issues')
    } catch (error) {
      logger.error('Update stats error:', error)
    }
  }

  async getPopularTags(userId?: string, limit: number = 20, userToken?: string) {
    try {
      // ✅ USAR CLIENTE APROPRIADO
      const supabase = userId ? getSupabaseWithAuth(userToken) : supabaseAdmin
      
      let query = supabase.from('projects').select('tags')

      if (userId) {
        query = query.eq('user_id', userId)
      } else {
        query = query.eq('is_public', true)
      }

      const { data: projects } = await query

      const tagCount: Record<string, number> = {}

      projects?.forEach((project: any) => {
        project.tags?.forEach((tag: string) => {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      })

      const sortedTags = Object.entries(tagCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }))

      return sortedTags
    } catch (error) {
      logger.error('Get popular tags error:', error)
      return []
    }
  }
}

export default new ProjectService()