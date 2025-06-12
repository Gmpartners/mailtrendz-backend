import { Types } from 'mongoose'
import { Chat, IChatDocument } from '../models/Chat.model'
import { ChatMessage, IChatMessageDocument } from '../models/ChatMessage.model'
import { Project } from '../models/Project.model'
import { User } from '../models/User.model'
import {
  IChat,
  IMessage,
  CreateChatDto,
  SendMessageDto,
  ChatFilters,
  ChatResponse,
  MessageResponse,
  MessagesResponse,
  ChatHistoryResponse,
  ChatAnalytics
} from '../types/chat.types'
import { PAGINATION } from '../utils/constants'
import { logger } from '../utils/logger'
import EnhancedAIService from './ai/enhanced/EnhancedAIService'

const convertChatToInterface = (chat: IChatDocument): IChat => {
  return {
    _id: chat._id as Types.ObjectId,
    id: chat._id.toString(),
    userId: chat.userId,
    projectId: chat.projectId,
    title: chat.title,
    messages: chat.messages,
    isActive: chat.isActive,
    metadata: chat.metadata,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  }
}

const convertMessageToInterface = (message: IChatMessageDocument): IMessage => {
  return {
    _id: message._id as Types.ObjectId,
    id: message._id.toString(),
    chatId: message.chatId,
    type: message.type,
    content: message.content,
    createdAt: message.createdAt,
    metadata: message.metadata
  }
}

class ChatService {
  async createChat(userId: string, createChatDto: CreateChatDto): Promise<ChatResponse> {
    try {
      const chat = new Chat({
        userId: new Types.ObjectId(userId),
        projectId: createChatDto.projectId ? new Types.ObjectId(createChatDto.projectId) : undefined,
        title: createChatDto.title || 'Novo Chat Inteligente',
        isActive: true,
        metadata: {
          totalMessages: 0,
          lastActivity: new Date(),
          emailUpdates: 0,
          enhancedAIEnabled: true
        }
      })

      await chat.save()

      const project = createChatDto.projectId ? 
        await Project.findById(createChatDto.projectId) : null

      return {
        chat: convertChatToInterface(chat),
        messages: [],
        project: project ? {
          id: project._id.toString(),
          name: project.name,
          type: project.type
        } : {
          id: '',
          name: 'Chat Geral',
          type: 'general'
        },
        stats: {
          totalMessages: 0,
          userMessages: 0,
          aiMessages: 0,
          emailUpdates: 0,
          lastActivity: new Date()
        }
      }
    } catch (error) {
      logger.error('Create chat failed:', error)
      throw error
    }
  }

