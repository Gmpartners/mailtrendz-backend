import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import ChatService from '../services/chat.service'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'

class ChatController {

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        })
        return
      }

      const { projectId } = req.params
      const { content } = req.body
      const userId = (req as any).user?.id  // ✅ CORRIGIDO: user.id

      logger.info(`📥 [CHAT] Send message - projectId: ${projectId}, userId: ${userId}`)

      const result = await ChatService.sendMessage(projectId, userId, { content })

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: result
      })

    } catch (error: any) {
      logger.error('❌ [CHAT] Send message error:', {
        error: error.message,
        projectId: req.params.projectId,
        userId: (req as any).user?.id  // ✅ CORRIGIDO
      })
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      })
    }
  }

  async getConversationByProject(req: Request, res: Response): Promise<void> {
    try {
      logger.info('📥 [CHAT] Get conversation by project request:', {
        projectId: req.params.projectId,
        userId: (req as any).user?.id,  // ✅ CORRIGIDO
        headers: {
          authorization: req.headers.authorization ? 'Bearer ***' : 'missing'
        }
      })

      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        logger.error('❌ [CHAT] Validation errors:', errors.array())
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Project ID inválido',
          errors: errors.array()
        })
        return
      }

      const { projectId } = req.params
      const userId = (req as any).user?.id  // ✅ CORRIGIDO: user.id

      if (!userId) {
        logger.error('❌ [CHAT] User ID missing from request')
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Usuário não autenticado'
        })
        return
      }

      logger.info(`🔍 [CHAT] Getting conversation - projectId: ${projectId}, userId: ${userId}`)

      const result = await ChatService.getConversationByProject(projectId, userId)

      logger.info('✅ [CHAT] Conversation retrieved successfully:', {
        conversationId: result.conversation?.id,
        messagesCount: result.conversation?.messages?.length || 0
      })

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      })

    } catch (error: any) {
      logger.error('❌ [CHAT] Get conversation error:', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.projectId,
        userId: (req as any).user?.id  // ✅ CORRIGIDO
      })
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar conversa',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor'
      })
    }
  }

  async getConversationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id  // ✅ CORRIGIDO

      const result = await ChatService.getConversationById(id, userId)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      })

    } catch (error: any) {
      logger.error('Get conversation by id error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      })
    }
  }

  async getUserConversations(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id  // ✅ CORRIGIDO

      const conversations = await ChatService.getUserConversations(userId)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: conversations
      })

    } catch (error: any) {
      logger.error('Get user conversations error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      })
    }
  }

  async updateConversation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id  // ✅ CORRIGIDO
      const updates = req.body

      const result = await ChatService.updateConversation(id, userId, updates)

      if (!result) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Conversa não encontrada'
        })
        return
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      })

    } catch (error: any) {
      logger.error('Update conversation error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      })
    }
  }

  async deleteConversation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id  // ✅ CORRIGIDO

      const deleted = await ChatService.deleteConversation(id, userId)

      if (!deleted) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Conversa não encontrada'
        })
        return
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Conversa deletada com sucesso'
      })

    } catch (error: any) {
      logger.error('Delete conversation error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      })
    }
  }

  async syncProjectSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params

      await ChatService.syncProjectSnapshot(projectId)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Snapshot sincronizado'
      })

    } catch (error: any) {
      logger.error('Sync snapshot error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      })
    }
  }
}

export default new ChatController()