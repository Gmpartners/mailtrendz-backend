import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import StorageService from '../services/storage.service'
import ChatService from '../services/chat.service'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

function getUserToken(req: AuthRequest): string | undefined {
  const authHeader = req.headers.authorization
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
}

class UploadController {
  uploadImage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const { chatId, imageData, fileName, mimeType } = req.body

    if (!imageData || !fileName) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Dados da imagem são obrigatórios'
      })
      return
    }

    try {
      const buffer = Buffer.from(imageData, 'base64')
      
      StorageService.validateImageFile(
        buffer,
        mimeType || 'image/jpeg',
        buffer.length
      )

      const uploadResult = await StorageService.uploadFile(
        buffer,
        fileName,
        {
          originalName: fileName,
          size: buffer.length,
          mimeType: mimeType || 'image/jpeg',
          userId,
          chatId
        }
      )

      if (chatId) {
        try {
          await ChatService.addMessage(chatId, userId, {
            chatId,
            content: `[IMAGEM] ${fileName}`,
            type: 'user'
          }, userToken)
        } catch (error) {
          logger.warn('Failed to add image message to chat:', error)
        }
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Imagem enviada com sucesso',
        data: {
          url: uploadResult.url,
          path: uploadResult.path,
          size: uploadResult.size,
          mimeType: uploadResult.mimeType,
          originalName: fileName
        }
      })

    } catch (error: any) {
      logger.error('Upload image error:', error)
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro no upload da imagem'
      })
    }
  })

  deleteImage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { path } = req.params
    const userId = req.user!.id

    if (!path.startsWith(userId)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Acesso negado a este arquivo'
      })
      return
    }

    try {
      await StorageService.deleteFile(path)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Imagem deletada com sucesso'
      })

    } catch (error: any) {
      logger.error('Delete image error:', error)
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro ao deletar imagem'
      })
    }
  })

  getUserImages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    try {
      const files = await StorageService.getUserFiles(userId)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          files: files.map((file: { name: string; metadata?: { size?: number }; created_at: string }) => ({
            name: file.name,
            size: file.metadata?.size,
            createdAt: file.created_at,
            url: StorageService.getFileUrl(`${userId}/${file.name}`)
          }))
        }
      })

    } catch (error: any) {
      logger.error('Get user images error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar imagens'
      })
    }
  })
}

export default new UploadController()
