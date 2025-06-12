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
  UpdateChatDto,
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
    userId: chat.userId.toString(),
    projectId: chat.projectId?.toString(),
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
    chatId: message.chatId.toString(),
    type: message.type as 'user' | 'ai' | 'system',
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
          emailUpdates: 0
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
            emailUpdates: 0
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
      console.log('📊 [CHAT SERVICE] Dados de entrada:', {
        chatId,
        userId,
        messageLength: messageDto.content?.length,
        messageType: messageDto.type || 'user'
      })

      // ✅ NOVO: Validação de entrada mais robusta
      if (!chatId || !Types.ObjectId.isValid(chatId)) {
        throw new Error('ID do chat inválido')
      }

      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new Error('ID do usuário inválido')
      }

      if (!messageDto?.content?.trim()) {
        throw new Error('Conteúdo da mensagem é obrigatório')
      }

      const chat = await Chat.findOne({
        _id: chatId,
        userId: new Types.ObjectId(userId)
      }).populate('projectId')

      if (!chat) {
        throw new Error('Chat não encontrado')
      }

      console.log('✅ [CHAT SERVICE] Chat encontrado:', {
        chatId: chat._id.toString(),
        hasProject: !!chat.projectId
      })

      // Criar mensagem do usuário
      const userMessage = new ChatMessage({
        chatId: new Types.ObjectId(chatId),
        type: 'user',
        content: messageDto.content.trim(),
        metadata: {
          enhancedProcessing: true
        }
      })

      await userMessage.save()
      console.log('✅ [CHAT SERVICE] Mensagem do usuário salva:', userMessage._id.toString())

      // ✅ CORREÇÃO CRÍTICA: Try-catch para o Enhanced AI
      let enhancedResponse: any
      let aiContent = 'Desculpe, houve um problema temporário. Tente novamente em alguns momentos.'
      let shouldUpdateEmail = false
      let projectUpdated = false

      try {
        // Buscar histórico completo para contexto
        const recentMessages = await ChatMessage.find({ chatId: new Types.ObjectId(chatId) })
          .sort({ createdAt: -1 })
          .limit(20)

        const chatHistory = recentMessages.reverse().map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.createdAt
        }))

        console.log('📚 [CHAT SERVICE] Histórico carregado:', {
          mensagensCarregadas: chatHistory.length
        })

        // Contexto completo do projeto
        let projectContext: any = {
          userId,
          projectName: 'Chat Geral',
          type: 'campaign',
          industry: 'geral',
          tone: 'profissional',
          hasProjectContent: false,
          currentEmailContent: null
        }

        let projectToUpdate = null

        if (chat.projectId) {
          const project = chat.projectId as any
          projectToUpdate = project

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

          // Detectar intenção de modificação
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
            projectName: project.name
          })
        }

        console.log('🧠 [CHAT SERVICE] Chamando Enhanced AI...')
        
        // ✅ NOVO: Health check do Enhanced AI antes de usar
        const aiHealthCheck = await EnhancedAIService.healthCheck()
        console.log('🏥 [CHAT SERVICE] AI Health Check:', aiHealthCheck)

        if (aiHealthCheck.status === 'unavailable') {
          console.warn('⚠️ [CHAT SERVICE] Enhanced AI indisponível, usando resposta padrão')
          aiContent = 'O serviço de IA está temporariamente indisponível. Por favor, tente novamente em alguns momentos.'
        } else {
          // Chamar Enhanced AI com contexto completo
          enhancedResponse = await EnhancedAIService.smartChatWithAI(
            messageDto.content,
            chatHistory,
            projectContext
          )

          aiContent = enhancedResponse.response
          shouldUpdateEmail = enhancedResponse.shouldUpdateEmail || shouldUpdateEmail

          console.log('✅ [CHAT SERVICE] Enhanced AI respondeu:', {
            contentLength: aiContent.length,
            shouldUpdateEmail,
            confidence: enhancedResponse.metadata?.confidence
          })

          // Atualizar projeto se necessário
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
        }
      } catch (aiError: any) {
        console.error('❌ [CHAT SERVICE] Erro no Enhanced AI:', {
          message: aiError.message,
          stack: aiError.stack?.split('\n').slice(0, 5).join('\n')
        })
        
        // Resposta de fallback em caso de erro na IA
        aiContent = `Entendi sua mensagem sobre "${messageDto.content.substring(0, 50)}${messageDto.content.length > 50 ? '...' : ''}". 

Houve um problema temporário com o serviço de IA inteligente. Por favor, tente novamente em alguns momentos.

Se o problema persistir, você pode:
• Reformular sua pergunta de forma mais direta
• Tentar uma ação mais específica
• Entrar em contato com o suporte

Obrigado pela paciência! 🙏`
      }

      // Criar mensagem da IA
      const aiMessage = new ChatMessage({
        chatId: new Types.ObjectId(chatId),
        type: 'ai',
        content: aiContent,
        metadata: {
          emailUpdated: shouldUpdateEmail,
          suggestions: enhancedResponse?.suggestions || [],
          model: enhancedResponse?.metadata?.model || 'fallback',
          confidence: enhancedResponse?.metadata?.confidence || 0.5,
          enhancedFeatures: enhancedResponse?.metadata?.enhancedFeatures || ['fallback-response'],
          executionTime: enhancedResponse?.metadata?.processingTime || 0,
          projectContextUsed: !!chat.projectId,
          isErrorFallback: !enhancedResponse
        }
      })

      await aiMessage.save()
      console.log('✅ [CHAT SERVICE] Mensagem da IA salva:', aiMessage._id.toString())

      // Atualizar metadata do chat
      await Chat.findByIdAndUpdate(chatId, {
        $inc: { 'metadata.totalMessages': 2 },
        $set: { 
          'metadata.lastActivity': new Date()
        }
      })

      console.log('✅ [CHAT SERVICE] Mensagem processada com sucesso:', {
        projectUpdated,
        shouldUpdateEmail,
        hasEnhancedResponse: !!enhancedResponse
      })

      return {
        userMessage: convertMessageToInterface(userMessage),
        aiMessage: convertMessageToInterface(aiMessage),
        projectUpdated
      }
    } catch (error: any) {
      console.error('❌ [CHAT SERVICE] Erro crítico ao enviar mensagem:', {
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        chatId,
        userId
      })
      
      logger.error('Send message failed:', error)
      throw error
    }
  }

  // ✅ CORREÇÃO: Método updateChat corrigido para aceitar UpdateChatDto
  async updateChat(chatId: string, userId: string, updates: UpdateChatDto): Promise<IChat | null> {
    try {
      // Construir objeto de atualização compatível com o modelo
      const updateObject: any = {
        'metadata.lastActivity': new Date()
      }

      if (updates.title !== undefined) {
        updateObject.title = updates.title
      }

      if (updates.isActive !== undefined) {
        updateObject.isActive = updates.isActive
      }

      if (updates.metadata) {
        if (updates.metadata.totalMessages !== undefined) {
          updateObject['metadata.totalMessages'] = updates.metadata.totalMessages
        }
        if (updates.metadata.emailUpdates !== undefined) {
          updateObject['metadata.emailUpdates'] = updates.metadata.emailUpdates
        }
        if (updates.metadata.lastActivity !== undefined) {
          updateObject['metadata.lastActivity'] = updates.metadata.lastActivity
        }
        if (updates.metadata.enhancedMode !== undefined) {
          updateObject['metadata.enhancedMode'] = updates.metadata.enhancedMode
        }
        if (updates.metadata.enhancedAIEnabled !== undefined) {
          updateObject['metadata.enhancedAIEnabled'] = updates.metadata.enhancedAIEnabled
        }
      }

      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, userId: new Types.ObjectId(userId) },
        { $set: updateObject },
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
