import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import ChatService from '../services/chat.service'
import { CreateChatDto, CreateMessageDto } from '../types/chat.types'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'
import { consumeCreditsAfterSuccess } from '../middleware/auth.middleware'
import iaService from '../services/iaservice'
import { supabase } from '../config/supabase.config'
import { logger } from '../utils/logger'

function getUserToken(req: AuthRequest): string | undefined {
  const authHeader = req.headers.authorization
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
}

class ChatController {
  createChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const chatData: CreateChatDto = req.body

    const chat = await ChatService.createChat(userId, chatData, userToken)

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Chat criado com sucesso',
      data: { chat }
    })
  })

  getUserChats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const limit = parseInt(req.query.limit as string) || 50

    const chats = await ChatService.getUserChats(userId, limit, userToken)

    res.json({
      success: true,
      data: { chats }
    })
  })

  getChatById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)

    const chat = await ChatService.getChatById(chatId, userId, userToken)

    res.json({
      success: true,
      data: { chat }
    })
  })

  getChatMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const limit = parseInt(req.query.limit as string) || 100

    const messages = await ChatService.getChatMessages(chatId, userId, limit, userToken)

    res.json({
      success: true,
      data: { messages }
    })
  })

  addMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const messageData: CreateMessageDto = req.body

    const message = await ChatService.addMessage(chatId, userId, messageData, userToken)

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Mensagem adicionada com sucesso',
      data: { message }
    })
  })

  sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const messageData: CreateMessageDto = req.body

    const message = await ChatService.addMessage(chatId, userId, messageData, userToken)

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: { message }
    })
  })

  processMessageWithAI = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const { 
      message, 
      chat_id, 
      project_id, 
      images = [],
      imageUrls = [] 
    } = req.body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Mensagem é obrigatória'
      })
      return
    }

    if (!chat_id || typeof chat_id !== 'string') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Chat ID é obrigatório'
      })
      return
    }

    try {
      await ChatService.getChatById(chat_id, userId, userToken)

      const userMessage = await ChatService.addMessage(chat_id, userId, {
        chatId: chat_id,
        content: message,
        type: 'user'
      }, userToken)

      const processedImages = this.processImages(images.length > 0 ? images : imageUrls)
      const finalImageUrls = processedImages.imageUrls
      const imageIntents = processedImages.imageIntents

      let aiResponse
      let estimatedTokens = 0
      let estimatedCost = 0

      if (!iaService.isEnabled()) {
        aiResponse = {
          response: 'Desculpe, a IA não está disponível no momento. Tente novamente mais tarde.',
          html: '',
          subject: '',
          metadata: {
            service: 'fallback',
            model: 'none',
            processing_time: 0
          }
        }
      } else {
        try {
          const iaRequest = {
            userInput: message,
            imageUrls: finalImageUrls,
            imageIntents: imageIntents,
            context: {
              chat_id,
              project_id,
              isChat: true,
              userId,
              timestamp: new Date().toISOString()
            },
            userId
          }

          const startTime = Date.now()
          aiResponse = await iaService.generateHTML(iaRequest)
          const processingTime = Date.now() - startTime

          estimatedTokens = Math.ceil(message.length / 4)
          estimatedCost = estimatedTokens * 0.000003

          aiResponse.metadata = {
            ...aiResponse.metadata,
            processingTime: processingTime
          }

          logger.info('✅ Chat message processed with AI', {
            userId,
            chatId: chat_id,
            projectId: project_id,
            messageLength: message.length,
            processingTime,
            hasImages: finalImageUrls.length > 0,
            imagesProcessed: aiResponse.metadata.imagesAnalyzed || 0
          })

        } catch (iaError: any) {
          logger.error('❌ Error processing chat message with IA', {
            error: iaError.message,
            userId,
            chatId: chat_id
          })

          aiResponse = {
            response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente reformular ou tente novamente.',
            html: '',
            subject: '',
            metadata: {
              service: 'fallback-error',
              error: iaError.message,
              processing_time: 0
            }
          }
        }
      }

      const aiMessage = await ChatService.addMessage(chat_id, userId, {
        chatId: chat_id,
        content: aiResponse.response,
        type: 'ai'
      }, userToken)

      if (userId) {
        await supabase.rpc('log_api_usage', {
          p_user_id: userId,
          p_endpoint: 'chat_process_ai',
          p_tokens_used: estimatedTokens,
          p_cost: estimatedCost
        })
      }

      const response = {
        success: true,
        message: (aiResponse.metadata.imagesAnalyzed ?? 0) > 0
          ? `Mensagem processada com sucesso! ${aiResponse.metadata.imagesAnalyzed} imagem(ns) analisada(s).`
          : 'Mensagem processada com sucesso via IA',
        data: {
          userMessage,
          aiMessage,
          aiResponse: {
            response: aiResponse.response,
            html: aiResponse.html,
            subject: aiResponse.subject
          },
          suggestions: [
            'Você pode pedir modificações específicas',
            'Use comandos como "mude a cor para azul" ou "adicione um botão"',
            'Para salvar as alterações, peça para "aplicar as mudanças"'
          ]
        },
        metadata: {
          ...aiResponse.metadata,
          chat_id,
          project_id,
          tokens_used: estimatedTokens,
          cost: estimatedCost,
          images_processed: finalImageUrls.length
        }
      }

      res.status(HTTP_STATUS.OK).json(response)

      await consumeCreditsAfterSuccess(req)

    } catch (error: any) {
      logger.error('❌ Error in processMessageWithAI', {
        error: error.message,
        userId,
        chatId: chat_id,
        projectId: project_id
      })

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao processar mensagem com IA',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível'
      })
    }
  })

  private processImages(images: any[]) {
    const imageUrls: string[] = []
    const imageIntents: Array<{ url: string; intent: 'analyze' | 'include' }> = []
    
    if (Array.isArray(images)) {
      images.forEach(image => {
        if (typeof image === 'string') {
          imageUrls.push(image)
          imageIntents.push({ url: image, intent: 'include' })
        } else if (image && typeof image === 'object') {
          if (image.uploadUrl) {
            imageUrls.push(image.uploadUrl)
            imageIntents.push({ 
              url: image.uploadUrl, 
              intent: image.intent || 'include' 
            })
          } else if (image.url) {
            imageUrls.push(image.url)
            imageIntents.push({ 
              url: image.url, 
              intent: image.intent || 'include' 
            })
          }
        }
      })
    }
    
    return { imageUrls, imageIntents }
  }

  updateChatTitle = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const { title } = req.body

    const chat = await ChatService.updateChatTitle(chatId, userId, title, userToken)

    res.json({
      success: true,
      message: 'Título atualizado com sucesso',
      data: { chat }
    })
  })

  deleteChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)

    await ChatService.deleteChat(chatId, userId, userToken)

    res.json({
      success: true,
      message: 'Chat deletado com sucesso'
    })
  })

  archiveChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)

    const chat = await ChatService.archiveChat(chatId, userId, userToken)

    res.json({
      success: true,
      message: 'Chat arquivado com sucesso',
      data: { chat }
    })
  })

  searchChats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const query = req.query.q as string

    if (!query) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Query de busca é obrigatória'
      })
      return
    }

    const chats = await ChatService.searchChats(userId, query, userToken)

    res.json({
      success: true,
      data: { chats }
    })
  })

  getChatStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)

    const stats = await ChatService.getChatStats(userId, userToken)

    res.json({
      success: true,
      data: { stats }
    })
  })

  getConversationByProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId
    const userId = req.user!.id
    const userToken = getUserToken(req)

    let chat = await ChatService.getChatByProjectId(projectId, userId, userToken)

    if (!chat) {
      chat = await ChatService.createChat(userId, {
        title: 'Conversa do Projeto',
        projectId: projectId,
        context: {
          projectId: projectId,
          source: 'project-builder'
        }
      }, userToken)
    }

    res.json({
      success: true,
      data: { conversation: chat }
    })
  })

  getConversationById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const conversationId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)

    const chat = await ChatService.getChatById(conversationId, userId, userToken)

    res.json({
      success: true,
      data: { conversation: chat }
    })
  })

  getUserConversations = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const limit = parseInt(req.query.limit as string) || 50

    const chats = await ChatService.getUserChats(userId, limit, userToken)

    res.json({
      success: true,
      data: { conversations: chats }
    })
  })

  updateConversation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const conversationId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const { title } = req.body

    const chat = await ChatService.updateChatTitle(conversationId, userId, title, userToken)

    res.json({
      success: true,
      message: 'Conversa atualizada com sucesso',
      data: { conversation: chat }
    })
  })

  deleteConversation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const conversationId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)

    await ChatService.deleteChat(conversationId, userId, userToken)

    res.json({
      success: true,
      message: 'Conversa deletada com sucesso'
    })
  })
}

export default new ChatController()