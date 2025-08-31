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
      imageUrls = [],
      // ✨ NOVOS CAMPOS DA ARQUITETURA INTELIGENTE
      operation = 'analyze', // 'create' | 'edit' | 'analyze'
      context = {}
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
      let aiMessageResult

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
        // 🔥 BUSCAR CONTEXTO COMPLETO DO CHAT E HTML CORRETO
          const [chatHistory, existingHTML] = await Promise.all([
            ChatService.getChatMessages(chat_id, userId, 15, userToken),
            // 🚨 CORREÇÃO CRÍTICA: Usar novo método robusto
            ChatService.getLatestHTMLContent(chat_id, userId)
          ])

          // 🎯 DETECÇÃO PRECISA DE OPERAÇÃO (método otimizado)
          const operationResult = this.detectOperation(message, existingHTML, operation, context)
          const finalOperation = operationResult.operation
          const hasExistingHTML = operationResult.hasHTML
          const shouldPreserveStructure = operationResult.preserveStructure
          
          logger.info('🎯 OPERAÇÃO DETECTADA', {
            userId,
            chatId: chat_id,
            originalMessage: message.substring(0, 100),
            detectedOperation: finalOperation,
            hasExistingHTML,
            htmlLength: existingHTML?.length || 0,
            frontendOperation: operation,
            shouldPreserveStructure,
            hasTargetElement: !!context.targetElement,
            confidence: operationResult.confidence
          })

          // 🔥 PREPARAR CONTEXTO COMPLETO PARA IA
          const iaRequest = {
            userInput: message,
            imageUrls: finalImageUrls,
            imageIntents: imageIntents,
            // ✨ NOVA ARQUITETURA: Operação e contexto específicos
            operation: finalOperation,
            editContext: {
              currentHtml: context.currentHtml || existingHTML || '',
              targetElement: context.targetElement || null,
              preserveStructure: shouldPreserveStructure,
              priority: context.priority || 'balanced'
            },
            context: {
              chat_id,
              project_id,
              isChat: true,
              userId,
              timestamp: new Date().toISOString(),
              
              // ✨ CONTEXTO INTELIGENTE COM DETALHES PRECISOS
              existingHTML: context.currentHtml || existingHTML || '',
              isModification: finalOperation === 'edit',
              operation: finalOperation,
              preserveHtmlStructure: shouldPreserveStructure,
              htmlVersion: existingHTML ? 'existing' : 'new',
              
              // ✨ EVOLUÇÃO DO HTML ATRAVÉS DAS CONVERSAS
              htmlEvolution: {
                current: existingHTML || '',
                hasEvolved: chatHistory.length > 2,
                previousVersions: chatHistory
                  .filter((msg: any) => {
                    if (msg.role !== 'ai' || !msg.content) return false
                    // Buscar HTML no conteúdo da mensagem ou nos artifacts
                    const hasHTML = msg.content.includes('<html') || 
                                   msg.content.includes('<!DOCTYPE') ||
                                   (msg.metadata && JSON.stringify(msg.metadata).includes('<html'))
                    return hasHTML
                  })
                  .map((msg: any) => ({
                    timestamp: msg.created_at,
                    html: this.extractHTMLFromMessage(msg.content, msg.metadata),
                    messageId: msg.id
                  }))
                  .slice(-3), // Últimas 3 versões para contexto
                modificationCount: chatHistory.filter((msg: any) => 
                  msg.role === 'user' && 
                  this.containsEditKeywords(msg.content)
                ).length
              },
              
              // 🚨 CONTEXTO SIMPLIFICADO DO CHAT (sem dependência de projects)
              chatContext: {
                id: chat_id,
                project_id: project_id || null,
                messageCount: chatHistory.length,
                hasExistingContent: hasExistingHTML,
                lastActivity: new Date().toISOString()
              },
              
              // 🚨 HISTÓRICO DO CHAT
              chatHistory: chatHistory.slice(-8).map((msg: any) => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.created_at,
                id: msg.id
              }))
            },
            userId
          }

          // ✨ LOG ULTRA-DETALHADO PARA DEBUG COMPLETO
          logger.info('🚀 ENVIANDO CONTEXTO OTIMIZADO PARA IA', {
            // Identificação
            userId,
            chatId: chat_id,
            projectId: project_id,
            timestamp: new Date().toISOString(),
            
            // Operação detectada
            operation: {
              detected: finalOperation,
              confidence: operationResult.confidence,
              frontend: operation,
              shouldPreserveStructure,
              reasons: {
                hasHTML: hasExistingHTML,
                hasTargetElement: !!context.targetElement,
                containsEditKeywords: this.containsEditKeywords(message)
              }
            },
            
            // HTML Analysis
            html: {
              exists: hasExistingHTML,
              length: existingHTML?.length || 0,
              source: context.currentHtml ? 'frontend' : 'backend',
              valid: existingHTML ? existingHTML.includes('<html') || existingHTML.includes('<!DOCTYPE') : false,
              preview: existingHTML ? existingHTML.substring(0, 150) + '...' : null
            },
            
            // Context Analysis
            context: {
              hasTargetElement: !!context.targetElement,
              elementType: context.targetElement?.elementType,
              originalText: context.targetElement?.originalText?.substring(0, 50),
              newText: context.targetElement?.newText?.substring(0, 50),
              priority: context.priority || 'balanced',
              preserveStructure: context.preserveStructure !== false
            },
            
            // Chat Analysis
            chat: {
              messageCount: chatHistory.length,
              hasImages: finalImageUrls.length > 0,
              imageCount: finalImageUrls.length,
              lastActivity: chatHistory[chatHistory.length - 1]?.created_at
            },
            
            // Message Analysis
            message: {
              length: message.length,
              preview: message.substring(0, 100),
              language: message.match(/[a-zA-Z]/) ? 'latin' : 'other',
              hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(message)
            }
          })

          const startTime = Date.now()
          // ✨ CHAMADA OTIMIZADA DA IA COM CONTEXTO ESPECÍFICO
          aiResponse = await iaService.generateHTML(iaRequest)
          const processingTime = Date.now() - startTime

          // 🚨 SALVAR MENSAGEM COM HTML EM METADATA
          aiMessageResult = await ChatService.addMessage(chat_id, userId, {
            chatId: chat_id,
            content: aiResponse.response,
            type: 'assistant',
            metadata: {
              model: aiResponse.metadata?.model,
              processingTime: aiResponse.metadata?.processingTime,
              isModification: !!(existingHTML && existingHTML.length > 0),
              preservedFromPrevious: finalOperation === 'edit' && !!existingHTML,
              // 🔥 SALVAR HTML EM METADATA
              artifacts: aiResponse.html ? {
                type: 'html',
                content: aiResponse.html
              } : null,
              subject: aiResponse.subject
            }
          }, userToken)

          // 🔥 VALIDAR RESPOSTA DA IA
          if (!aiResponse || !aiResponse.response) {
            throw new Error('Resposta inválida da IA')
          }

          // 🔥 LOG COMPLETO DA RESPOSTA DA IA
          logger.info('✅ RESPOSTA DA IA PROCESSADA COM SUCESSO', {
            // Identificação
            userId,
            chatId: chat_id,
            projectId: project_id,
            timestamp: new Date().toISOString(),
            
            // Performance
            timing: {
              processingTime,
              model: aiResponse.metadata?.model || 'unknown',
              startTime: new Date(Date.now() - processingTime).toISOString()
            },
            
            // HTML Analysis da Resposta
            html: {
              generated: !!aiResponse.html,
              length: aiResponse.html?.length || 0,
              valid: aiResponse.html ? (aiResponse.html.includes('<html') || aiResponse.html.includes('<!DOCTYPE')) : false,
              preview: aiResponse.html ? aiResponse.html.substring(0, 200) + '...' : null,
              hasCSS: aiResponse.html ? aiResponse.html.includes('<style') : false,
              hasBody: aiResponse.html ? aiResponse.html.includes('<body') : false
            },
            
            // Response Analysis
            response: {
              hasResponse: !!aiResponse.response,
              length: aiResponse.response?.length || 0,
              preview: aiResponse.response?.substring(0, 150) || 'No response text',
              isEmpty: !aiResponse.response || aiResponse.response.trim().length === 0
            },
            
            // Subject Analysis
            subject: {
              generated: !!aiResponse.subject,
              value: aiResponse.subject || 'No subject generated',
              length: aiResponse.subject?.length || 0
            },
            
            // Metadata Analysis
            metadata: {
              isGenerated: aiResponse.metadata?.isGenerated,
              service: aiResponse.metadata?.service,
              imagesAnalyzed: aiResponse.metadata?.imagesAnalyzed || 0,
              hasMetadata: !!aiResponse.metadata
            },
            
            // Quality Check
            quality: {
              htmlAndResponseMatch: finalOperation === 'edit' ? 
                (!!aiResponse.html && hasExistingHTML) : true,
              expectedOperation: finalOperation,
              deliveredContent: !!aiResponse.html ? 'html' : 'text_only'
            }
          })

          estimatedTokens = Math.ceil(message.length / 4)
          estimatedCost = estimatedTokens * 0.000003

          aiResponse.metadata = {
            ...aiResponse.metadata,
            processingTime: processingTime
          }

        }

        // 🔄 BUSCAR HISTÓRICO COMPLETO PARA SINCRONIZAÇÃO FRONTEND
        const updatedChatHistory = await ChatService.getChatMessages(chat_id, userId, 50, userToken)

        const response = {
        success: true,
        message: (aiResponse.metadata.imagesAnalyzed ?? 0) > 0
          ? `Mensagem processada com sucesso! ${aiResponse.metadata.imagesAnalyzed} imagem(ns) analisada(s).`
          : 'Mensagem processada com sucesso via IA',
        data: {
          userMessage,
          aiMessage: aiMessageResult || null,
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

  // 🚨 IMPLEMENTAÇÃO OTIMIZADA: Usar função SQL para buscar HTML
  public async getLatestHTMLFromMessagesOptimized(chatId: string, userToken?: string): Promise<string | null> {
    try {
      const supabase = require('../config/supabase.config').getSupabaseWithAuth(userToken)
      
      logger.info('🔍 Buscando HTML usando função SQL otimizada', { chatId })
      
      // Usar função SQL otimizada
      const { data, error } = await supabase.rpc('get_latest_html_from_chat', {
        p_chat_id: chatId
      })
      
      if (error) {
        logger.error('❌ Erro ao buscar HTML via RPC:', { error: error.message, chatId })
        return await this.getLatestHTMLFromMessagesFallback(chatId, userToken)
      }
      
      if (data && typeof data === 'string' && data.length > 0) {
        logger.info('✅ HTML encontrado via RPC otimizada', {
          chatId,
          htmlLength: data.length
        })
        return data
      }
      
      logger.info('ℹ️ Nenhum HTML encontrado via RPC, tentando fallback', { chatId })
      return await this.getLatestHTMLFromMessagesFallback(chatId, userToken)
      
    } catch (error: any) {
      logger.error('❌ Erro na busca otimizada, usando fallback', {
        chatId,
        error: error.message
      })
      return await this.getLatestHTMLFromMessagesFallback(chatId, userToken)
    }
  }

  // 🚨 MÉTODO DE FALLBACK: Buscar HTML da tabela chat_messages diretamente
  private async getLatestHTMLFromMessagesFallback(chatId: string, userToken?: string): Promise<string | null> {
    try {
      const supabase = require('../config/supabase.config').getSupabaseWithAuth(userToken)
      
      logger.info('🔍 Buscando HTML na tabela messages', { chatId })
      
      // Buscar mensagens que contenham HTML nos artifacts
      const { data: messages, error } = await (supabase as any)
        .from('chat_messages')
        .select('id, content, metadata, created_at, role')
        .eq('chat_id', chatId)
        .eq('role', 'assistant')
        .not('metadata', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) {
        logger.error('❌ Erro ao buscar messages:', { error: error.message, chatId })
        return null
      }
      
      if (!messages || messages.length === 0) {
        logger.info('ℹ️ Nenhuma mensagem com artifacts encontrada', { chatId })
        return null
      }
      
      // Procurar HTML nos metadata (mais recente primeiro)
      for (const message of messages) {
        const htmlContent = this.extractHTMLFromArtifacts(message.metadata)
        if (htmlContent) {
          logger.info('✅ HTML encontrado nos metadata', {
            chatId,
            messageId: message.id,
            htmlLength: htmlContent.length,
            timestamp: message.created_at
          })
          return htmlContent
        }
      }
      
      logger.info('ℹ️ Nenhum HTML encontrado nos artifacts', { chatId, messagesChecked: messages.length })
      return null
      
    } catch (error: any) {
      logger.error('❌ Erro ao buscar HTML das messages', {
        chatId,
        error: error.message,
        stack: error.stack
      })
      return null
    }
  }

  // 🚨 NOVA FUNÇÃO: Extrair HTML corretamente dos artifacts
  private extractHTMLFromArtifacts(artifacts: any): string | null {
    if (!artifacts) {
      return null
    }
    
    try {
      // 🔧 CORRÇÃO: Caso 1 - artifacts é um objeto direto com content (aceita type text também)
      if (artifacts.content && (artifacts.type === 'html' || artifacts.type === 'text')) {
        const content = artifacts.content
        if (content.includes('<html') || content.includes('<!DOCTYPE') || content.includes('<body')) {
          return content
        }
      }
      
      // 🔧 CORREÇÃO: Caso 2 - artifacts é um array de objetos (aceita type text também)
      if (Array.isArray(artifacts)) {
        for (const artifact of artifacts) {
          if (artifact.content && (artifact.type === 'html' || artifact.type === 'text')) {
            const content = artifact.content
            if (content.includes('<html') || content.includes('<!DOCTYPE') || content.includes('<body')) {
              return content
            }
          }
        }
      }
      
      // Caso 3: buscar HTML em qualquer lugar do artifacts (string search)
      const artifactsStr = JSON.stringify(artifacts)
      const htmlMatch = artifactsStr.match(/<html[\s\S]*?<\/html>/i)
      if (htmlMatch) {
        // Decodificar possíveis escapes JSON
        return htmlMatch[0].replace(/\\"/g, '"').replace(/\\n/g, '\n')
      }
      
      // Caso 4: buscar por DOCTYPE HTML
      const doctypeMatch = artifactsStr.match(/<!DOCTYPE html[\s\S]*?<\/html>/i)
      if (doctypeMatch) {
        return doctypeMatch[0].replace(/\\"/g, '"').replace(/\\n/g, '\n')
      }
      
      return null
      
    } catch (error: any) {
      logger.error('❌ Erro ao extrair HTML dos artifacts', {
        error: error.message,
        artifactsType: typeof artifacts
      })
      return null
    }
  }
  

  // ✅ ENDPOINT ESPECÍFICO: Buscar último HTML do chat
  async getLatestHTML(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { chatId } = req.params
      const userId = req.user!.id
      const userToken = req.headers.authorization?.replace('Bearer ', '')

      if (!chatId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Chat ID é obrigatório'
        })
        return
      }

      logger.info('🔍 Buscando último HTML do chat', { chatId, userId })

      // Verificar se chat pertence ao usuário
      await ChatService.getChatById(chatId, userId, userToken)

      // Buscar HTML usando método otimizado
      const html = await this.getLatestHTMLFromMessagesOptimized(chatId, userToken)

      if (!html) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Nenhum HTML encontrado neste chat'
        })
        return
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'HTML encontrado com sucesso',
        data: {
          html,
          chatId,
          htmlLength: html.length,
          timestamp: new Date().toISOString()
        }
      })

    } catch (error: any) {
      logger.error('❌ Erro ao buscar HTML do chat:', error)
      
      if (error instanceof require('../utils/api-error').ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        })
        return
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar HTML do chat'
      })
    }
  }

  // 🚨 FUNÇÃO MELHORADA: Também buscar no content das mensagens como fallback
  private extractHTMLFromMessage(content: string, metadata: any): string | null {
    // Primeiro, verificar se o conteúdo já é HTML
    if (content && (content.includes('<html') || content.includes('<!DOCTYPE'))) {
      return content
    }
    
    // Depois, usar a nova função de artifacts
    return this.extractHTMLFromArtifacts(metadata)
  }

  // 🎯 NOVO MÉTODO: Detecção precisa de operação
  private detectOperation(
    message: string, 
    existingHTML: string | null, 
    frontendOperation?: string,
    context?: any
  ): {
    operation: 'create' | 'edit' | 'analyze',
    hasHTML: boolean,
    preserveStructure: boolean,
    confidence: number
  } {
    const hasHTML = !!(existingHTML && existingHTML.length > 100)
    let confidence = 0
    let operation: 'create' | 'edit' | 'analyze' = 'create'
    
    // 🔥 PRIORIDADE 1: Operação explícita do frontend (95% confiança)
    if (frontendOperation === 'edit' || frontendOperation === 'create') {
      confidence = 95
      operation = frontendOperation as 'create' | 'edit'
      
      // Se frontend diz 'edit' mas não há HTML, forçar 'create'
      if (frontendOperation === 'edit' && !hasHTML) {
        operation = 'create'
        confidence = 80
      }
      
      return {
        operation,
        hasHTML,
        preserveStructure: operation === 'edit',
        confidence
      }
    }
    
    // 🔥 PRIORIDADE 2: Elemento específico do contexto (90% confiança)
    if (context?.targetElement?.originalText && context?.targetElement?.newText) {
      return {
        operation: 'edit',
        hasHTML,
        preserveStructure: true,
        confidence: 90
      }
    }
    
    // 🔥 PRIORIDADE 3: Se não há HTML, é criação (85% confiança)
    if (!hasHTML) {
      return {
        operation: 'create',
        hasHTML: false,
        preserveStructure: false,
        confidence: 85
      }
    }
    
    // 🔥 PRIORIDADE 4: Análise de palavras-chave rigorosa (80% confiança)
    const isEditRequest = this.containsEditKeywords(message)
    if (isEditRequest) {
      return {
        operation: 'edit',
        hasHTML,
        preserveStructure: true,
        confidence: 80
      }
    }
    
    // 🔥 DEFAULT: Com HTML existente mas sem indicação clara = analyze
    if (hasHTML) {
      return {
        operation: 'analyze',
        hasHTML,
        preserveStructure: true,
        confidence: 60
      }
    }
    
    // 🔥 FALLBACK: Create
    return {
      operation: 'create',
      hasHTML,
      preserveStructure: false,
      confidence: 50
    }
  }

  // 🎯 NOVO MÉTODO: Verificar palavras-chave de edição
  private containsEditKeywords(message: string): boolean {
    const editKeywords = [
      // Português - palavras específicas
      'altere', 'modifique', 'mude', 'substitua', 'corrija', 'atualize', 
      'troque', 'edite', 'ajuste', 'refaça', 'conserte',
      
      // Inglês - palavras específicas  
      'change', 'modify', 'update', 'edit', 'fix', 'correct', 'adjust',
      'replace', 'alter', 'revise',
      
      // Frases específicas
      'muda para', 'troca por', 'substitui por', 'altera para',
      'change to', 'replace with', 'update to'
    ]
    
    const lowerMessage = message.toLowerCase()
    return editKeywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))
  }
}

export default new ChatController()