import { Types } from 'mongoose'
import mongoose from 'mongoose'
import { Chat, IChatDocument } from '../models/Chat.model'
import { Message, IMessageDocument } from '../models/Message.model'
import { Project } from '../models/Project.model'
import { 
  IChat, 
  IMessage,
  CreateChatDto,
  SendMessageDto,
  UpdateChatDto,
  ChatResponse,
  ChatHistoryResponse,
  MessageResponse,
  ChatFilters,
  ChatAnalytics,
  BulkMessageDto
} from '../types/chat.types'
import { ChatMessage, ProjectContext } from '../types/ai.types'
import { MESSAGE_TYPES, PAGINATION } from '../utils/constants'
import { logger } from '../utils/logger'
import { createNotFoundError, createForbiddenError } from '../middleware/error.middleware'
import { ID_UTILS } from '../utils/id-utils'
import AIService from './ai.service'
import ProjectService from './project.service'

// Conversões simples
const convertChatToInterface = (chat: IChatDocument): IChat => {
  if (!chat) {
    throw new Error('Chat document is null or undefined')
  }

  return {
    _id: chat._id as Types.ObjectId,
    id: ID_UTILS.toString(chat._id),
    userId: ID_UTILS.toString(chat.userId),
    projectId: ID_UTILS.toString(chat.projectId),
    title: chat.title || 'Chat sem título',
    messages: chat.messages || [],
    isActive: chat.isActive !== undefined ? chat.isActive : true,
    metadata: {
      totalMessages: chat.metadata?.totalMessages || 0,
      lastActivity: chat.metadata?.lastActivity || new Date(),
      emailUpdates: chat.metadata?.emailUpdates || 0
    },
    createdAt: chat.createdAt || new Date(),
    updatedAt: chat.updatedAt || new Date()
  }
}

const convertMessageToInterface = (message: IMessageDocument): IMessage => {
  if (!message) {
    throw new Error('Message document is null or undefined')
  }

  return {
    _id: message._id as Types.ObjectId,
    id: ID_UTILS.toString(message._id),
    chatId: ID_UTILS.toString(message.chatId),
    type: message.type || 'user',
    content: message.content || '',
    metadata: message.metadata || {},
    createdAt: message.createdAt || new Date()
  }
}

const normalizeChats = (chats: IChatDocument[]): IChat[] => {
  if (!Array.isArray(chats)) {
    console.warn('⚠️ [CHAT SERVICE] normalizeChats: input não é array')
    return []
  }
  return chats.map(chat => convertChatToInterface(chat))
}

const normalizeChatMessages = (messages: IMessageDocument[]): IMessage[] => {
  if (!Array.isArray(messages)) {
    console.warn('⚠️ [CHAT SERVICE] normalizeChatMessages: input não é array')
    return []
  }
  return messages.map(message => convertMessageToInterface(message))
}

interface MessageModelType extends mongoose.Model<IMessageDocument> {
  getChatStats(chatId: string): Promise<any>
  getTokenUsage(chatId: string, dateFrom?: Date, dateTo?: Date): Promise<any>
  getPerformanceMetrics(chatId: string): Promise<any>
}

interface ChatModelType extends mongoose.Model<IChatDocument> {
  getActiveChats(userId: string): Promise<any>
}

const MessageModel = Message as MessageModelType
const ChatModel = Chat as ChatModelType

class ChatService {
  
  // 🚀 NOVO: Flag para controlar uso da IA melhorada
  private useEnhancedAI: boolean = true

  constructor() {
    // Log sobre IA melhorada
    console.log('💬 [CHAT SERVICE] Inicializado com suporte à IA melhorada')
  }

