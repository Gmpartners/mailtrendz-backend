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

// ✅ NOVO: Definir interfaces para content e metadata
interface ProjectContent {
  html?: string
  text?: string
  subject?: string
  previewText?: string
}

interface ProjectMetadata {
  industry?: string
  targetAudience?: string
  tone?: string
  originalPrompt?: string
  version?: number
  aiGenerated?: boolean
  generatedAt?: string
  lastModified?: string
  [key: string]: any
}

// ✅ NOVO: Type guards para validar tipos
function isValidProjectType(type: string): type is 'campaign' | 'newsletter' | 'transactional' | 'notification' | 'other' {
  return ['campaign', 'newsletter', 'transactional', 'notification', 'other'].includes(type)
}

function isValidProjectStatus(status: string): status is 'active' | 'draft' | 'archived' {
  return ['active', 'draft', 'archived'].includes(status)
}

class ProjectService {
  async create(userId: string, projectData: CreateProjectDto, userToken?: string): Promise<Project> {
    try {
      const supabase = getSupabaseWithAuth(userToken)
      
      let projectName = projectData.name
      let htmlContent = projectData.html || ''
      let subjectContent = projectData.subject || ''
      
      logger.info('🔍 [PROJECT-SERVICE] Received project data:', {
        hasName: !!projectData.name,
        hasHtml: !!projectData.html,
        htmlLength: projectData.html?.length || 0,
        hasSubject: !!projectData.subject,
        hasPrompt: !!projectData.prompt,
        promptLength: projectData.prompt?.length || 0,
        userId
      })
      
      // 🚨 CORREÇÃO: Só gerar com IA se não tiver HTML já fornecido
      const hasPreGeneratedContent = htmlContent && htmlContent.trim().length > 0
      const shouldGenerateWithAI = !hasPreGeneratedContent && (
        (projectData.prompt && projectData.prompt.trim().length > 0) || 
        (projectData.images && projectData.images.length > 0)
      )
      
      if (hasPreGeneratedContent) {
        logger.info('♻️ Using pre-generated HTML content (avoiding duplicate AI generation)', {
          htmlLength: htmlContent.length,
          hasSubject: !!subjectContent,
          subjectLength: subjectContent?.length || 0,
          userId
        })
      } else if (shouldGenerateWithAI) {
        logger.info('🤖 Generating HTML with AI for project creation', {
          hasPrompt: !!projectData.prompt,
          promptLength: projectData.prompt?.length || 0,
          hasImages: !!(projectData.images && projectData.images.length > 0),
          imageCount: projectData.images?.length || 0,
          userId
        })
        
        try {
          const imageUrls: string[] = []
          const imageIntents: Array<{ url: string; intent: 'analyze' | 'include' }> = []
          
          if (projectData.images && projectData.images.length > 0) {
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
          }
          
          const iaResponse = await iaService.generateHTML({
            userInput: projectData.prompt || 'Criar email personalizado',
            imageUrls: imageUrls,
            imageIntents: imageIntents,
            context: {
              industry: projectData.industry || 'geral',
              tone: projectData.tone || 'profissional',
              targetAudience: projectData.targetAudience,
              userId,
              timestamp: new Date().toISOString()
            },
            userId
          })
          
          htmlContent = iaResponse.html
          subjectContent = iaResponse.subject || 'Email Personalizado'
          
          logger.info('✅ IA generated HTML successfully', {
            htmlLength: htmlContent.length,
            subject: subjectContent,
            hasImages: imageUrls.length > 0,
            imagesProcessed: iaResponse.metadata?.imagesAnalyzed || 0,
            model: iaResponse.metadata?.model
          })
          
          // 🚨 CORREÇÃO: Consumir crédito apenas quando realmente usar IA
          try {
            const subscriptionService = require('./subscription.service').default
            await subscriptionService.consumeCredits(userId, 1, 'ai_generation')
            logger.info('✅ [PROJECT-CREATION] AI credit consumed after successful generation', { userId })
          } catch (creditError: any) {
            logger.error('❌ [PROJECT-CREATION] Failed to consume AI credit:', creditError.message)
          }
          
        } catch (iaError: any) {
          logger.error('❌ Error generating HTML with IA, using fallback', iaError)
          
          const fallbackHtml = this.generateFallbackHTML(projectData)
          htmlContent = fallbackHtml.html
          subjectContent = fallbackHtml.subject
          
          logger.info('📝 Using fallback HTML generation', {
            htmlLength: htmlContent.length,
            subject: subjectContent
          })
        }
      }
      
      if (!htmlContent || htmlContent.trim().length === 0) {
        const fallbackHtml = this.generateFallbackHTML(projectData)
        htmlContent = fallbackHtml.html
        subjectContent = fallbackHtml.subject
        
        logger.info('📝 No HTML content, using fallback', {
          htmlLength: htmlContent.length
        })
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
          text: projectData.text || this.htmlToText(htmlContent),
          subject: subjectContent,
          previewText: projectData.previewText || this.generatePreviewText(htmlContent)
        },
        metadata: {
          industry: projectData.industry || 'outros',
          targetAudience: projectData.targetAudience || '',
          tone: projectData.tone || 'profissional',
          originalPrompt: projectData.prompt || '',
          version: 1,
          aiGenerated: shouldGenerateWithAI,
          generatedAt: new Date().toISOString()
        },
        tags: projectData.tags || [],
        chat_id: projectData.chatId || null,
        organization_id: null
      }

      // ✅ CORRIGIDO: Usar type assertion para content e metadata
      const content = newProject.content as ProjectContent
      const metadata = newProject.metadata as ProjectMetadata

      logger.info('Project data to insert:', {
        user_id: newProject.user_id,
        name: newProject.name,
        name_length: newProject.name?.length,
        name_type: typeof newProject.name,
        description_length: newProject.description?.length,
        type: newProject.type,
        organization_id: newProject.organization_id,
        hasUserToken: !!userToken,
        hasHtml: !!content?.html,
        htmlLength: content?.html?.length || 0,
        hasSubject: !!content?.subject,
        aiGenerated: metadata?.aiGenerated
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

      // 🚨 CORREÇÃO CRÍTICA: Criar chat automaticamente e atualizar chat_id
      try {
        logger.info(`🔗 [PROJECT-CREATION] Creating chat for project: ${project.id}`, {
          projectName: project.name,
          userId: userId,
          timestamp: new Date().toISOString()
        })
        
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .insert({
            user_id: userId,
            title: `Chat - ${project.name}`,
            project_id: project.id,
            // ✅ NOVO: Adicionar organization_id se houver
            organization_id: null,
            context: {
              source: "project-builder",
              createdBy: "projectService.create",
              projectId: project.id,
              timestamp: new Date().toISOString(),
              projectName: project.name,
              projectType: project.type,
              userAgent: "backend-api"
            },
            is_active: true
          })
          .select()
          .single()

        if (chatError || !chat) {
          logger.error('❌ [PROJECT-CREATION] Error creating chat for project:', {
            error: chatError?.message || 'No chat returned',
            code: chatError?.code,
            details: chatError?.details,
            hint: chatError?.hint,
            projectId: project.id,
            projectName: project.name
          })
          throw new Error('Failed to create chat - ' + (chatError?.message || 'Unknown error'))
        }

        logger.info(`✅ [PROJECT-CREATION] Chat created successfully: ${chat.id}`, {
          chatTitle: chat.title,
          projectId: project.id
        })

        // Atualizar projeto com chat_id
        const { data: updatedProject, error: updateError } = await supabase
          .from('projects')
          .update({ chat_id: chat.id })
          .eq('id', project.id)
          .select()
          .single()

        if (updateError || !updatedProject) {
          logger.error('❌ [PROJECT-CREATION] Error updating project with chat_id:', {
            error: updateError?.message || 'No updated project returned',
            code: updateError?.code,
            projectId: project.id,
            chatId: chat.id
          })
          
          // 🚨 FALLBACK CRÍTICO: Se falhar em atualizar o projeto, pelo menos temos o chat
          logger.warn('⚠️ [PROJECT-CREATION] Using fallback - returning original project with manual chat_id assignment')
          return {
            ...project,
            chat_id: chat.id
          }
        }

        // ✅ CORRIGIDO: Usar type assertion para content e metadata na resposta
        const updatedContent = updatedProject.content as ProjectContent
        const updatedMetadata = updatedProject.metadata as ProjectMetadata

        logger.info(`✅ [PROJECT-CREATION] Project created successfully with chat: ${updatedProject.id} -> chat: ${chat.id}`, {
          projectName: updatedProject.name,
          chatId: chat.id,
          htmlLength: updatedContent?.html?.length || 0,
          hasSubject: !!updatedContent?.subject,
          aiGenerated: updatedMetadata?.aiGenerated,
          finalChatId: updatedProject.chat_id
        })
        
        return updatedProject
      } catch (chatCreationError: any) {
        logger.error('❌ [PROJECT-CREATION] Critical error: Failed to create chat for project, but project was created:', {
          projectId: project.id,
          projectName: project.name,
          error: chatCreationError?.message || 'Unknown error',
          stack: chatCreationError?.stack,
          userId: userId,
          willReturnProjectAnyway: true
        })
        
        // 🚨 FALLBACK CRÍTICO: Retornar projeto mesmo sem chat 
        // Isso permite que o frontend funcione e crie o chat depois se necessário
        logger.warn('⚠️ [PROJECT-CREATION] Returning project WITHOUT chat due to chat creation failure')
        logger.warn('⚠️ [PROJECT-CREATION] Frontend should handle this gracefully with ensureProjectHasChat')
        
        return project
      }
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

  // 🚨 NOVA FUNÇÃO: Garantir que projeto tenha chat
  async ensureProjectHasChat(projectId: string, userId: string, userToken?: string): Promise<string> {
    try {
      const supabase = getSupabaseWithAuth(userToken)
      
      // Verificar se projeto já tem chat
      const { data: project } = await supabase
        .from('projects')
        .select('id, name, type, chat_id, organization_id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single()

      if (!project) {
        throw new ApiError('Projeto não encontrado', HTTP_STATUS.NOT_FOUND)
      }

      if (project.chat_id) {
        return project.chat_id
      }

      // Criar chat para projeto órfão
      logger.info(`🔧 Creating missing chat for project: ${projectId}`)
      
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          user_id: userId,
          title: `Chat - ${project.name}`,
          project_id: project.id,
          // ✅ NOVO: Adicionar organization_id se houver
          organization_id: project.organization_id,
          context: {
            source: "project-builder",
            createdBy: "ensureProjectHasChat",
            projectId: project.id,
            timestamp: new Date().toISOString(),
            projectName: project.name,
            projectType: project.type
          },
          is_active: true
        })
        .select()
        .single()

      if (chatError || !chat) {
        logger.error('Error creating chat for orphaned project:', chatError)
        throw new ApiError('Erro ao criar chat para projeto', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Atualizar projeto com chat_id
      const { error: updateError } = await supabase
        .from('projects')
        .update({ chat_id: chat.id })
        .eq('id', projectId)

      if (updateError) {
        logger.error('Error updating project with chat_id:', updateError)
        throw new ApiError('Erro ao atualizar projeto com chat', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      logger.info(`✅ Chat created for orphaned project: ${projectId} -> chat: ${chat.id}`)
      return chat.id
    } catch (error) {
      logger.error('Error ensuring project has chat:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao garantir chat do projeto', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  private generateFallbackHTML(projectData: CreateProjectDto): { html: string; subject: string } {
    const prompt = projectData.prompt || 'Email personalizado'
    const industry = projectData.industry || 'geral'
    
    const subject = `Email ${industry.charAt(0).toUpperCase() + industry.slice(1)} - ${new Date().toLocaleDateString('pt-BR')}`
    
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); padding: 25px; text-align: center; border-radius: 12px; margin-bottom: 25px; }
        .content { padding: 40px 30px; }
        .cta { text-align: center; margin: 20px 0; }
        .btn { background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; }
        .footer { background: #6b7280; color: white; padding: 15px; text-align: center; font-size: 12px; }
        p { font-size: 16px; margin-bottom: 15px; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1 style="color: #7c3aed; font-size: 28px; margin: 0;">✨ ${subject}</h1>
            </div>
            
            <p style="color: #374151;">
                Email baseado em: "<strong>${prompt}</strong>"
            </p>
            
            <p style="color: #374151;">
                Este email foi gerado automaticamente com HTML responsivo. Você pode editá-lo diretamente no editor ou pedir modificações via chat.
            </p>
            
            <div class="cta">
                <a href="#" class="btn">Saiba Mais</a>
            </div>
        </div>
        <div class="footer">
            <p style="margin: 0;">© 2025 MailTrendz - Sistema Inteligente</p>
        </div>
    </div>
</body>
</html>`

    return { html, subject }
  }

  private htmlToText(html: string): string {
    if (!html) return ''
    
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500)
  }

  private generatePreviewText(html: string): string {
    if (!html) return ''
    
    const text = this.htmlToText(html)
    const words = text.split(' ').slice(0, 20)
    return words.join(' ') + (words.length >= 20 ? '...' : '')
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
      const supabase = getSupabaseWithAuth(userToken)
      
      let queryBuilder = supabase
        .from('projects_with_stats')
        .select('*', { count: 'exact' })

      // ✅ CORREÇÃO CRÍTICA: Respeitar workspace context
      queryBuilder = queryBuilder
        .eq('user_id', userId)
        .is('organization_id', null)
      logger.info('👤 [PROJECT SERVICE] Filtering by personal context:', {
        userId
      })

      // ✅ CORRIGIDO: Validar tipos antes de usar
      if (query.type && isValidProjectType(query.type)) {
        queryBuilder = queryBuilder.eq('type', query.type)
      }

      if (query.status && isValidProjectStatus(query.status)) {
        queryBuilder = queryBuilder.eq('status', query.status)
      }

      if (query.search) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`)
      }

      if (query.tags && query.tags.length > 0) {
        queryBuilder = queryBuilder.contains('tags', query.tags)
      }


      // ✅ CORRIGIDO: Ordenação para mostrar mais recentes PRIMEIRO
      const sortField = query.sortBy || 'updated_at'
      const sortOrder = query.order || 'desc'
      
      console.log('🔍 [PROJECT SERVICE] Sorting configuration:', {
        sortField,
        sortOrder,
        ascending: sortOrder === 'asc',
        expectedResult: sortOrder === 'desc' ? 'newest first' : 'oldest first'
      })
      
      // Ordenação primária - MAIS RECENTES PRIMEIRO
      queryBuilder = queryBuilder.order(sortField, { ascending: false }) // SEMPRE false para desc
      
      // ✅ Ordenação secundária: se updated_at for igual, usar created_at (também mais recente primeiro)
      if (sortField === 'updated_at') {
        queryBuilder = queryBuilder.order('created_at', { ascending: false })
      }
      
      // ✅ Ordenação terciária: nome em ordem alfabética
      queryBuilder = queryBuilder.order('name', { ascending: true })

      const limit = query.limit || 20
      const offset = ((query.page || 1) - 1) * limit
      queryBuilder = queryBuilder.range(offset, offset + limit - 1)

      const { data: projects, error, count } = await queryBuilder

      if (error) {
        logger.error('Error fetching user projects:', error)
        throw new ApiError('Erro ao buscar projetos', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      logger.info('✅ Projects fetched successfully:', {
        total: count || 0,
        returned: projects?.length || 0,
        page: query.page || 1,
        limit: limit
      })

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
      if (updates.is_favorite !== undefined) projectUpdate.is_favorite = updates.is_favorite

      if (updates.content) {
        projectUpdate.content = {
          html: updates.content.html,
          text: updates.content.text,
          subject: updates.content.subject,
          previewText: updates.content.previewText
        }
      }

      // ✅ CORRIGIDO: Validar metadata antes de fazer spread
      if (updates.metadata) {
        const existingMetadata = existingProject.metadata as ProjectMetadata | null
        const metadataBase = existingMetadata || {}
        
        projectUpdate.metadata = {
          ...metadataBase,
          ...updates.metadata,
          version: (metadataBase.version || 0) + 1,
          lastModified: new Date().toISOString()
        }
      }

      // ✅ CORREÇÃO: Sempre atualizar timestamp quando projeto é modificado
      projectUpdate.updated_at = new Date().toISOString()

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
      const supabase = getSupabaseWithAuth(userToken)
      
      let query = supabase
        .from('projects_with_stats')
        .select('type, opens, clicks, uses')

      // ✅ CORREÇÃO: Respeitar workspace context para stats
      query = query.eq('user_id', userId).is('organization_id', null)
      logger.info('👤 [STATS] Getting personal stats:', { userId })

      const { data: projects } = await query

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
      const supabase = userId ? getSupabaseWithAuth(userToken) : supabaseAdmin
      
      let query = supabase.from('projects').select('tags')

      if (userId) {
        // ✅ CORREÇÃO: Respeitar workspace context para tags populares
        query = query.eq('user_id', userId).is('organization_id', null)
        logger.info('👤 [TAGS] Getting personal tags:', { userId })
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