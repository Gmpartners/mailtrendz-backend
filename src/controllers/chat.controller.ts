import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import ChatService from '../services/chat.service'
import { CreateChatDto, CreateMessageDto } from '../types/chat.types'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'

// ✅ FUNÇÃO AUXILIAR - Extrair token do request
function getUserToken(req: AuthRequest): string | undefined {
  const authHeader = req.headers.authorization
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
}

class ChatController {
  createChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const chatData: CreateChatDto = req.body

    // ✅ PASSAR TOKEN PARA O SERVICE
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

    // ✅ PASSAR TOKEN PARA O SERVICE
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

    // ✅ PASSAR TOKEN PARA O SERVICE
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

    // ✅ PASSAR TOKEN PARA O SERVICE
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

    // ✅ PASSAR TOKEN PARA O SERVICE
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

    // ✅ PASSAR TOKEN PARA O SERVICE
    const message = await ChatService.addMessage(chatId, userId, messageData, userToken)

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: { message }
    })
  })

  updateChatTitle = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = req.params.id
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const { title } = req.body

    // ✅ PASSAR TOKEN PARA O SERVICE
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

    // ✅ PASSAR TOKEN PARA O SERVICE
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

    // ✅ PASSAR TOKEN PARA O SERVICE
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

    // ✅ PASSAR TOKEN PARA O SERVICE
    const chats = await ChatService.searchChats(userId, query, userToken)

    res.json({
      success: true,
      data: { chats }
    })
  })

  getChatStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)

    // ✅ PASSAR TOKEN PARA O SERVICE
    const stats = await ChatService.getChatStats(userId, userToken)

    res.json({
      success: true,
      data: { stats }
    })
  })

  // Métodos adicionais para compatibilidade com rotas
  getConversationByProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId
    const userId = req.user!.id
    const userToken = getUserToken(req)

    // ✅ PASSAR TOKEN PARA O SERVICE
    let chat = await ChatService.getChatByProjectId(projectId, userId, userToken)

    // Se não existe chat para este projeto, criar um novo
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

    // ✅ PASSAR TOKEN PARA O SERVICE
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

    // ✅ PASSAR TOKEN PARA O SERVICE
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

    // ✅ PASSAR TOKEN PARA O SERVICE
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

    // ✅ PASSAR TOKEN PARA O SERVICE
    await ChatService.deleteChat(conversationId, userId, userToken)

    res.json({
      success: true,
      message: 'Conversa deletada com sucesso'
    })
  })
}

export default new ChatController()