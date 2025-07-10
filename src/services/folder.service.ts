import { supabase } from '../config/supabase.config'
import { logger } from '../utils/logger'

interface Folder {
  id: string
  user_id: string
  name: string
  color: string
  parent_id: string | null
  created_at: string
  updated_at: string
}

interface FolderWithProjects extends Folder {
  projects_count?: number
  subfolders?: FolderWithProjects[]
}

class FolderService {
  async createFolder(
    userId: string, 
    name: string, 
    color: string = '#6b7280',
    parentId?: string
  ): Promise<Folder> {
    try {
      const hasAccess = await this.checkFolderAccess(userId)
      if (!hasAccess) {
        throw new Error('User plan does not include folders feature')
      }

      const { data: folder, error } = await supabase
        .from('folders')
        .insert({
          user_id: userId,
          name,
          color,
          parent_id: parentId || null
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      logger.info('Folder created:', { folderId: folder.id, userId })
      return folder
    } catch (error: any) {
      logger.error('Error creating folder:', error)
      throw error
    }
  }

  async updateFolder(
    folderId: string, 
    userId: string,
    updates: { name?: string; color?: string; parent_id?: string | null }
  ): Promise<Folder> {
    try {
      const { data: folder, error } = await supabase
        .from('folders')
        .update(updates)
        .eq('id', folderId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        throw error
      }

      if (!folder) {
        throw new Error('Folder not found or access denied')
      }

      logger.info('Folder updated:', { folderId })
      return folder
    } catch (error: any) {
      logger.error('Error updating folder:', error)
      throw error
    }
  }

  async deleteFolder(folderId: string, userId: string): Promise<void> {
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('folder_id', folderId)
        .eq('user_id', userId)

      if (projects && projects.length > 0) {
        await supabase
          .from('projects')
          .update({ folder_id: null })
          .eq('folder_id', folderId)
          .eq('user_id', userId)
      }

      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      logger.info('Folder deleted:', { folderId })
    } catch (error: any) {
      logger.error('Error deleting folder:', error)
      throw error
    }
  }

  async getFolders(userId: string): Promise<FolderWithProjects[]> {
    try {
      const hasAccess = await this.checkFolderAccess(userId)
      if (!hasAccess) {
        return []
      }

      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('name')

      if (foldersError) {
        throw foldersError
      }

      const { data: projectCounts } = await supabase
        .from('projects')
        .select('folder_id')
        .eq('user_id', userId)
        .not('folder_id', 'is', null)

      const countMap = projectCounts?.reduce((acc, project) => {
        acc[project.folder_id] = (acc[project.folder_id] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const foldersWithCounts = folders?.map(folder => ({
        ...folder,
        projects_count: countMap[folder.id] || 0
      })) || []

      return this.buildFolderTree(foldersWithCounts)
    } catch (error: any) {
      logger.error('Error getting folders:', error)
      throw error
    }
  }

  async moveProjectToFolder(
    projectId: string, 
    folderId: string | null, 
    userId: string
  ): Promise<void> {
    try {
      if (folderId) {
        const hasAccess = await this.checkFolderAccess(userId)
        if (!hasAccess) {
          throw new Error('User plan does not include folders feature')
        }

        const { data: folder } = await supabase
          .from('folders')
          .select('id')
          .eq('id', folderId)
          .eq('user_id', userId)
          .single()

        if (!folder) {
          throw new Error('Folder not found or access denied')
        }
      }

      const { error } = await supabase
        .from('projects')
        .update({ folder_id: folderId })
        .eq('id', projectId)
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      logger.info('Project moved to folder:', { projectId, folderId })
    } catch (error: any) {
      logger.error('Error moving project to folder:', error)
      throw error
    }
  }

  async getFolderProjects(folderId: string, userId: string): Promise<any[]> {
    try {
      const { data: projects, error } = await supabase
        .from('projects_with_stats')
        .select('*')
        .eq('folder_id', folderId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return projects || []
    } catch (error: any) {
      logger.error('Error getting folder projects:', error)
      throw error
    }
  }

  private async checkFolderAccess(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase.rpc('user_has_feature', {
        p_user_id: userId,
        p_feature: 'has_folders'
      })

      return data || false
    } catch (error: any) {
      logger.error('Error checking folder access:', error)
      return false
    }
  }

  private buildFolderTree(folders: FolderWithProjects[]): FolderWithProjects[] {
    const folderMap = new Map<string, FolderWithProjects>()
    const rootFolders: FolderWithProjects[] = []

    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, subfolders: [] })
    })

    folders.forEach(folder => {
      const folderWithSubs = folderMap.get(folder.id)!
      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        const parent = folderMap.get(folder.parent_id)!
        parent.subfolders!.push(folderWithSubs)
      } else {
        rootFolders.push(folderWithSubs)
      }
    })

    return rootFolders
  }
}

export default new FolderService()