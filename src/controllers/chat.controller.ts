import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import ChatService from '../services/chat.service'
import ProjectService from '../services/project.service'
import { CreateChatDto, CreateMessageDto } from '../types/chat.types'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'
import iaService from '../services/iaservice'
import { logger } from '../utils/logger'
import { processImages } from '../utils/email-helpers'

function getUserToken(req: AuthRequest): string | undefined {
  const authHeader = req.headers.authorization
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
}

class ChatController {
  createChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const userToken = getUserToken(req)
    const chatData: CreateChatDto = req.body

    logger.info('🆕 Requisição de criação de chat recebida', {
      userId,
      projectId: chatData.projectId,
      title: chatData.title,
      hasUserToken: !!userToken,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    })

    try {
      const chat = await ChatService.createChat(userId, chatData, userToken)

      // ✅ CORRIGIDO: Verificar se created_at e updated_at não são null
      const createdAt = chat.created_at ? new Date(chat.created_at).getTime() : Date.now()
      const updatedAt = chat.updated_at ? new Date(chat.updated_at).getTime() : Date.now()
      const isNewChat = createdAt === updatedAt
      
      logger.info('✅ Chat processado com sucesso', {
        chatId: chat.id,
        userId,
        projectId: chatData.projectId,
        isNewChat,
        title: chat.title,
        responseType: isNewChat ? 'created' : 'existing_returned'
      })

      res.status(isNewChat ? HTTP_STATUS.CREATED : HTTP_STATUS.OK).json({
        success: true,
        message: isNewChat ? 'Chat criado com sucesso' : 'Chat existente retornado',
        data: { 
          chat,
          meta: {
            isNewChat,
            action: isNewChat ? 'created' : 'retrieved_existing'
          }
        }
      })
    } catch (error: any) {
      logger.error('❌ Erro na criação/busca de chat', {
        error: error.message,
        errorType: error.constructor.name,
        userId,
        projectId: chatData.projectId,
        title: chatData.title,
        statusCode: error.statusCode || 500,
        stack: error.stack
      })
      
      const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
      const message = error.statusCode === HTTP_STATUS.CONFLICT 
        ? 'Chat já existe para este projeto' 
        : 'Erro ao processar chat'
      
      res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno',
        code: error.statusCode === HTTP_STATUS.CONFLICT ? 'CHAT_EXISTS' : 'CHAT_ERROR'
      })
    }
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

      const processedImages = processImages(images.length > 0 ? images : imageUrls)
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
          // 🔥 BUSCAR CONTEXTO COMPLETO DO PROJETO
          const [chatHistory, currentProject] = await Promise.all([
            ChatService.getChatMessages(chat_id, userId, 15, userToken),
            project_id ? ProjectService.findById(project_id, userId, userToken) : null
          ])

          // 🔥 DETECTAR TIPO DE OPERAÇÃO
          const hasExistingHTML = !!(currentProject?.content?.html)
          const messageKeywords = ['altere', 'mude', 'modifique', 'ajuste', 'atualize', 'corrija', 'troque', 'substitua', 'melhore']
          const isModificationRequest = hasExistingHTML && 
            messageKeywords.some(keyword => 
              message.toLowerCase().includes(keyword.toLowerCase())
            )

          // 🔥 PREPARAR CONTEXTO COMPLETO PARA IA
          const iaRequest = {
            userInput: message,
            imageUrls: finalImageUrls,
            imageIntents: imageIntents,
            context: {
              chat_id,
              project_id,
              isChat: true,
              userId,
              timestamp: new Date().toISOString(),
              
              // 🚨 CONTEXTO CRÍTICO COM EVOLUÇÃO HTML
              existingHTML: currentProject?.content?.html || '',
              isModification: isModificationRequest,
              
              // ✨ EVOLUÇÃO DO HTML ATRAVÉS DAS CONVERSAS
              htmlEvolution: {
                current: currentProject?.content?.html || '',
                hasEvolved: chatHistory.length > 2,
                previousVersions: chatHistory
                  .filter(msg => {
                    if (msg.role !== 'ai' || !msg.metadata) return false
                    const metadata = msg.metadata as any
                    return metadata.htmlGenerated && typeof metadata.htmlGenerated === 'string'
                  })
                  .map(msg => ({
                    timestamp: msg.created_at,
                    html: (msg.metadata as any).htmlGenerated,
                    messageId: msg.id
                  }))
                  .slice(-3), // Últimas 3 versões para contexto
                modificationCount: chatHistory.filter(msg => 
                  msg.role === 'user' && 
                  ['altere', 'mude', 'modifique', 'change', 'update', 'edit'].some(keyword => 
                    msg.content.toLowerCase().includes(keyword)
                  )
                ).length
              },
              
              // 🚨 CONTEXTO DO PROJETO
              projectContext: currentProject ? {
                name: currentProject.name,
                description: currentProject.description,
                type: currentProject.type,
                status: currentProject.status,
                subject: currentProject.content?.subject || '',
                metadata: currentProject.metadata || {},
                createdAt: currentProject.created_at,
                updatedAt: currentProject.updated_at
              } : null,
              
              // 🚨 HISTÓRICO DO CHAT
              chatHistory: chatHistory.slice(-8).map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.created_at,
                id: msg.id
              }))
            },
            userId
          }

          // 🔥 LOG DETALHADO PARA DEBUG
          logger.info('🔥 CONTEXTO COMPLETO ENVIADO PARA IA', {
            userId,
            chatId: chat_id,
            projectId: project_id,
            projectName: currentProject?.name,
            hasExistingHTML,
            htmlLength: currentProject?.content?.html?.length || 0,
            isModificationRequest,
            messageKeywords: messageKeywords.filter(k => message.toLowerCase().includes(k)),
            historyCount: chatHistory.length,
            recentHistory: chatHistory.slice(-3).map(m => `${m.role}: ${m.content.substring(0, 50)}...`)
          })

          const startTime = Date.now()
          aiResponse = await iaService.generateHTML(iaRequest)
          const processingTime = Date.now() - startTime

          // 🔥 VALIDAR RESPOSTA DA IA
          if (!aiResponse || !aiResponse.response) {
            throw new Error('Resposta inválida da IA')
          }

          // 🔥 LOG DA RESPOSTA
          logger.info('✅ RESPOSTA DA IA PROCESSADA', {
            userId,
            chatId: chat_id,
            projectId: project_id,
            hasHtml: !!aiResponse.html,
            htmlLength: aiResponse.html?.length || 0,
            responsePreview: aiResponse.response.substring(0, 100),
            processingTime,
            model: aiResponse.metadata?.model || 'unknown'
          })

          estimatedTokens = Math.ceil(message.length / 4)
          estimatedCost = estimatedTokens * 0.000003

          aiResponse.metadata = {
            ...aiResponse.metadata,
            processingTime: processingTime
          }

        } catch (iaError: any) {
          logger.error('❌ ERRO NO PROCESSAMENTO DA IA', {
            error: iaError.message,
            stack: iaError.stack,
            userId,
            chatId: chat_id,
            projectId: project_id,
            messageLength: message.length
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

      // ❌ REMOVIDO: Duplo logging - já é feito pelo middleware logAPIUsage

      // 🔄 BUSCAR HISTÓRICO COMPLETO PARA SINCRONIZAÇÃO FRONTEND
      const updatedChatHistory = await ChatService.getChatMessages(chat_id, userId, 50, userToken)

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
          // ✨ ADICIONANDO HISTÓRICO COMPLETO PARA SINCRONIZAÇÃO
          chatHistory: updatedChatHistory,
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
          images_processed: finalImageUrls.length,
          chat_message_count: updatedChatHistory.length
        }
      }

      res.status(HTTP_STATUS.OK).json(response)

      // ✅ CRÉDITOS CONSUMIDOS AUTOMATICAMENTE PELO MIDDLEWARE

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

    try {
      logger.info('🔍 Buscando conversa do projeto', {
        projectId,
        userId,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      })

      // 🔥 BUSCAR CHAT EXISTENTE PRIMEIRO (sempre)
      let chat = await ChatService.getChatByProjectId(projectId, userId, userToken)
      let messages: any[] = []

      if (!chat) {
        // 🔥 BUSCAR DADOS DO PROJETO PARA CRIAR CHAT ADEQUADO
        const project = await ProjectService.findById(projectId, userId, userToken)
        
        logger.info('🆕 Criando novo chat para projeto', {
          projectId,
          projectName: project.name,
          projectType: project.type,
          userId
        })
        
        chat = await ChatService.createChat(userId, {
          title: `Chat - ${project.name}`,
          projectId: projectId,
          context: {
            source: 'project-builder',
            projectId: projectId,
            projectName: project.name,
            projectType: project.type,
            createdBy: 'getConversationByProject',
            timestamp: new Date().toISOString()
          }
        }, userToken)
        
        logger.info('✅ Novo chat criado para projeto', {
          chatId: chat.id,
          projectId,
          userId,
          title: chat.title
        })
      } else {
        // 🔥 BUSCAR MENSAGENS DO CHAT EXISTENTE
        messages = await ChatService.getChatMessages(chat.id, userId, 50, userToken)
        
        logger.info('📜 Mensagens do chat carregadas', {
          chatId: chat.id,
          projectId,
          userId,
          messageCount: messages.length,
          hasMessages: messages.length > 0,
          firstMessageDate: messages[0]?.created_at,
          lastMessageDate: messages[messages.length - 1]?.created_at
        })
      }

      // 🔥 RESPOSTA PADRONIZADA COM METADADOS
      const response = {
        success: true,
        data: { 
          conversation: chat,
          messages: messages || [],
          meta: {
            chatId: chat.id,
            projectId,
            userId,
            messageCount: messages.length,
            chatCreatedAt: chat.created_at,
            chatUpdatedAt: chat.updated_at,
            hasExistingMessages: messages.length > 0,
            isNewChat: messages.length === 0
          }
        }
      }

      logger.info('✅ Conversa do projeto retornada com sucesso', {
        chatId: chat.id,
        projectId,
        userId,
        messageCount: messages.length,
        isNewChat: messages.length === 0
      })

      res.json(response)
      
    } catch (error: any) {
      logger.error('❌ Erro ao buscar/criar conversa do projeto', {
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        projectId,
        userId,
        statusCode: error.statusCode || 500
      })
      
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar conversa do projeto',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor',
        code: 'CONVERSATION_ERROR',
        meta: {
          projectId,
          userId,
          timestamp: new Date().toISOString()
        }
      })
    }
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

  getChatHealth = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    try {
      // ✅ TEMPORÁRIO: ChatHealthMonitor desabilitado durante migração
      const healthCheck = { status: 'ok', message: 'Health check temporariamente desabilitado' }
      
      res.json({
        success: true,
        data: healthCheck
      })
    } catch (error: any) {
      logger.error('Erro no health check de chat', {
        error: error.message,
        userId
      })
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao verificar saúde dos chats'
      })
    }
  })
}

export default new ChatController()