  async createChat(userId: string, createChatDto: CreateChatDto): Promise<ChatResponse> {
    try {
      console.log('🆕 [CHAT SERVICE] Criando chat:', { userId, projectId: createChatDto.projectId })
      
      const userObjectId = ID_UTILS.toObjectId(userId)
      const projectObjectId = ID_UTILS.toObjectId(createChatDto.projectId)
      
      const project = await Project.findOne({
        _id: projectObjectId,
        userId: userObjectId
      })

      if (!project) {
        console.error('❌ [CHAT SERVICE] Projeto não encontrado:', { projectId: createChatDto.projectId, userId })
        throw createNotFoundError('Projeto')
      }

      const existingChat = await Chat.findOne({ projectId: projectObjectId })
      if (existingChat) {
        console.log('✅ [CHAT SERVICE] Chat existe, retornando:', existingChat._id.toString())
        return this.getChatResponse(existingChat._id.toString(), userId)
      }

      const chat = new Chat({
        userId: userObjectId,
        projectId: projectObjectId,
        title: createChatDto.title || `Chat - ${project.name}`,
        isActive: true,
        messages: [],
        metadata: {
          totalMessages: 0,
          lastActivity: new Date(),
          emailUpdates: 0,
          // 🚀 NOVO: Metadata para IA melhorada
          enhancedAIEnabled: this.useEnhancedAI,
          aiMode: 'adaptive' // adaptive, standard, enhanced
        }
      })

      await chat.save()
      console.log('✅ [CHAT SERVICE] Chat criado:', chat._id.toString())

      await Project.findByIdAndUpdate(projectObjectId, { chatId: chat._id })

      logger.info('Chat created', { 
        chatId: chat._id, 
        projectId: createChatDto.projectId, 
        userId,
        enhancedAI: this.useEnhancedAI // 🚀 NOVO
      })

      return this.getChatResponse(chat._id.toString(), userId)
    } catch (error) {
      console.error('❌ [CHAT SERVICE] Erro ao criar chat:', error)
      logger.error('Create chat failed:', error)
      throw error
    }
  }

  async getChatByProject(projectId: string, userId: string): Promise<ChatResponse> {
    try {
      console.log('🔍 [CHAT SERVICE] Buscando chat por projeto:', { projectId, userId })

      const projectObjectId = ID_UTILS.toObjectId(projectId)
      const userObjectId = ID_UTILS.toObjectId(userId)

      // Verificar projeto
      const project = await Project.findOne({
        _id: projectObjectId,
        userId: userObjectId
      })

      if (!project) {
        console.error('❌ [CHAT SERVICE] Projeto não encontrado:', { projectId, userId })
        throw createNotFoundError('Projeto')
      }

      console.log('✅ [CHAT SERVICE] Projeto encontrado:', { projectName: project.name })

      // Buscar ou criar chat
      let chat = await Chat.findOne({ 
        projectId: projectObjectId,
        userId: userObjectId
      })

      if (!chat) {
        console.log('📝 [CHAT SERVICE] Criando chat automaticamente...')
        
        chat = new Chat({
          userId: userObjectId,
          projectId: projectObjectId,
          title: `Chat - ${project.name}`,
          isActive: true,
          messages: [],
          metadata: {
            totalMessages: 0,
            lastActivity: new Date(),
            emailUpdates: 0,
            // 🚀 NOVO: Metadata para IA melhorada
            enhancedAIEnabled: this.useEnhancedAI,
            aiMode: 'adaptive'
          }
        })

        await chat.save()
        console.log('✅ [CHAT SERVICE] Chat criado automaticamente:', chat._id.toString())

        if (!project.chatId) {
          await Project.findByIdAndUpdate(projectId, { chatId: chat._id })
        }
      }

      const response = await this.buildChatResponse(chat, project, userId)
      
      console.log('📤 [CHAT SERVICE] Resposta construída:', {
        chatId: response.chat?.id,
        messagesCount: response.messages?.length || 0
      })

      return response

    } catch (error: any) {
      console.error('❌ [CHAT SERVICE] Erro em getChatByProject:', { 
        error: error.message, 
        projectId, 
        userId 
      })
      
      if (error.message.includes('Projeto')) {
        throw error
      }
      
      logger.error('Get chat by project failed:', error)
      throw new Error(`Falha ao buscar chat: ${error.message}`)
    }
  }

