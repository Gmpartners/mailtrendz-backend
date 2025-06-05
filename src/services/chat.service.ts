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
import AIService from './ai.service'
import ProjectService from './project.service'

// Estender os tipos dos modelos para incluir métodos estáticos
interface MessageModelType extends mongoose.Model<IMessageDocument> {
  getChatStats(chatId: string): Promise<any>
  getTokenUsage(chatId: string, dateFrom?: Date, dateTo?: Date): Promise<any>
  getPerformanceMetrics(chatId: string): Promise<any>
}

interface ChatModelType extends mongoose.Model<IChatDocument> {
  getActiveChats(userId: string): Promise<any>
}

// Usar type assertion para os modelos
const MessageModel = Message as MessageModelType
const ChatModel = Chat as ChatModelType

class ChatService {
  // Criar novo chat
  async createChat(userId: string, createChatDto: CreateChatDto): Promise<ChatResponse> {
    try {
      // Verificar se o projeto existe e pertence ao usuário
      const project = await Project.findOne({
        _id: createChatDto.projectId,
        userId: new Types.ObjectId(userId)
      })

      if (!project) {
        throw createNotFoundError('Projeto')
      }

      // Verificar se já existe chat para este projeto
      const existingChat = await Chat.findOne({ projectId: createChatDto.projectId })
      if (existingChat) {
        return this.getChatResponse(existingChat._id.toString(), userId)
      }

      // Criar novo chat
      const chat = new Chat({
        userId: new Types.ObjectId(userId),
        projectId: new Types.ObjectId(createChatDto.projectId),
        title: createChatDto.title || `Chat - ${project.name}`,
        isActive: true
      })

      await chat.save()

      // Atualizar projeto com chat ID
      await Project.findByIdAndUpdate(createChatDto.projectId, { chatId: chat._id })

      logger.info('Chat created', { 
        chatId: chat._id, 
        projectId: createChatDto.projectId, 
        userId 
      })

      return this.getChatResponse(chat._id.toString(), userId)
    } catch (error) {
      logger.error('Create chat failed:', error)
      throw error
    }
  }

