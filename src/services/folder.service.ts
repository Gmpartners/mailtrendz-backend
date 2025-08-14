import { supabaseAdmin } from '../config/supabase.config'
import { logger } from '../utils/logger'

interface Folder {
  id: string
  user_id: string
  name: string
  color: string | null
  parent_id: string | null
  created_at: string | null
  updated_at: string | null
}

interface FolderWithProjects extends Folder {
  projects_count?: number
  subfolders?: FolderWithProjects[]
}

class FolderService {

  async getFolders(userId: string): Promise<FolderWithProjects[]> {
    try {
      logger.info('📂 [FOLDER SERVICE] Getting folders for user', { userId })

      const { data: folders, error } = await supabaseAdmin
        .from('folders')
        .select(`
          id,
          name,
          color,
          parent_id,
          user_id,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .is('organization_id', null)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('❌ [FOLDER SERVICE] Error fetching folders:', error)
        throw new Error(`Erro ao buscar folders: ${error.message}`)
      }

      if (!folders || folders.length === 0) {
        logger.info('📂 [FOLDER SERVICE] No folders found for user', { userId })
        return []
      }

      const foldersWithProjects: FolderWithProjects[] = await Promise.all(
        folders.map(async (folder) => {
          const { data: projects, error: projectError } = await supabaseAdmin
            .from('projects')
            .select('id')
            .eq('folder_id', folder.id)
            .eq('user_id', userId)

          if (projectError) {
            logger.warn('⚠️ [FOLDER SERVICE] Error counting projects for folder:', {
              folderId: folder.id,
              error: projectError.message
            })
          }

          return {
            ...folder,
            projects_count: projects?.length || 0
          }
        })
      )

      logger.info('✅ [FOLDER SERVICE] Folders retrieved successfully', {
        userId,
        folderCount: foldersWithProjects.length,
        withProjects: foldersWithProjects.filter(f => f.projects_count && f.projects_count > 0).length
      })

      return foldersWithProjects

    } catch (error: any) {
      logger.error('❌ [FOLDER SERVICE] Error in getFolders:', error)
      throw error
    }
  }

  async createFolder(
    userId: string,
    name: string, 
    color: string = '#6b7280',
    parentId?: string
  ): Promise<Folder> {
    try {
      if (!this.isValidFolderName(name)) {
        throw new Error('Nome da pasta contém caracteres inválidos')
      }

      if (!this.isValidColor(color)) {
        throw new Error('Cor inválida. Use formato hexadecimal (#RRGGBB)')
      }

      if (parentId) {
        const depth = await this.getFolderDepth(parentId, userId)
        if (depth >= 10) {
          throw new Error('Profundidade máxima de pastas atingida (10 níveis)')
        }
      }

      const folderCount = await this.getUserFolderCount(userId)
      if (folderCount >= 1000) {
        throw new Error('Limite máximo de pastas atingido (1000 pastas)')
      }

      const folderData = {
        name: name.trim(),
        color,
        parent_id: parentId || null,
        user_id: userId,
        organization_id: null
      }

      const { data: folder, error } = await supabaseAdmin
        .from('folders')
        .insert(folderData)
        .select()
        .single()

      if (error) {
        throw error
      }

      logger.info('Folder created:', { 
        folderId: folder.id, 
        userId
      })

      return folder
    } catch (error: any) {
      logger.error('Error creating folder:', error)
      throw error
    }
  }

  async updateFolder(
    userId: string,
    folderId: string,
    updates: { name?: string; color?: string; parent_id?: string }
  ): Promise<Folder> {
    try {
      const cleanUpdates: any = {}

      if (updates.name !== undefined) {
        if (!this.isValidFolderName(updates.name)) {
          throw new Error('Nome contém caracteres inválidos')
        }
        cleanUpdates.name = updates.name.trim()
      }

      if (updates.color !== undefined) {
        if (!this.isValidColor(updates.color)) {
          throw new Error('Cor inválida')
        }
        cleanUpdates.color = updates.color
      }

      if (updates.parent_id !== undefined) {
        cleanUpdates.parent_id = updates.parent_id
      }

      if (Object.keys(cleanUpdates).length === 0) {
        throw new Error('Nenhuma atualização válida fornecida')
      }

      cleanUpdates.updated_at = new Date().toISOString()

      const { data: folder, error } = await supabaseAdmin
        .from('folders')
        .update(cleanUpdates)
        .eq('id', folderId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        throw error
      }

      if (!folder) {
        throw new Error('Pasta não encontrada ou você não tem permissão para editá-la')
      }

      logger.info('Folder updated:', { folderId, userId })
      return folder
    } catch (error: any) {
      logger.error('Error updating folder:', error)
      throw error
    }
  }

  async deleteFolder(userId: string, folderId: string): Promise<void> {
    try {
      const hasProjects = await this.folderHasProjects(folderId, userId)
      if (hasProjects) {
        throw new Error('Não é possível excluir pasta que contém projetos')
      }

      const { error } = await supabaseAdmin
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      logger.info('Folder deleted:', { folderId, userId })
    } catch (error: any) {
      logger.error('Error deleting folder:', error)
      throw error
    }
  }

  async moveProjectToFolder(
    userId: string,
    projectId: string,
    folderId?: string
  ): Promise<void> {
    try {
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('id, name, folder_id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single()

      if (projectError || !project) {
        throw new Error('Projeto não encontrado')
      }

      if (folderId) {
        const { data: folder, error: folderError } = await supabaseAdmin
          .from('folders')
          .select('id')
          .eq('id', folderId)
          .eq('user_id', userId)
          .single()

        if (folderError || !folder) {
          throw new Error('Pasta não encontrada')
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from('projects')
        .update({ 
          folder_id: folderId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', userId)

      if (updateError) {
        throw updateError
      }

      logger.info('Project moved to folder:', { 
        projectId, 
        folderId: folderId || 'root',
        userId
      })
    } catch (error: any) {
      logger.error('Error moving project to folder:', error)
      throw error
    }
  }

  private isValidFolderName(name: string): boolean {
    return !!/^[a-zA-ZÀ-ÿ0-9\s\-_\.]{1,100}$/.test(name.trim())
  }

  private isValidColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color)
  }

  private async getUserFolderCount(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('folders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('organization_id', null)

    if (error) {
      logger.error('Error getting folder count:', error)
      return 0
    }

    return count || 0
  }

  private async getFolderDepth(folderId: string, userId: string): Promise<number> {
    let depth = 0
    let currentFolderId: string | null = folderId

    while (currentFolderId && depth < 20) {
      const { data: folder, error }: { data: any, error: any } = await supabaseAdmin
        .from('folders')
        .select('parent_id')
        .eq('id', currentFolderId)
        .eq('user_id', userId)
        .single()

      if (error || !folder) break

      currentFolderId = folder.parent_id
      depth++
    }

    return depth
  }

  private async folderHasProjects(folderId: string, userId: string): Promise<boolean> {
    const { count, error } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('folder_id', folderId)
      .eq('user_id', userId)

    if (error) {
      logger.error('Error checking folder projects:', error)
      return false
    }

    return (count || 0) > 0
  }
}

export default new FolderService()