  private async buildChatResponse(chat: IChatDocument, project: any, userId: string): Promise<ChatResponse> {
    try {
      // Buscar mensagens recentes (últimas 10)
      const recentMessages = await Message.find({ 
        chatId: chat._id 
      })
        .sort({ createdAt: -1 })
        .limit(10)

      // Stats básicos
      const stats = await Message.aggregate([
        { $match: { chatId: chat._id } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ])

      const userMessageCount = stats.find(s => s._id === 'user')?.count || 0
      const aiMessageCount = stats.find(s => s._id === 'ai')?.count || 0

      const chatData = convertChatToInterface(chat)
      const messagesData: IMessage[] = normalizeChatMessages(recentMessages.reverse())

      return {
        chat: chatData,
        messages: messagesData,
        project: {
          id: project._id?.toString() || '',
          name: project.name || 'Projeto sem nome',
          type: project.type || 'email'
        },
        stats: {
          totalMessages: chat.metadata?.totalMessages || 0,
          userMessages: userMessageCount,
          aiMessages: aiMessageCount,
          emailUpdates: chat.metadata?.emailUpdates || 0,
          lastActivity: chat.metadata?.lastActivity || new Date()
        },
        // 🚀 NOVO: Informações sobre IA melhorada
        aiCapabilities: {
          enhancedMode: chat.metadata?.enhancedAIEnabled || false,
          currentMode: chat.metadata?.aiMode || 'standard',
          features: chat.metadata?.enhancedAIEnabled ? [
            'smart-analysis', 
            'visual-customization', 
            'intelligent-suggestions'
          ] : ['basic-chat']
        }
      }

    } catch (error: any) {
      console.error('❌ [CHAT SERVICE] Erro ao construir resposta:', error.message)
      throw error
    }
  }

  async getChatById(chatId: string, userId: string): Promise<ChatResponse> {
    try {
      return this.getChatResponse(chatId, userId)
    } catch (error) {
      logger.error('Get chat by ID failed:', error)
      throw error
    }
  }

  async sendMessage(chatId: string, userId: string, messageDto: SendMessageDto): Promise<MessageResponse> {
    try {
      const chatObjectId = ID_UTILS.toObjectId(chatId)
      const userObjectId = ID_UTILS.toObjectId(userId)

      const chat = await Chat.findOne({
        _id: chatObjectId,
        userId: userObjectId
      }).populate('projectId')

      if (!chat) {
        throw createNotFoundError('Chat')
      }

      if (!messageDto.content || !messageDto.content.trim()) {
        throw new Error('Conteúdo da mensagem não pode estar vazio')
      }

      const userMessage = new Message({
        chatId: chatObjectId,
        type: messageDto.type || MESSAGE_TYPES.USER,
        content: messageDto.content.trim()
      })

      await userMessage.save()
      await chat.addMessage(userMessage._id as Types.ObjectId)

      let aiResponse
      if (userMessage.type === MESSAGE_TYPES.USER) {
        // 🚀 NOVO: Usar IA melhorada quando apropriado
        aiResponse = await this.generateEnhancedAIResponse(chatId, messageDto.content.trim(), userId, chat)
      }

      const messageData = convertMessageToInterface(userMessage)

      return {
        message: messageData,
        aiResponse
      }
    } catch (error) {
      logger.error('Send message failed:', error)
      throw error
    }
  }

  // 🚀 NOVA FUNÇÃO: generateEnhancedAIResponse - com IA melhorada
  private async generateEnhancedAIResponse(chatId: string, userMessage: string, userId: string, chat: IChatDocument) {
    try {
      console.log('🧠 [CHAT SERVICE] Gerando resposta com IA melhorada:', {
        chatId,
        userMessage: userMessage.substring(0, 100),
        userId,
        enhancedEnabled: chat.metadata?.enhancedAIEnabled
      })

      const chatObjectId = ID_UTILS.toObjectId(chatId)

      // 1. Buscar projeto
      const project = chat?.projectId as any || await Project.findById(chat.projectId)

      if (!project) {
        throw createNotFoundError('Projeto')
      }

      // 2. Buscar histórico
      const chatHistory = await this.getChatHistoryForAI(chatId)

      // 3. Preparar contexto
      const projectContext: ProjectContext = {
        userId,
        projectName: project.name,
        type: project.type,
        industry: project.metadata?.industry || 'geral',
        targetAudience: project.metadata?.targetAudience || 'geral',
        tone: project.metadata?.tone || 'profissional',
        status: project.status || 'ativo'
      }

      // 🚀 DECISÃO: Usar IA melhorada ou padrão?
      const shouldUseEnhanced = this.shouldUseEnhancedForMessage(
        userMessage, 
        projectContext, 
        chat.metadata?.enhancedAIEnabled
      )

      console.log('🤔 [CHAT SERVICE] Decisão de IA:', {
        shouldUseEnhanced,
        messageLength: userMessage.length,
        chatMode: chat.metadata?.aiMode,
        enhancedEnabled: chat.metadata?.enhancedAIEnabled
      })

      let aiResult: any
      const startTime = Date.now()

      if (shouldUseEnhanced) {
        try {
          // 🚀 Usar IA melhorada
          console.log('✨ [CHAT SERVICE] Usando IA melhorada')
          
          const smartResponse = await AIService.smartChatWithAI(
            userMessage,
            chatHistory,
            projectContext,
            undefined // userHistory - TODO: implementar na Fase 3
          )

          aiResult = {
            response: smartResponse.response,
            shouldUpdateEmail: smartResponse.shouldUpdateEmail,
            suggestions: smartResponse.suggestions || [],
            metadata: {
              model: smartResponse.metadata.model,
              tokens: smartResponse.metadata.tokens,
              confidence: smartResponse.metadata.confidence,
              enhancedFeatures: smartResponse.metadata.enhancedFeatures,
              aiMode: 'enhanced'
            },
            // 🚀 NOVO: Dados específicos da IA melhorada
            analysis: smartResponse.analysis,
            enhancedContent: smartResponse.enhancedContent
          }

        } catch (enhancedError) {
          console.warn('⚠️ [CHAT SERVICE] IA melhorada falhou, usando fallback:', enhancedError.message)
          
          // Fallback para IA padrão
          const fallbackResult = await AIService.chatWithAI(userMessage, chatHistory, projectContext)
          aiResult = {
            ...fallbackResult,
            metadata: {
              ...fallbackResult.metadata,
              aiMode: 'fallback',
              enhancedAttempted: true,
              enhancedError: enhancedError.message
            }
          }
        }
      } else {
        // 🔄 Usar IA padrão
        console.log('🔄 [CHAT SERVICE] Usando IA padrão')
        
        const standardResult = await AIService.chatWithAI(userMessage, chatHistory, projectContext)
        aiResult = {
          ...standardResult,
          metadata: {
            ...standardResult.metadata,
            aiMode: 'standard'
          }
        }
      }

      const executionTime = Date.now() - startTime

      console.log('🤖 [CHAT SERVICE] Resposta da IA recebida:', {
        hasResponse: !!aiResult.response,
        shouldUpdateEmail: aiResult.shouldUpdateEmail,
        aiMode: aiResult.metadata?.aiMode,
        executionTime,
        hasAnalysis: !!aiResult.analysis,
        hasEnhancedContent: !!aiResult.enhancedContent
      })

      // 4. Atualizar projeto se necessário
      let projectUpdated = false
      if (aiResult.shouldUpdateEmail) {
        console.log('🔄 [CHAT SERVICE] Tentando atualizar projeto...')
        
        try {
          let improvedContent

          // 🚀 NOVO: Usar conteúdo melhorado se disponível
          if (aiResult.enhancedContent) {
            console.log('✨ [CHAT SERVICE] Usando conteúdo melhorado da IA')
            improvedContent = {
              subject: aiResult.enhancedContent.subject,
              previewText: aiResult.enhancedContent.previewText,
              html: aiResult.enhancedContent.html,
              text: aiResult.enhancedContent.html.replace(/<[^>]*>/g, '') // conversão simples
            }
          } else {
            // Usar função de melhoria padrão
            improvedContent = await AIService.improveEmail(
              project.content,
              userMessage,
              projectContext
            )
          }
          
          const updatedProject = await ProjectService.updateProject(project._id.toString(), userId, {
            content: improvedContent,
            metadata: {
              ...project.metadata,
              version: (project.metadata?.version || 1) + 1,
              lastImprovement: {
                feedback: userMessage,
                timestamp: new Date(),
                version: (project.metadata?.version || 1) + 1,
                aiMode: aiResult.metadata?.aiMode, // 🚀 NOVO
                enhancedFeatures: aiResult.metadata?.enhancedFeatures || [] // 🚀 NOVO
              }
            }
          })
          
          if (updatedProject) {
            projectUpdated = true
            await chat.incrementEmailUpdates()
            console.log('✅ [CHAT SERVICE] Projeto atualizado com sucesso')
          }
        } catch (updateError) {
          console.error('❌ [CHAT SERVICE] Erro ao atualizar projeto:', updateError)
          // Continuar mesmo se falhar a atualização
        }
      }

      // 5. Salvar mensagem da IA
      const aiMessage = new Message({
        chatId: chatObjectId,
        type: MESSAGE_TYPES.AI,
        content: aiResult.response,
        metadata: {
          emailUpdated: projectUpdated,
          suggestions: aiResult.suggestions,
          model: aiResult.metadata?.model,
          tokens: aiResult.metadata?.tokens,
          confidence: aiResult.metadata?.confidence,
          executionTime,
          // 🚀 NOVO: Metadata da IA melhorada
          aiMode: aiResult.metadata?.aiMode,
          enhancedFeatures: aiResult.metadata?.enhancedFeatures,
          analysis: aiResult.analysis ? {
            confidence: aiResult.analysis.confidence,
            intentionsCount: aiResult.analysis.intentions?.length || 0,
            hasVisualReqs: Object.keys(aiResult.analysis.visualRequirements || {}).length > 0
          } : undefined
        }
      })

      await aiMessage.save()
      await chat.addMessage(aiMessage._id as Types.ObjectId)

      // 🚀 NOVO: Atualizar metadata do chat se usou IA melhorada
      if (aiResult.metadata?.aiMode === 'enhanced') {
        await Chat.findByIdAndUpdate(chatObjectId, {
          'metadata.lastEnhancedInteraction': new Date(),
          'metadata.enhancedInteractions': (chat.metadata?.enhancedInteractions || 0) + 1
        })
      }

      console.log('💾 [CHAT SERVICE] Mensagem da IA salva:', {
        messageId: aiMessage._id.toString(),
        projectUpdated,
        aiMode: aiResult.metadata?.aiMode
      })

      return {
        content: aiResult.response,
        suggestions: aiResult.suggestions || [],
        emailUpdated: projectUpdated,
        metadata: {
          model: aiResult.metadata?.model || 'claude-3-sonnet',
          tokens: aiResult.metadata?.tokens || 0,
          executionTime,
          confidence: aiResult.metadata?.confidence || 0,
          // 🚀 NOVO: Metadata estendida
          aiMode: aiResult.metadata?.aiMode,
          enhancedFeatures: aiResult.metadata?.enhancedFeatures,
          hasAnalysis: !!aiResult.analysis,
          hasEnhancedContent: !!aiResult.enhancedContent
        },
        // 🚀 NOVO: Dados adicionais da IA melhorada
        analysis: aiResult.analysis,
        enhancedContent: aiResult.enhancedContent
      }

    } catch (error) {
      console.error('❌ [CHAT SERVICE] Erro na geração de resposta IA melhorada:', error)
      logger.error('Generate enhanced AI response failed:', error)
      
      // Fallback para geração padrão
      return this.generateFallbackAIResponse(chatId, userMessage, userId)
    }
  }

  // 🚀 NOVA FUNÇÃO: Decidir quando usar IA melhorada
  private shouldUseEnhancedForMessage(
    message: string, 
    projectContext: ProjectContext, 
    chatEnhancedEnabled?: boolean
  ): boolean {
    
    // Se desabilitado no chat, não usar
    if (chatEnhancedEnabled === false) return false

    // Se desabilitado globalmente, não usar
    if (!this.useEnhancedAI) return false

    const messageLower = message.toLowerCase()
    
    // 1. Mensagens com elementos visuais específicos
    const hasVisualElements = messageLower.includes('cor') || 
                             messageLower.includes('layout') || 
                             messageLower.includes('botão') ||
                             messageLower.includes('fonte') ||
                             messageLower.includes('design') ||
                             messageLower.includes('estilo')

    // 2. Mensagens complexas (mais de 30 caracteres)
    const isComplexMessage = message.length > 30

    // 3. Palavras que indicam personalização avançada
    const hasAdvancedRequirements = messageLower.includes('personaliz') ||
                                   messageLower.includes('específico') ||
                                   messageLower.includes('único') ||
                                   messageLower.includes('customiz') ||
                                   messageLower.includes('diferente')

    // 4. Pedidos de modificação específica
    const hasSpecificModification = messageLower.includes('mude para') ||
                                   messageLower.includes('altere para') ||
                                   messageLower.includes('troque para') ||
                                   messageLower.includes('adicione') ||
                                   messageLower.includes('remova')

    // 5. Projetos promocionais ou campanhas (mais propensos a customização)
    const isPromotionalProject = projectContext.type === 'promotional' || 
                                projectContext.type === 'campaign'

    const shouldUse = hasVisualElements || 
                     (isComplexMessage && hasAdvancedRequirements) ||
                     hasSpecificModification ||
                     (isPromotionalProject && isComplexMessage)

    return shouldUse
  }

  // 🚀 NOVA FUNÇÃO: Fallback para erro na IA melhorada
  private async generateFallbackAIResponse(chatId: string, userMessage: string, userId: string) {
    try {
      console.log('🔄 [CHAT SERVICE] Usando fallback padrão')
      
      const chatObjectId = ID_UTILS.toObjectId(chatId)
      const chat = await Chat.findById(chatObjectId).populate('projectId')
      const project = chat?.projectId as any

      if (!project) {
        throw createNotFoundError('Projeto')
      }

      const chatHistory = await this.getChatHistoryForAI(chatId)
      const projectContext: ProjectContext = {
        userId,
        projectName: project.name,
        type: project.type,
        industry: project.metadata?.industry || 'geral',
        targetAudience: project.metadata?.targetAudience || 'geral',
        tone: project.metadata?.tone || 'profissional',
        status: project.status || 'ativo'
      }

      const aiResult = await AIService.chatWithAI(userMessage, chatHistory, projectContext)
      
      const aiMessage = new Message({
        chatId: chatObjectId,
        type: MESSAGE_TYPES.AI,
        content: aiResult.response,
        metadata: {
          emailUpdated: false,
          suggestions: aiResult.suggestions,
          model: aiResult.metadata?.model,
          tokens: aiResult.metadata?.tokens,
          confidence: aiResult.metadata?.confidence,
          executionTime: 0,
          aiMode: 'fallback-error'
        }
      })

      await aiMessage.save()
      await chat.addMessage(aiMessage._id as Types.ObjectId)

      return {
        content: aiResult.response,
        suggestions: aiResult.suggestions || ['Tente reformular sua mensagem', 'Verifique sua conexão'],
        emailUpdated: false,
        metadata: {
          model: aiResult.metadata?.model || 'fallback',
          tokens: aiResult.metadata?.tokens || 0,
          executionTime: 0,
          confidence: aiResult.metadata?.confidence || 0,
          aiMode: 'fallback-error'
        }
      }
      
    } catch (fallbackError) {
      console.error('❌ [CHAT SERVICE] Fallback também falhou:', fallbackError)
      
      const errorMessage = new Message({
        chatId: ID_UTILS.toObjectId(chatId),
        type: MESSAGE_TYPES.AI,
        content: 'Desculpe, houve um erro ao processar sua mensagem. Tente novamente.',
        metadata: {
          emailUpdated: false,
          executionTime: 0,
          error: true,
          aiMode: 'error'
        }
      })

      await errorMessage.save()
      
      return {
        content: errorMessage.content,
        suggestions: ['Tente reformular sua mensagem', 'Verifique sua conexão'],
        emailUpdated: false,
        metadata: {
          model: 'error',
          tokens: 0,
          executionTime: 0,
          aiMode: 'error'
        }
      }
    }
  }

  // ===============================
  // MÉTODOS ORIGINAIS (MANTIDOS)
  // ===============================

  async getChatHistory(chatId: string, userId: string, page: number = 1, limit: number = 50): Promise<ChatHistoryResponse> {
    try {
      const chatObjectId = ID_UTILS.toObjectId(chatId)
      const userObjectId = ID_UTILS.toObjectId(userId)

      const chat = await Chat.findOne({
        _id: chatObjectId,
        userId: userObjectId
      })

      if (!chat) {
        throw createNotFoundError('Chat')
      }

      const skip = (page - 1) * limit

      const [messages, totalItems] = await Promise.all([
        Message.find({ chatId: chatObjectId })
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit),
        Message.countDocuments({ chatId: chatObjectId })
      ])

      const stats = await MessageModel.getChatStats(chatId)
      const userMessages = stats.find((s: any) => s._id === MESSAGE_TYPES.USER)?.count || 0
      const aiMessages = stats.find((s: any) => s._id === MESSAGE_TYPES.AI)?.count || 0
      const avgResponseTime = stats.find((s: any) => s._id === MESSAGE_TYPES.AI)?.avgExecutionTime || 0

      const totalPages = Math.ceil(totalItems / limit)

      const convertedMessages: IMessage[] = normalizeChatMessages(messages)

      return {
        messages: convertedMessages,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats: {
          totalMessages: totalItems,
          userMessages,
          aiMessages,
          averageResponseTime: avgResponseTime
        }
      }
    } catch (error) {
      logger.error('Get chat history failed:', error)
      throw error
    }
  }

