import { Types } from 'mongoose'
import { Chat, IChatDocument } from '../models/Chat.model'
import { ChatMessage, IChatMessageDocument } from '../models/ChatMessage.model'
import { Project } from '../models/Project.model'
import { User } from '../models/User.model'
import {
  IChat,
  IChatMessage,
  CreateChatDto,
  SendMessageDto,
  ChatFilters,
  ChatResponse,
  MessagesResponse
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
    isActive: chat.isActive,
    metadata: chat.metadata,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  }
}

const convertMessageToInterface = (message: IChatMessageDocument): IChatMessage => {
  return {
    _id: message._id as Types.ObjectId,
    id: message._id.toString(),
    chatId: message.chatId,
    type: message.type,
    content: message.content,
    timestamp: message.timestamp,
    metadata: message.metadata
  }
}

class ChatService {
  async getChatsForUser(userId: string, filters: ChatFilters): Promise<ChatResponse> {
    try {
      const query: any = { userId: new Types.ObjectId(userId) }
      
      if (filters.projectId) {
        query.projectId = new Types.ObjectId(filters.projectId)
      }
      
      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: 'i' } },
          { 'metadata.lastMessage': { $regex: filters.search, $options: 'i' } }
        ]
      }

      const page = filters.pagination?.page || 1
      const limit = filters.pagination?.limit || PAGINATION.DEFAULT_LIMIT
      const skip = (page - 1) * limit

      const [chats, totalItems] = await Promise.all([
        Chat.find(query)
          .sort({ 'metadata.lastActivity': -1 })
          .skip(skip)
          .limit(limit)
          .populate('projectId', 'name type'),
        Chat.countDocuments(query)
      ])

      const totalPages = Math.ceil(totalItems / limit)

      return {
        chats: chats.map(convertChatToInterface),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      logger.error('Get chats for user failed:', error)
      throw error
    }
  }

  async getChatById(chatId: string, userId: string): Promise<IChat | null> {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      }).populate('projectId', 'name type')

      return chat ? convertChatToInterface(chat) : null
    } catch (error) {
      logger.error('Get chat by ID failed:', error)
      throw error
    }
  }

  async getChatByProject(projectId: string, userId: string): Promise<IChat | null> {
    try {
      const chat = await Chat.findOne({
        projectId: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId)
      }).populate('projectId', 'name type')

      return chat ? convertChatToInterface(chat) : null
    } catch (error) {
      logger.error('Get chat by project failed:', error)
      throw error
    }
  }

  async createChat(userId: string, createChatDto: CreateChatDto): Promise<IChat> {
    try {
      const chat = new Chat({
        userId: new Types.ObjectId(userId),
        projectId: createChatDto.projectId ? new Types.ObjectId(createChatDto.projectId) : undefined,
        title: createChatDto.title || 'Novo Chat Inteligente',
        isActive: true,
        metadata: {
          totalMessages: 0,
          lastActivity: new Date(),
          enhancedMode: true
        }
      })

      await chat.save()

      logger.info('Chat created', {
        chatId: chat._id.toString(),
        userId,
        projectId: createChatDto.projectId
      })

      return convertChatToInterface(chat)
    } catch (error) {
      logger.error('Create chat failed:', error)
      throw error
    }
  }

  async getMessagesForChat(chatId: string, userId: string, filters: any): Promise<MessagesResponse> {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      })

      if (!chat) {
        throw new Error('Chat não encontrado')
      }

      const page = filters.page || 1
      const limit = filters.limit || 50
      const skip = (page - 1) * limit

      const [messages, totalItems] = await Promise.all([
        ChatMessage.find({ chatId: new Types.ObjectId(chatId) })
          .sort({ timestamp: 1 })
          .skip(skip)
          .limit(limit),
        ChatMessage.countDocuments({ chatId: new Types.ObjectId(chatId) })
      ])

      const totalPages = Math.ceil(totalItems / limit)

      return {
        messages: messages.map(convertMessageToInterface),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      logger.error('Get messages for chat failed:', error)
      throw error
    }
  }

  async sendMessage(chatId: string, userId: string, messageDto: SendMessageDto): Promise<{
    userMessage: IChatMessage
    aiMessage: IChatMessage
    projectUpdated?: boolean
  }> {
    try {
      console.log('💬 [CHAT SERVICE] Processando mensagem com Enhanced AI:', {
        chatId,
        userId,
        messageLength: messageDto.content.length
      })

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
        timestamp: new Date(),
        metadata: {
          enhancedProcessing: true
        }
      })

      await userMessage.save()

      const recentMessages = await ChatMessage.find({ chatId: new Types.ObjectId(chatId) })
        .sort({ timestamp: -1 })
        .limit(10)

      const chatHistory = recentMessages.reverse().map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
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
        timestamp: new Date(),
        metadata: {
          shouldUpdateEmail: enhancedResponse.shouldUpdateEmail,
          suggestions: enhancedResponse.suggestions,
          model: enhancedResponse.metadata.model,
          confidence: enhancedResponse.metadata.confidence,
          enhancedFeatures: enhancedResponse.metadata.enhancedFeatures,
          processingTime: enhancedResponse.metadata.processingTime
        }
      })

      await aiMessage.save()

      await Chat.findByIdAndUpdate(chatId, {
        $inc: { 'metadata.totalMessages': 2 },
        $set: { 
          'metadata.lastActivity': new Date(),
          'metadata.lastMessage': messageDto.content.substring(0, 100)
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

          console.log('✅ [CHAT SERVICE] Projeto atualizado automaticamente via Enhanced AI')
        } catch (updateError) {
          console.error('❌ [CHAT SERVICE] Erro ao atualizar projeto:', updateError)
        }
      }

      logger.info('Message processed with Enhanced AI', {
        chatId,
        userId,
        shouldUpdateEmail: enhancedResponse.shouldUpdateEmail,
        projectUpdated,
        confidence: enhancedResponse.metadata.confidence,
        suggestions: enhancedResponse.suggestions.length
      })

      return {
        userMessage: convertMessageToInterface(userMessage),
        aiMessage: convertMessageToInterface(aiMessage),
        projectUpdated
      }
    } catch (error) {
      logger.error('Send message with Enhanced AI failed:', error)
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

      logger.info('Chat deleted', { chatId, userId })
      return true
    } catch (error) {
      logger.error('Delete chat failed:', error)
      throw error
    }
  }

  async getChatStats(userId: string): Promise<any> {
    try {
      const stats = await Chat.aggregate([
        { $match: { userId: new Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            totalMessages: { $sum: '$metadata.totalMessages' },
            activeChats: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            }
          }
        }
      ])

      return stats[0] || {
        totalChats: 0,
        totalMessages: 0,
        activeChats: 0
      }
    } catch (error) {
      logger.error('Get chat stats failed:', error)
      throw error
    }
  }
}

export default new ChatService()