  async getChatByProject(projectId: string, userId: string): Promise<ChatResponse> {
    try {
      const chat = await Chat.findOne({
        projectId: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId)
      })

      const project = await Project.findById(projectId)

      if (!chat) {
        const newChatDto: CreateChatDto = {
          projectId,
          title: project?.name || 'Novo Chat'
        }
        return await this.createChat(userId, newChatDto)
      }

      const messages = await ChatMessage.find({ chatId: chat._id })
        .sort({ createdAt: 1 })
        .limit(50)

      const userMessages = messages.filter(m => m.type === 'user').length
      const aiMessages = messages.filter(m => m.type === 'ai').length

      return {
        chat: convertChatToInterface(chat),
        messages: messages.map(convertMessageToInterface),
        project: project ? {
          id: project._id.toString(),
          name: project.name,
          type: project.type
        } : {
          id: projectId,
          name: 'Projeto',
          type: 'email'
        },
        stats: {
          totalMessages: messages.length,
          userMessages,
          aiMessages,
          emailUpdates: chat.metadata.emailUpdates,
          lastActivity: chat.metadata.lastActivity
        }
      }
    } catch (error) {
      logger.error('Get chat by project failed:', error)
      throw error
    }
  }

  async getChatById(chatId: string, userId: string): Promise<ChatResponse> {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      })

      if (!chat) {
        throw new Error('Chat não encontrado')
      }

      const messages = await ChatMessage.find({ chatId: chat._id })
        .sort({ createdAt: 1 })

      const project = chat.projectId ? 
        await Project.findById(chat.projectId) : null

      const userMessages = messages.filter(m => m.type === 'user').length
      const aiMessages = messages.filter(m => m.type === 'ai').length

      return {
        chat: convertChatToInterface(chat),
        messages: messages.map(convertMessageToInterface),
        project: project ? {
          id: project._id.toString(),
          name: project.name,
          type: project.type
        } : {
          id: '',
          name: 'Chat Geral',
          type: 'general'
        },
        stats: {
          totalMessages: messages.length,
          userMessages,
          aiMessages,
          emailUpdates: chat.metadata.emailUpdates,
          lastActivity: chat.metadata.lastActivity
        }
      }
    } catch (error) {
      logger.error('Get chat by ID failed:', error)
      throw error
    }
  }

  async getChatHistory(chatId: string, userId: string, page: number = 1, limit: number = 50): Promise<ChatHistoryResponse> {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      })

      if (!chat) {
        throw new Error('Chat não encontrado')
      }

      const skip = (page - 1) * limit

      const [messages, totalItems] = await Promise.all([
        ChatMessage.find({ chatId: new Types.ObjectId(chatId) })
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit),
        ChatMessage.countDocuments({ chatId: new Types.ObjectId(chatId) })
      ])

      const totalPages = Math.ceil(totalItems / limit)
      const userMessages = messages.filter(m => m.type === 'user').length
      const aiMessages = messages.filter(m => m.type === 'ai').length

      return {
        messages: messages.map(convertMessageToInterface),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats: {
          totalMessages: messages.length,
          userMessages,
          aiMessages,
          averageResponseTime: 0
        }
      }
    } catch (error) {
      logger.error('Get chat history failed:', error)
      throw error
    }
  }

  async getUserChats(userId: string, filters: ChatFilters): Promise<IChat[]> {
    try {
      const query: any = { userId: new Types.ObjectId(userId) }
      
      if (filters.projectId) {
        query.projectId = new Types.ObjectId(filters.projectId)
      }

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive
      }
      
      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: 'i' } }
        ]
      }

      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {}
        if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom
        if (filters.dateTo) query.createdAt.$lte = filters.dateTo
      }

      const page = filters.pagination?.page || 1
      const limit = filters.pagination?.limit || PAGINATION.DEFAULT_LIMIT
      const skip = (page - 1) * limit

      const sortField = filters.sort?.field || 'updatedAt'
      const sortOrder = filters.sort?.order === 'asc' ? 1 : -1
      const sortObj: any = {}
      sortObj[sortField] = sortOrder

      const chats = await Chat.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)

      return chats.map(convertChatToInterface)
    } catch (error) {
      logger.error('Get user chats failed:', error)
      throw error
    }
  }

  async getActiveChats(userId: string): Promise<IChat[]> {
    try {
      const chats = await Chat.find({
        userId: new Types.ObjectId(userId),
        isActive: true
      })
      .sort({ 'metadata.lastActivity': -1 })
      .limit(10)

      return chats.map(convertChatToInterface)
    } catch (error) {
      logger.error('Get active chats failed:', error)
      throw error
    }
  }

  async getChatAnalytics(chatId: string, userId: string): Promise<ChatAnalytics> {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      }).populate('projectId')

      if (!chat) {
        throw new Error('Chat não encontrado')
      }

      const messages = await ChatMessage.find({ chatId: new Types.ObjectId(chatId) })

      const userMessages = messages.filter(m => m.type === 'user').length
      const aiMessages = messages.filter(m => m.type === 'ai').length
      const emailUpdates = messages.filter(m => m.metadata?.emailUpdated).length

      const project = chat.projectId as any

      return {
        chatId: chat._id.toString(),
        projectName: project?.name || 'Chat Geral',
        stats: {
          totalMessages: messages.length,
          userMessages,
          aiMessages,
          emailUpdates,
          averageResponseTime: 0,
          sessionDuration: 0
        },
        timeline: [],
        wordCloud: [],
        sentiment: {
          positive: 0,
          neutral: 100,
          negative: 0
        }
      }
    } catch (error) {
      logger.error('Get chat analytics failed:', error)
      throw error
    }
  }

  async sendMessage(chatId: string, userId: string, messageDto: SendMessageDto): Promise<MessageResponse> {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      }).populate('projectId')

      if (!chat) {
        throw new Error('Chat não encontrado')
      }

      const userMessage = new ChatMessage({
        chatId: new Types.ObjectId(chatId),
        type: 'user',
        content: messageDto.content,
        metadata: {
          enhancedProcessing: true
        }
      })

      await userMessage.save()

      const recentMessages = await ChatMessage.find({ chatId: new Types.ObjectId(chatId) })
        .sort({ createdAt: -1 })
        .limit(10)

      const chatHistory = recentMessages.reverse().map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.createdAt
      }))

      let projectContext: any = {
        userId,
        projectName: 'Chat Geral',
        type: 'campaign',
        industry: 'geral',
        tone: 'profissional'
      }

      if (chat.projectId) {
        const project = chat.projectId as any
        projectContext = {
          userId,
          projectName: project.name,
          type: project.type,
          industry: project.metadata?.industry || 'geral',
          tone: project.metadata?.tone || 'profissional'
        }
      }

      const enhancedResponse = await EnhancedAIService.smartChatWithAI(
        messageDto.content,
        chatHistory,
        projectContext
      )

      const aiMessage = new ChatMessage({
        chatId: new Types.ObjectId(chatId),
        type: 'ai',
        content: enhancedResponse.response,
        metadata: {
          emailUpdated: enhancedResponse.shouldUpdateEmail,
          suggestions: enhancedResponse.suggestions,
          model: enhancedResponse.metadata.model,
          confidence: enhancedResponse.metadata.confidence,
          enhancedFeatures: enhancedResponse.metadata.enhancedFeatures,
          executionTime: enhancedResponse.metadata.processingTime
        }
      })

      await aiMessage.save()

      await Chat.findByIdAndUpdate(chatId, {
        $inc: { 'metadata.totalMessages': 2 },
        $set: { 
          'metadata.lastActivity': new Date()
        }
      })

      let projectUpdated = false
      if (enhancedResponse.shouldUpdateEmail && chat.projectId && enhancedResponse.enhancedContent) {
        try {
          await Project.findByIdAndUpdate(chat.projectId, {
            content: {
              subject: enhancedResponse.enhancedContent.subject,
              previewText: enhancedResponse.enhancedContent.previewText,
              html: enhancedResponse.enhancedContent.html,
              text: enhancedResponse.enhancedContent.html.replace(/<[^>]*>/g, '')
            },
            $inc: { 'metadata.version': 1 }
          })
          projectUpdated = true
        } catch (updateError) {
          logger.error('Project update failed:', updateError)
        }
      }

      return {
        userMessage: convertMessageToInterface(userMessage),
        aiMessage: convertMessageToInterface(aiMessage),
        projectUpdated
      }
    } catch (error) {
      logger.error('Send message failed:', error)
      throw error
    }
  }

  async updateChat(chatId: string, userId: string, updates: Partial<IChat>): Promise<IChat | null> {
    try {
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, userId: new Types.ObjectId(userId) },
        { ...updates, 'metadata.lastActivity': new Date() },
        { new: true, runValidators: true }
      )

      if (chat) {
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
      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      })

      if (!chat) {
        return false
      }

      await ChatMessage.deleteMany({ chatId: new Types.ObjectId(chatId) })
      await Chat.findByIdAndDelete(chatId)

      if (chat.projectId) {
        await Project.findByIdAndUpdate(chat.projectId, { $unset: { chatId: 1 } })
      }

      return true
    } catch (error) {
      logger.error('Delete chat failed:', error)
      throw error
    }
  }
}

export default new ChatService()
