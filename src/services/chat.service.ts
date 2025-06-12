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
      // ✅ CORREÇÃO: Verificar se já existe chat para o projeto
      if (createChatDto.projectId) {
        const existingChat = await Chat.findOne({
          userId: new Types.ObjectId(userId),
          projectId: new Types.ObjectId(createChatDto.projectId)
        })

        if (existingChat) {
          logger.info('Chat already exists for project, returning existing', { 
            chatId: existingChat._id, 
            projectId: createChatDto.projectId 
          })

          // Buscar mensagens do chat existente
          const messages = await ChatMessage.find({ chatId: existingChat._id })
            .sort({ createdAt: 1 })
            .limit(50)

          const project = await Project.findById(createChatDto.projectId)

          return {
            chat: convertChatToInterface(existingChat),
            messages: messages.map(convertMessageToInterface),
            project: project ? {
              id: project._id.toString(),
              name: project.name,
              type: project.type
            } : {
              id: createChatDto.projectId,
              name: 'Projeto',
              type: 'email'
            },
            stats: {
              totalMessages: messages.length,
              userMessages: messages.filter(m => m.type === 'user').length,
              aiMessages: messages.filter(m => m.type === 'ai').length,
              emailUpdates: existingChat.metadata.emailUpdates,
              lastActivity: existingChat.metadata.lastActivity
            }
          }
        }
      }

      // Criar novo chat
      const chat = new Chat({
        userId: new Types.ObjectId(userId),
        projectId: createChatDto.projectId ? new Types.ObjectId(createChatDto.projectId) : undefined,
        title: createChatDto.title || 'Chat Inteligente',
        isActive: true,
        metadata: {
          totalMessages: 0,
          lastActivity: new Date(),
          emailUpdates: 0,
          enhancedAIEnabled: true
        }
      })

      await chat.save()

      // ✅ CORREÇÃO: Vincular chat ao projeto
      if (createChatDto.projectId) {
        await Project.findByIdAndUpdate(createChatDto.projectId, {
          chatId: chat._id
        })
      }

      const project = createChatDto.projectId ? 
        await Project.findById(createChatDto.projectId) : null

      logger.info('New chat created successfully', { 
        chatId: chat._id, 
        projectId: createChatDto.projectId,
        userId 
      })

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
      console.log('🔍 [CHAT SERVICE] Buscando chat por projeto:', { projectId, userId })

      // ✅ CORREÇÃO: Busca mais robusta
      let chat = await Chat.findOne({
        projectId: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId)
      })

      const project = await Project.findById(projectId)

      if (!project) {
        throw new Error('Projeto não encontrado')
      }

      // Se não existe chat, criar automaticamente
      if (!chat) {
        console.log('📝 [CHAT SERVICE] Chat não existe, criando automaticamente...')
        
        chat = new Chat({
          userId: new Types.ObjectId(userId),
          projectId: new Types.ObjectId(projectId),
          title: `Chat - ${project.name}`,
          isActive: true,
          metadata: {
            totalMessages: 0,
            lastActivity: new Date(),
            emailUpdates: 0,
            enhancedAIEnabled: true
          }
        })

        await chat.save()

        // Vincular ao projeto
        await Project.findByIdAndUpdate(projectId, {
          chatId: chat._id
        })

        // ✅ NOVO: Criar mensagem de boas-vindas automaticamente
        const welcomeMessage = new ChatMessage({
          chatId: chat._id,
          type: 'ai',
          content: `Olá! 👋 Este é o chat inteligente do seu projeto "${project.name}". 

Posso ajudar você a:
• ✏️ Editar o conteúdo do email
• 🎨 Alterar cores e design
• 📝 Melhorar textos e títulos
• 🚀 Otimizar para conversão

**Como usar:**
- Seja específico: "mude o botão para azul" 
- Peça melhorias: "deixe o título mais urgente"
- Solicite mudanças: "adicione um desconto de 20%"

O projeto atual tem o conteúdo carregado. Diga o que gostaria de modificar!`,
          metadata: {
            isWelcome: true,
            enhancedFeatures: ['contexto-projeto', 'modificacao-automatica']
          }
        })

        await welcomeMessage.save()

        // Atualizar contador de mensagens
        chat.metadata.totalMessages = 1
        await chat.save()

        console.log('✅ [CHAT SERVICE] Chat criado com mensagem de boas-vindas')
      }

      // Buscar mensagens do chat
      const messages = await ChatMessage.find({ chatId: chat._id })
        .sort({ createdAt: 1 })
        .limit(100) // ✅ CORREÇÃO: Aumentar limite de mensagens

      const userMessages = messages.filter(m => m.type === 'user').length
      const aiMessages = messages.filter(m => m.type === 'ai').length

      console.log('✅ [CHAT SERVICE] Chat encontrado com contexto completo:', {
        chatId: chat._id.toString(),
        messagesCount: messages.length,
        projectName: project.name
      })

      return {
        chat: convertChatToInterface(chat),
        messages: messages.map(convertMessageToInterface),
        project: {
          id: project._id.toString(),
          name: project.name,
          type: project.type
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
      console.log('💬 [CHAT SERVICE] Processando mensagem com contexto completo...')

      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      }).populate('projectId')

      if (!chat) {
        throw new Error('Chat não encontrado')
      }

      // Criar mensagem do usuário
      const userMessage = new ChatMessage({
        chatId: new Types.ObjectId(chatId),
        type: 'user',
        content: messageDto.content,
        metadata: {
          enhancedProcessing: true
        }
      })

      await userMessage.save()

      // ✅ CORREÇÃO CRÍTICA: Buscar histórico completo para contexto
      const recentMessages = await ChatMessage.find({ chatId: new Types.ObjectId(chatId) })
        .sort({ createdAt: -1 })
        .limit(20) // Histórico mais extenso

      const chatHistory = recentMessages.reverse().map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.createdAt
      }))

      // ✅ CORREÇÃO CRÍTICA: Contexto completo do projeto
      let projectContext: any = {
        userId,
        projectName: 'Chat Geral',
        type: 'campaign',
        industry: 'geral',
        tone: 'profissional',
        hasProjectContent: false,
        currentEmailContent: null
      }

      let shouldUpdateEmail = false
      let projectToUpdate = null

      if (chat.projectId) {
        const project = chat.projectId as any
        projectToUpdate = project

        // ✅ NOVO: Incluir conteúdo atual do email no contexto
        projectContext = {
          userId,
          projectName: project.name,
          type: project.type,
          industry: project.metadata?.industry || 'geral',
          tone: project.metadata?.tone || 'profissional',
          targetAudience: project.metadata?.targetAudience,
          status: project.status,
          hasProjectContent: true,
          currentEmailContent: {
            subject: project.content?.subject,
            html: project.content?.html,
            text: project.content?.text,
            previewText: project.content?.previewText
          },
          originalPrompt: project.metadata?.originalPrompt
        }

        // ✅ NOVO: Detectar intenção de modificação
        const modificationKeywords = [
          'mude', 'altere', 'modifique', 'troque', 'substitua',
          'edite', 'corrija', 'ajuste', 'melhore', 'otimize',
          'adicione', 'remova', 'inclua', 'retire', 'delete',
          'cor', 'botão', 'título', 'texto', 'assunto',
          'desconto', 'preço', 'valor', 'data', 'prazo'
        ]

        shouldUpdateEmail = modificationKeywords.some(keyword => 
          messageDto.content.toLowerCase().includes(keyword)
        )

        console.log('🔍 [CHAT SERVICE] Análise de intenção:', {
          shouldUpdateEmail,
          hasContent: !!project.content?.html,
          messageLength: messageDto.content.length
        })
      }

      // ✅ NOVO: Usar Enhanced AI com contexto completo
      const enhancedResponse = await EnhancedAIService.smartChatWithAI(
        messageDto.content,
        chatHistory,
        projectContext
      )

      // Criar mensagem da IA
      const aiMessage = new ChatMessage({
        chatId: new Types.ObjectId(chatId),
        type: 'ai',
        content: enhancedResponse.response,
        metadata: {
          emailUpdated: enhancedResponse.shouldUpdateEmail || shouldUpdateEmail,
          suggestions: enhancedResponse.suggestions,
          model: enhancedResponse.metadata.model,
          confidence: enhancedResponse.metadata.confidence,
          enhancedFeatures: enhancedResponse.metadata.enhancedFeatures,
          executionTime: enhancedResponse.metadata.processingTime,
          projectContextUsed: projectContext.hasProjectContent
        }
      })

      await aiMessage.save()

      // ✅ CORREÇÃO CRÍTICA: Atualizar projeto se necessário
      let projectUpdated = false
      if ((enhancedResponse.shouldUpdateEmail || shouldUpdateEmail) && 
          projectToUpdate && 
          enhancedResponse.enhancedContent) {
        
        try {
          console.log('📧 [CHAT SERVICE] Atualizando projeto com novo conteúdo...')

          await Project.findByIdAndUpdate(projectToUpdate._id, {
            $set: {
              'content.subject': enhancedResponse.enhancedContent.subject || projectToUpdate.content?.subject,
              'content.previewText': enhancedResponse.enhancedContent.previewText || projectToUpdate.content?.previewText,
              'content.html': enhancedResponse.enhancedContent.html || projectToUpdate.content?.html,
              'content.text': enhancedResponse.enhancedContent.text || 
                             enhancedResponse.enhancedContent.html?.replace(/<[^>]*>/g, '') ||
                             projectToUpdate.content?.text
            },
            $inc: { 'metadata.version': 1 }
          })

          projectUpdated = true
          
          // Incrementar contador de atualizações do chat
          await Chat.findByIdAndUpdate(chatId, {
            $inc: { 'metadata.emailUpdates': 1 }
          })

          console.log('✅ [CHAT SERVICE] Projeto atualizado com sucesso')
        } catch (updateError) {
          console.error('❌ [CHAT SERVICE] Erro ao atualizar projeto:', updateError)
        }
      }

      // Atualizar metadata do chat
      await Chat.findByIdAndUpdate(chatId, {
        $inc: { 'metadata.totalMessages': 2 },
        $set: { 
          'metadata.lastActivity': new Date()
        }
      })

      console.log('✅ [CHAT SERVICE] Mensagem processada com sucesso:', {
        projectUpdated,
        shouldUpdateEmail: enhancedResponse.shouldUpdateEmail || shouldUpdateEmail,
        confidence: enhancedResponse.metadata?.confidence
      })

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

      // ✅ CORREÇÃO: Desvincular do projeto
      if (chat.projectId) {
        await Project.findByIdAndUpdate(chat.projectId, { 
          $unset: { chatId: 1 } 
        })
      }

      // Deletar mensagens
      await ChatMessage.deleteMany({ chatId: new Types.ObjectId(chatId) })
      
      // Deletar chat
      await Chat.findByIdAndDelete(chatId)

      logger.info('Chat and messages deleted successfully', { chatId, userId })
      return true
    } catch (error) {
      logger.error('Delete chat failed:', error)
      throw error
    }
  }
}

export default new ChatService()