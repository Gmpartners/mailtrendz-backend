import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import FolderService from '../services/folder.service'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'
import { logger } from '../utils/logger'
import { 
  validateFolderName, 
  validateFolderColor
} from '../utils/folder.validation'

class FolderController {
  
  getFolders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    try {
      const folders = await FolderService.getFolders(userId)

      res.json({
        success: true,
        data: folders
      })
    } catch (error: any) {
      logger.error('Get folders error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro ao buscar pastas'
      })
    }
  })

  createFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { name, color, parent_id } = req.body

    const errors: Record<string, string> = {}
    
    if (!name || !name.trim()) {
      errors.name = 'Nome da pasta é obrigatório'
    } else if (!validateFolderName(name)) {
      errors.name = 'Nome contém caracteres inválidos ou é muito longo'
    }
    
    if (color && !validateFolderColor(color)) {
      errors.color = 'Cor inválida selecionada'
    }

    if (Object.keys(errors).length > 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Dados inválidos',
        errors
      })
      return
    }

    try {
      const folder = await FolderService.createFolder(
        userId,
        name.trim(),
        color,
        parent_id || undefined
      )

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Pasta criada com sucesso',
        data: { folder }
      })
    } catch (error: any) {
      logger.error('Create folder error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro ao criar pasta'
      })
    }
  })

  updateFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const folderId = req.params.id
    const { name, color, parent_id } = req.body

    const errors: Record<string, string> = {}
    const updates: any = {}
    
    if (name !== undefined) {
      if (!validateFolderName(name)) {
        errors.name = 'Nome contém caracteres inválidos ou é muito longo'
      } else {
        updates.name = name.trim()
      }
    }
    
    if (color !== undefined) {
      if (!validateFolderColor(color)) {
        errors.color = 'Cor inválida selecionada'
      } else {
        updates.color = color
      }
    }
    
    if (parent_id !== undefined) {
      updates.parent_id = parent_id
    }

    if (Object.keys(errors).length > 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Dados inválidos',
        errors
      })
      return
    }

    if (Object.keys(updates).length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Nenhuma atualização fornecida'
      })
      return
    }

    try {
      const folder = await FolderService.updateFolder(userId, folderId, updates)

      res.json({
        success: true,
        message: 'Pasta atualizada com sucesso',
        data: { folder }
      })
    } catch (error: any) {
      logger.error('Update folder error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro ao atualizar pasta'
      })
    }
  })

  deleteFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const folderId = req.params.id

    try {
      await FolderService.deleteFolder(userId, folderId)

      res.json({
        success: true,
        message: 'Pasta excluída com sucesso'
      })
    } catch (error: any) {
      logger.error('Delete folder error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro ao excluir pasta'
      })
    }
  })

  moveProjectToFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { projectId, folderId } = req.body

    if (!projectId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'ID do projeto é obrigatório'
      })
      return
    }

    try {
      await FolderService.moveProjectToFolder(userId, projectId, folderId)

      res.json({
        success: true,
        message: 'Projeto movido com sucesso'
      })
    } catch (error: any) {
      logger.error('Move project to folder error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro ao mover projeto'
      })
    }
  })

  getFolderStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    try {
      const folders = await FolderService.getFolders(userId)
      const totalProjects = folders.reduce((sum, folder) => sum + (folder.projects_count || 0), 0)

      res.json({
        success: true,
        data: {
          totalFolders: folders.length,
          totalProjects
        }
      })
    } catch (error: any) {
      logger.error('Get folder stats error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro ao buscar estatísticas'
      })
    }
  })


  updateFolderColor = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const folderId = req.params.id
    const { color } = req.body

    if (!color || !validateFolderColor(color)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Cor inválida'
      })
      return
    }

    try {
      const folder = await FolderService.updateFolder(userId, folderId, { color })

      res.json({
        success: true,
        message: 'Cor da pasta atualizada com sucesso',
        data: { folder }
      })
    } catch (error: any) {
      logger.error('Update folder color error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro ao atualizar cor da pasta'
      })
    }
  })

}

export default new FolderController()