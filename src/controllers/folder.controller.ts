import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import FolderService from '../services/folder.service'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

class FolderController {
  createFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { name, color, parent_id } = req.body

    if (!name || name.trim() === '') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Nome da pasta é obrigatório'
      })
      return
    }

    try {
      const folder = await FolderService.createFolder(
        userId,
        name.trim(),
        color,
        parent_id
      )

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Pasta criada com sucesso',
        data: { folder }
      })
    } catch (error: any) {
      if (error.message.includes('does not include folders')) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: 'Seu plano não inclui o recurso de pastas'
        })
        return
      }

      logger.error('Create folder error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao criar pasta'
      })
    }
  })

  updateFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const folderId = req.params.id
    const { name, color, parent_id } = req.body

    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (color !== undefined) updates.color = color
    if (parent_id !== undefined) updates.parent_id = parent_id

    if (Object.keys(updates).length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Nenhuma atualização fornecida'
      })
      return
    }

    try {
      const folder = await FolderService.updateFolder(
        folderId,
        userId,
        updates
      )

      res.json({
        success: true,
        message: 'Pasta atualizada com sucesso',
        data: { folder }
      })
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Pasta não encontrada'
        })
        return
      }

      logger.error('Update folder error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao atualizar pasta'
      })
    }
  })

  deleteFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const folderId = req.params.id

    try {
      await FolderService.deleteFolder(folderId, userId)

      res.json({
        success: true,
        message: 'Pasta deletada com sucesso'
      })
    } catch (error: any) {
      logger.error('Delete folder error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao deletar pasta'
      })
    }
  })

  getFolders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    try {
      const folders = await FolderService.getFolders(userId)

      res.json({
        success: true,
        data: { folders }
      })
    } catch (error: any) {
      logger.error('Get folders error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar pastas'
      })
    }
  })

  moveProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { projectId, folderId } = req.body

    if (!projectId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Project ID é obrigatório'
      })
      return
    }

    try {
      await FolderService.moveProjectToFolder(
        projectId,
        folderId,
        userId
      )

      res.json({
        success: true,
        message: folderId 
          ? 'Projeto movido para a pasta com sucesso'
          : 'Projeto removido da pasta com sucesso'
      })
    } catch (error: any) {
      if (error.message.includes('does not include folders')) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: 'Seu plano não inclui o recurso de pastas'
        })
        return
      }

      if (error.message.includes('not found')) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Pasta não encontrada'
        })
        return
      }

      logger.error('Move project error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao mover projeto'
      })
    }
  })

  getFolderProjects = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const folderId = req.params.id

    try {
      const projects = await FolderService.getFolderProjects(folderId, userId)

      res.json({
        success: true,
        data: { projects }
      })
    } catch (error: any) {
      logger.error('Get folder projects error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar projetos da pasta'
      })
    }
  })
}

export default new FolderController()