  async updateChat(chatId: string, userId: string, updates: UpdateChatDto): Promise<IChat | null> {
    try {
      const chatObjectId = ID_UTILS.toObjectId(chatId)
      const userObjectId = ID_UTILS.toObjectId(userId)

      const chat = await Chat.findOneAndUpdate(
        { _id: chatObjectId, userId: userObjectId },
        { ...updates, 'metadata.lastActivity': new Date() },
        { new: true, runValidators: true }
      )

      if (chat) {
        logger.info('Chat updated', { chatId, userId, updates: Object.keys(updates) })
        return convertChatToInterface(chat)
      }

      return null
    } catch (error) {
      logger.error('Update chat failed:', error)
      throw error
    }
  }

  async deleteChat(chatId: string, userId: string): Promise<boolean> {
    try {
      const chatObjectId = ID_UTILS.toObjectId(chatId)
      const userObjectId = ID_UTILS.toObjectId(userId)

      const chat = await Chat.findOne({
        _id: chatObjectId,
        userId: userObjectId
      })

      if (!chat) {
        return false
      }

      await Message.deleteMany({ chatId: chatObjectId })
      await Chat.findByIdAndDelete(chatObjectId)
      await Project.findByIdAndUpdate(chat.projectId, { $unset: { chatId: 1 } })

      logger.info('Chat deleted', { chatId, userId })
      return true
    } catch (error) {
      logger.error('Delete chat failed:', error)
      throw error
    }
  }