  // Buscar chat por projeto
  async getChatByProject(projectId: string, userId: string): Promise<ChatResponse> {
    try {
      const chat = await Chat.findOne({ 
        projectId: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId)
      })

      if (!chat) {
        // Criar chat automaticamente se não existir
        return this.createChat(userId, { projectId })
      }

      return this.getChatResponse(chat._id.toString(), userId)
    } catch (error) {
      logger.error('Get chat by project failed:', error)
      throw error
    }
  }

  // Buscar chat por ID
  async getChatById(chatId: string, userId: string): Promise<ChatResponse> {
    try {
      return this.getChatResponse(chatId, userId)
    } catch (error) {
      logger.error('Get chat by ID failed:', error)
      throw error
    }
  }

  // Enviar mensagem e obter resposta da IA
  async sendMessage(chatId: string, userId: string, messageDto: SendMessageDto): Promise<MessageResponse> {
    try {
      // Verificar se o chat existe e pertence ao usuário
      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      }).populate('projectId')

      if (!chat) {
        throw createNotFoundError('Chat')
      }

      // Criar mensagem do usuário
      const userMessage = new Message({
        chatId: new Types.ObjectId(chatId),
        type: messageDto.type || MESSAGE_TYPES.USER,
        content: messageDto.content
      })

      await userMessage.save()
      await chat.addMessage(userMessage._id)

      // Se for mensagem do usuário, gerar resposta da IA
      let aiResponse
      if (userMessage.type === MESSAGE_TYPES.USER) {
        aiResponse = await this.generateAIResponse(chatId, messageDto.content, userId)
      }

      return {
        message: userMessage,
        aiResponse
      }
    } catch (error) {
      logger.error('Send message failed:', error)
      throw error
    }
  }

  // Gerar resposta da IA
  private async generateAIResponse(chatId: string, userMessage: string, userId: string) {
    try {
      // Buscar histórico de mensagens
      const chatHistory = await this.getChatHistoryForAI(chatId)
      
      // Buscar contexto do projeto
      const chat = await Chat.findById(chatId).populate('projectId')
      const project = chat?.projectId as any

      if (!project) {
        throw createNotFoundError('Projeto')
      }

      const projectContext: ProjectContext = {
        userId,
        projectName: project.name,
        type: project.type,
        industry: project.metadata.industry,
        targetAudience: project.metadata.targetAudience,
        tone: project.metadata.tone,
        status: project.status
      }

      // Chamar IA
      const startTime = Date.now()
      const aiResult = await AIService.chatWithAI(userMessage, chatHistory, projectContext)
      const executionTime = Date.now() - startTime

      // Criar mensagem da IA
      const aiMessage = new Message({
        chatId: new Types.ObjectId(chatId),
        type: MESSAGE_TYPES.AI,
        content: aiResult.response,
        metadata: {
          emailUpdated: aiResult.shouldUpdateEmail,
          suggestions: aiResult.suggestions,
          model: aiResult.metadata?.model,
          tokens: aiResult.metadata?.tokens,
          confidence: aiResult.metadata?.confidence,
          executionTime
        }
      })

      await aiMessage.save()
      await chat.addMessage(aiMessage._id)

      // Se deve atualizar email, fazer a atualização
      if (aiResult.shouldUpdateEmail) {
        await this.updateProjectEmailFromChat(project._id, userMessage, projectContext)
        await chat.incrementEmailUpdates()
      }

      return {
        content: aiResult.response,
        suggestions: aiResult.suggestions,
        emailUpdated: aiResult.shouldUpdateEmail,
        metadata: {
          model: aiResult.metadata?.model || 'unknown',
          tokens: aiResult.metadata?.tokens || 0,
          executionTime
        }
      }
    } catch (error) {
      logger.error('Generate AI response failed:', error)
      
      // Criar mensagem de erro da IA
      const errorMessage = new Message({
        chatId: new Types.ObjectId(chatId),
        type: MESSAGE_TYPES.AI,
        content: 'Desculpe, houve um erro ao processar sua mensagem. Tente novamente.',
        metadata: {
          emailUpdated: false,
          executionTime: 0
        }
      })

      await errorMessage.save()
      
      return {
        content: errorMessage.content,
        suggestions: [],
        emailUpdated: false,
        metadata: {
          model: 'error',
          tokens: 0,
          executionTime: 0
        }
      }
    }
  }

  // Atualizar email do projeto baseado no chat
  private async updateProjectEmailFromChat(projectId: string, instruction: string, context: ProjectContext) {
    try {
      const project = await Project.findById(projectId)
      if (!project) return

      // Usar IA para melhorar o email baseado na instrução
      const improvedContent = await AIService.improveEmail(
        project.content,
        instruction,
        context
      )

      // Atualizar projeto
      await ProjectService.updateProject(projectId, context.userId, {
        content: improvedContent,
        metadata: {
          ...project.metadata,
          version: (project.metadata.version || 1) + 1,
          lastImprovement: {
            feedback: instruction,
            timestamp: new Date(),
            version: (project.metadata.version || 1) + 1
          }
        }
      })

      logger.info('Project email updated from chat', { 
        projectId, 
        userId: context.userId,
        instruction: instruction.substring(0, 50)
      })
    } catch (error) {
      logger.error('Update project email from chat failed:', error)
      // Não lançar erro para não afetar o chat
    }
  }

  // Buscar histórico de mensagens
  async getChatHistory(chatId: string, userId: string, page: number = 1, limit: number = 50): Promise<ChatHistoryResponse> {
    try {
      // Verificar se o chat pertence ao usuário
      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      })

      if (!chat) {
        throw createNotFoundError('Chat')
      }

      const skip = (page - 1) * limit

      // Buscar mensagens com paginação
      const [messages, totalItems] = await Promise.all([
        Message.find({ chatId: new Types.ObjectId(chatId) })
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit),
        Message.countDocuments({ chatId: new Types.ObjectId(chatId) })
      ])

      // Calcular estatísticas
      const stats = await MessageModel.getChatStats(chatId)
      const userMessages = stats.find(s => s._id === MESSAGE_TYPES.USER)?.count || 0
      const aiMessages = stats.find(s => s._id === MESSAGE_TYPES.AI)?.count || 0
      const avgResponseTime = stats.find(s => s._id === MESSAGE_TYPES.AI)?.avgExecutionTime || 0

      const totalPages = Math.ceil(totalItems / limit)

      return {
        messages,
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

  // Atualizar chat
  async updateChat(chatId: string, userId: string, updates: UpdateChatDto): Promise<IChat | null> {
    try {
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, userId: new Types.ObjectId(userId) },
        { ...updates, 'metadata.lastActivity': new Date() },
        { new: true, runValidators: true }
      )

      if (chat) {
        logger.info('Chat updated', { chatId, userId, updates: Object.keys(updates) })
      }

      return chat
    } catch (error) {
      logger.error('Update chat failed:', error)
      throw error
    }
  }

  // Deletar chat
  async deleteChat(chatId: string, userId: string): Promise<boolean> {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      })

      if (!chat) {
        return false
      }

      // Deletar todas as mensagens do chat
      await Message.deleteMany({ chatId: new Types.ObjectId(chatId) })

      // Deletar o chat
      await Chat.findByIdAndDelete(chatId)

      // Remover referência do projeto
      await Project.findByIdAndUpdate(chat.projectId, { $unset: { chatId: 1 } })

      logger.info('Chat deleted', { chatId, userId })
      return true
    } catch (error) {
      logger.error('Delete chat failed:', error)
      throw error
    }
  }

  // Buscar chats do usuário
  async getUserChats(userId: string, filters: ChatFilters): Promise<IChat[]> {
    try {
      const {
        projectId,
        isActive,
        search,
        dateFrom,
        dateTo,
        pagination,
        sort
      } = filters

      // Construir query
      const query: any = { userId: new Types.ObjectId(userId) }

      if (projectId) {
        query.projectId = new Types.ObjectId(projectId)
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

      // Paginação e ordenação
      const page = pagination.page || 1
      const limit = pagination.limit || PAGINATION.DEFAULT_LIMIT
      const skip = (page - 1) * limit

      const sortObj: any = {}
      sortObj[sort.field] = sort.order === 'asc' ? 1 : -1

      return await Chat.find(query)
        .populate('projectId', 'name type')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
    } catch (error) {
      logger.error('Get user chats failed:', error)
      throw error
    }
  }

  // Buscar chats ativos do usuário
  async getActiveChats(userId: string): Promise<IChat[]> {
    try {
      return await ChatModel.getActiveChats(userId)
    } catch (error) {
      logger.error('Get active chats failed:', error)
      throw error
    }
  }

  // Buscar analytics do chat
  async getChatAnalytics(chatId: string, userId: string): Promise<ChatAnalytics | null> {
    try {
      // Verificar se o chat pertence ao usuário
      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      }).populate('projectId', 'name')

      if (!chat) {
        throw createNotFoundError('Chat')
      }

      const project = chat.projectId as any

      // Buscar estatísticas do chat
      const [stats, tokenUsage, performance] = await Promise.all([
        MessageModel.getChatStats(chatId),
        MessageModel.getTokenUsage(chatId),
        MessageModel.getPerformanceMetrics(chatId)
      ])

      // Calcular métricas
      const totalMessages = stats.reduce((sum, s) => sum + s.count, 0)
      const userMessages = stats.find(s => s._id === MESSAGE_TYPES.USER)?.count || 0
      const aiMessages = stats.find(s => s._id === MESSAGE_TYPES.AI)?.count || 0

      // Timeline (simplificada)
      const timeline = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        timeline.push({
          date,
          messages: Math.floor(totalMessages / 7),
          emailUpdates: Math.floor(chat.metadata.emailUpdates / 7)
        })
      }

      // Word cloud simples (implementar análise real depois)
      const wordCloud = [
        { word: 'email', frequency: 10 },
        { word: 'assunto', frequency: 8 },
        { word: 'conteúdo', frequency: 6 },
        { word: 'melhorar', frequency: 5 }
      ]

      return {
        chatId,
        projectName: project.name,
        stats: {
          totalMessages,
          userMessages,
          aiMessages,
          emailUpdates: chat.metadata.emailUpdates,
          averageResponseTime: performance.avgExecutionTime,
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

  // Métodos auxiliares privados
  private async getChatResponse(chatId: string, userId: string): Promise<ChatResponse> {
    const chat = await Chat.findOne({
      _id: chatId,
      userId: new Types.ObjectId(userId)
    }).populate('projectId', 'name type')

    if (!chat) {
      throw createNotFoundError('Chat')
    }

    const project = chat.projectId as any
    const recentMessages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .limit(10)

    const stats = await MessageModel.getChatStats(chatId)
    const userMessageCount = stats.find(s => s._id === MESSAGE_TYPES.USER)?.count || 0
    const aiMessageCount = stats.find(s => s._id === MESSAGE_TYPES.AI)?.count || 0

    return {
      chat,
      messages: recentMessages.reverse(),
      project: {
        id: project._id.toString(),
        name: project.name,
        type: project.type
      },
      stats: {
        totalMessages: chat.metadata.totalMessages,
        userMessages: userMessageCount,
        aiMessages: aiMessageCount,
        emailUpdates: chat.metadata.emailUpdates,
        lastActivity: chat.metadata.lastActivity
      }
    }
  }

  private async getChatHistoryForAI(chatId: string): Promise<ChatMessage[]> {
    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .limit(20)

    return messages.reverse().map(msg => ({
      id: msg._id.toString(),
      type: msg.type as 'user' | 'ai' | 'system',
      content: msg.content,
      timestamp: msg.createdAt
    }))
  }
}

export default new ChatService()