  async getUserChats(userId: string, filters: ChatFilters): Promise<IChat[]> {
    try {
      const userObjectId = ID_UTILS.toObjectId(userId)

      const {
        projectId,
        isActive,
        search,
        dateFrom,
        dateTo,
        pagination,
        sort
      } = filters

      const query: any = { userId: userObjectId }

      if (projectId) {
        const projectObjectId = ID_UTILS.toObjectId(projectId)
        query.projectId = projectObjectId
      }

      if (typeof isActive === 'boolean') {
        query.isActive = isActive
      }

      if (search) {
        query.title = { $regex: search, $options: 'i' }
      }

      if (dateFrom || dateTo) {
        query.createdAt = {}
        if (dateFrom) query.createdAt.$gte = dateFrom
        if (dateTo) query.createdAt.$lte = dateTo
      }

      const page = pagination?.page || 1
      const limit = pagination?.limit || PAGINATION.DEFAULT_LIMIT
      const skip = (page - 1) * limit

      const sortObj: any = {}
      sortObj[sort?.field || 'updatedAt'] = sort?.order === 'asc' ? 1 : -1

      const chats = await Chat.find(query)
        .populate('projectId', 'name type')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)

      return normalizeChats(chats)
    } catch (error) {
      logger.error('Get user chats failed:', error)
      throw error
    }
  }

  async getActiveChats(userId: string): Promise<IChat[]> {
    try {
      const userObjectId = ID_UTILS.toObjectId(userId)

      const chats = await Chat.find({ 
        userId: userObjectId, 
        isActive: true 
      }).populate('projectId', 'name type')
      
      return normalizeChats(chats)
    } catch (error) {
      logger.error('Get active chats failed:', error)
      throw error
    }
  }

  async getChatAnalytics(chatId: string, userId: string): Promise<ChatAnalytics | null> {
    try {
      const chatObjectId = ID_UTILS.toObjectId(chatId)
      const userObjectId = ID_UTILS.toObjectId(userId)

      const chat = await Chat.findOne({
        _id: chatObjectId,
        userId: userObjectId
      }).populate('projectId', 'name')

      if (!chat) {
        throw createNotFoundError('Chat')
      }

      const project = chat.projectId as any

      const [stats, tokenUsage, performance] = await Promise.all([
        MessageModel.getChatStats(chatId),
        MessageModel.getTokenUsage(chatId),
        MessageModel.getPerformanceMetrics(chatId)
      ])

      const totalMessages = stats.reduce((sum: number, s: any) => sum + s.count, 0)
      const userMessages = stats.find((s: any) => s._id === MESSAGE_TYPES.USER)?.count || 0
      const aiMessages = stats.find((s: any) => s._id === MESSAGE_TYPES.AI)?.count || 0

      const timeline = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        timeline.push({
          date,
          messages: Math.floor(totalMessages / 7),
          emailUpdates: Math.floor(chat.metadata?.emailUpdates || 0 / 7)
        })
      }

      const wordCloud = [
        { word: 'email', frequency: 10 },
        { word: 'assunto', frequency: 8 },
        { word: 'conteúdo', frequency: 6 },
        { word: 'melhorar', frequency: 5 }
      ]

      return {
        chatId,
        projectName: project?.name || 'Projeto sem nome',
        stats: {
          totalMessages,
          userMessages,
          aiMessages,
          emailUpdates: chat.metadata?.emailUpdates || 0,
          averageResponseTime: performance?.avgExecutionTime || 0,
          sessionDuration: Date.now() - chat.createdAt.getTime()
        },
        timeline,
        wordCloud,
        sentiment: {
          positive: 70,
          neutral: 25,
          negative: 5
        }
      }
    } catch (error) {
      logger.error('Get chat analytics failed:', error)
      throw error
    }
  }

  private async getChatResponse(chatId: string, userId: string): Promise<ChatResponse> {
    try {
      const chatObjectId = ID_UTILS.toObjectId(chatId)
      const userObjectId = ID_UTILS.toObjectId(userId)

      const chat = await Chat.findOne({
        _id: chatObjectId,
        userId: userObjectId
      }).populate('projectId', 'name type')

      if (!chat) {
        throw createNotFoundError('Chat')
      }

      const project = chat.projectId as any
      if (!project) {
        throw createNotFoundError('Projeto associado ao chat')
      }

      return this.buildChatResponse(chat, project, userId)

    } catch (error: any) {
      console.error('❌ [CHAT SERVICE] Erro em getChatResponse:', error.message)
      throw error
    }
  }

  private async getChatHistoryForAI(chatId: string): Promise<ChatMessage[]> {
    const chatObjectId = ID_UTILS.toObjectId(chatId)

    const messages = await Message.find({ chatId: chatObjectId })
      .sort({ createdAt: -1 })
      .limit(20)

    return messages.reverse().map(msg => ({
      id: msg._id?.toString() || '',
      type: msg.type as 'user' | 'ai' | 'system',
      content: msg.content || '',
      timestamp: msg.createdAt || new Date()
    }))
  }

  // 🚀 NOVOS MÉTODOS PARA CONTROLE DA IA MELHORADA

  // Habilitar/desabilitar IA melhorada para um chat específico
  async toggleEnhancedAI(chatId: string, userId: string, enabled: boolean): Promise<boolean> {
    try {
      const chatObjectId = ID_UTILS.toObjectId(chatId)
      const userObjectId = ID_UTILS.toObjectId(userId)

      const chat = await Chat.findOneAndUpdate(
        { _id: chatObjectId, userId: userObjectId },
        { 
          'metadata.enhancedAIEnabled': enabled,
          'metadata.lastActivity': new Date()
        },
        { new: true }
      )

      if (chat) {
        console.log(`🔧 [CHAT SERVICE] IA melhorada ${enabled ? 'habilitada' : 'desabilitada'} para chat:`, chatId)
        return true
      }

      return false
    } catch (error) {
      console.error('❌ [CHAT SERVICE] Erro ao alterar IA melhorada:', error)
      return false
    }
  }

  // Obter estatísticas de uso da IA melhorada
  async getEnhancedAIStats(userId: string): Promise<any> {
    try {
      const userObjectId = ID_UTILS.toObjectId(userId)

      const stats = await Chat.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            enhancedChats: {
              $sum: { $cond: ['$metadata.enhancedAIEnabled', 1, 0] }
            },
            totalEnhancedInteractions: {
              $sum: { $ifNull: ['$metadata.enhancedInteractions', 0] }
            }
          }
        }
      ])

      const result = stats[0] || {
        totalChats: 0,
        enhancedChats: 0,
        totalEnhancedInteractions: 0
      }

      return {
        ...result,
        enhancedUsagePercentage: result.totalChats > 0 
          ? Math.round((result.enhancedChats / result.totalChats) * 100) 
          : 0
      }
    } catch (error) {
      console.error('❌ [CHAT SERVICE] Erro ao obter stats IA melhorada:', error)
      return {
        totalChats: 0,
        enhancedChats: 0,
        totalEnhancedInteractions: 0,
        enhancedUsagePercentage: 0
      }
    }
  }
}

export default new ChatService()
