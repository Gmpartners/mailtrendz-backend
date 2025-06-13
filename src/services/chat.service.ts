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
      // Verificar se já existe chat para o projeto
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

      // Vincular chat ao projeto
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

        // ✅ MELHORADO: Mensagem de boas-vindas mais informativa
        const welcomeMessage = new ChatMessage({
          chatId: chat._id,
          type: 'ai',
          content: `Olá! 👋 Este é o chat inteligente do seu projeto "${project.name}". 

**Posso ajudar você a:**
• ✏️ Editar textos e títulos
• 🎨 Alterar cores e design  
• 📝 Melhorar conteúdo para conversão
• 🚀 Otimizar elementos visuais
• 📧 Modificar assunto e preview

**Como usar:**
- Seja específico: *"mude o botão para azul"*
- Peça melhorias: *"deixe o título mais urgente"*
- Solicite mudanças: *"adicione um desconto de 20%"*
- Teste variações: *"faça uma versão mais formal"*

**✨ IA Inteligente Ativa:** Suas modificações serão aplicadas automaticamente ao email!

**Projeto atual carregado:** ${project.content?.subject || 'Sem assunto'}
Digite o que gostaria de modificar!`,
          metadata: {
            isWelcome: true,
            enhancedFeatures: ['contexto-projeto', 'modificacao-automatica'],
            projectContext: {
              hasContent: !!project.content?.html,
              projectType: project.type,
              projectIndustry: project.metadata?.industry
            }
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
        .limit(100)

      const userMessages = messages.filter(m => m.type === 'user').length
      const aiMessages = messages.filter(m => m.type === 'ai').length

      console.log('✅ [CHAT SERVICE] Chat encontrado com contexto completo:', {
        chatId: chat._id.toString(),
        messagesCount: messages.length,
        projectName: project.name,
        hasProjectContent: !!project.content?.html
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

  // ✅ CRÍTICO: Método sendMessage totalmente reescrito para aplicar modificações
  async sendMessage(chatId: string, userId: string, messageDto: SendMessageDto): Promise<MessageResponse> {
    try {
      console.log('💬 [CHAT SERVICE] Processando mensagem com IA Enhanced...')

      // Validações de entrada
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

      // ✅ CRUCIAL: Buscar projeto atual com conteúdo
      let projectToUpdate = null
      let projectContext: any = {
        userId,
        projectName: 'Chat Geral',
        type: 'campaign',
        industry: 'geral',
        tone: 'profissional',
        hasProjectContent: false,
        currentEmailContent: null
      }

      if (chat.projectId) {
        projectToUpdate = await Project.findById(chat.projectId)
        
        if (projectToUpdate) {
          projectContext = {
            userId,
            projectName: projectToUpdate.name,
            type: projectToUpdate.type,
            industry: projectToUpdate.metadata?.industry || 'geral',
            tone: projectToUpdate.metadata?.tone || 'profissional',
            targetAudience: projectToUpdate.metadata?.targetAudience,
            status: projectToUpdate.status,
            hasProjectContent: !!(projectToUpdate.content?.html),
            currentEmailContent: {
              subject: projectToUpdate.content?.subject,
              html: projectToUpdate.content?.html,
              text: projectToUpdate.content?.text,
              previewText: projectToUpdate.content?.previewText
            },
            originalPrompt: projectToUpdate.metadata?.originalPrompt
          }
        }
      }

      console.log('📊 [CHAT SERVICE] Contexto do projeto:', {
        hasProject: !!projectToUpdate,
        hasContent: projectContext.hasProjectContent,
        projectName: projectContext.projectName
      })

      // Criar mensagem do usuário
      const userMessage = new ChatMessage({
        chatId: new Types.ObjectId(chatId),
        type: 'user',
        content: messageDto.content.trim(),
        metadata: {
          enhancedProcessing: true,
          timestamp: new Date()
        }
      })

      await userMessage.save()
      console.log('✅ [CHAT SERVICE] Mensagem do usuário salva')

      // ✅ CRÍTICO: Processamento com Enhanced AI
      let aiContent = 'Desculpe, houve um problema temporário. Tente novamente.'
      let shouldUpdateEmail = false
      let projectUpdated = false
      let enhancedResponse: any = null

      try {
        // Buscar histórico recente para contexto
        const recentMessages = await ChatMessage.find({ chatId: new Types.ObjectId(chatId) })
          .sort({ createdAt: -1 })
          .limit(20)

        const chatHistory = recentMessages.reverse().map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.createdAt
        }))

        console.log('🧠 [CHAT SERVICE] Chamando Enhanced AI com contexto completo...')

        // Health check do Enhanced AI
        const aiHealthCheck = await EnhancedAIService.healthCheck()
        console.log('🏥 [CHAT SERVICE] AI Health:', aiHealthCheck.status)

        if (aiHealthCheck.status === 'available') {
          // Chamar Enhanced AI
          enhancedResponse = await EnhancedAIService.smartChatWithAI(
            messageDto.content,
            chatHistory,
            projectContext
          )

          aiContent = enhancedResponse.response
          shouldUpdateEmail = enhancedResponse.shouldUpdateEmail || false

          console.log('✅ [ENHANCED AI] Resposta processada:', {
            shouldUpdateEmail,
            hasEnhancedContent: !!enhancedResponse.enhancedContent,
            confidence: enhancedResponse.analysis?.confidence
          })

          // ✅ CRÍTICO: Aplicar modificações no projeto se necessário
          if (shouldUpdateEmail && projectToUpdate && enhancedResponse.enhancedContent) {
            try {
              console.log('📧 [CHAT SERVICE] APLICANDO MODIFICAÇÕES NO PROJETO...')

              const updates: any = {}
              
              // Atualizar campos que foram modificados
              if (enhancedResponse.enhancedContent.subject) {
                updates['content.subject'] = enhancedResponse.enhancedContent.subject
              }
              
              if (enhancedResponse.enhancedContent.previewText) {
                updates['content.previewText'] = enhancedResponse.enhancedContent.previewText
              }
              
              if (enhancedResponse.enhancedContent.html) {
                updates['content.html'] = enhancedResponse.enhancedContent.html
              }
              
              if (enhancedResponse.enhancedContent.text) {
                updates['content.text'] = enhancedResponse.enhancedContent.text
              }
              
              // Incrementar versão
              updates['metadata.version'] = (projectToUpdate.metadata?.version || 1) + 1
              updates['metadata.lastModification'] = {
                by: 'ai-chat',
                message: messageDto.content,
                timestamp: new Date(),
                analysis: enhancedResponse.analysis
              }

              // ✅ APLICAR MUDANÇAS NO PROJETO  
              const updatedProject = await Project.findByIdAndUpdate(
                projectToUpdate._id,
                { $set: updates },
                { new: true, runValidators: true }
              )

              if (updatedProject) {
                projectUpdated = true
                
                // Incrementar contador de atualizações do chat
                await Chat.findByIdAndUpdate(chatId, {
                  $inc: { 'metadata.emailUpdates': 1 },
                  $set: { 'metadata.lastActivity': new Date() }
                })

                console.log('✅ [CHAT SERVICE] PROJETO ATUALIZADO COM SUCESSO!', {
                  projectId: projectToUpdate._id,
                  version: updates['metadata.version'],
                  hasNewHTML: !!enhancedResponse.enhancedContent.html,
                  hasNewSubject: !!enhancedResponse.enhancedContent.subject
                })
              }
            } catch (updateError: any) {
              console.error('❌ [CHAT SERVICE] ERRO ao atualizar projeto:', {
                error: updateError.message,
                projectId: projectToUpdate._id
              })
              
              // Adicionar aviso na resposta da IA
              aiContent += '\n\n⚠️ Houve um problema ao aplicar as modificações. O conteúdo foi processado mas não foi salvo automaticamente.'
            }
          }
        } else {
          console.warn('⚠️ [CHAT SERVICE] Enhanced AI indisponível, usando resposta padrão')
          aiContent = `Entendi sua mensagem sobre "${messageDto.content.substring(0, 50)}${messageDto.content.length > 50 ? '...' : ''}".

O serviço de IA Enhanced está temporariamente indisponível. Tente novamente em alguns momentos.

Se o problema persistir:
• Reformule sua pergunta
• Seja mais específico
• Entre em contato com o suporte`
        }
      } catch (aiError: any) {
        console.error('❌ [CHAT SERVICE] Erro no Enhanced AI:', {
          message: aiError.message,
          stack: aiError.stack?.split('\n').slice(0, 3).join('\n')
        })
        
        aiContent = `Entendi sua solicitação sobre "${messageDto.content.substring(0, 50)}${messageDto.content.length > 50 ? '...' : ''}".

Houve um problema temporário com o serviço de IA inteligente. 

**O que você pode fazer:**
• Aguarde alguns momentos e tente novamente
• Reformule sua pergunta de forma mais direta
• Seja mais específico sobre a modificação desejada

Obrigado pela paciência! 🙏`
      }

      // Criar mensagem da IA
      const aiMessage = new ChatMessage({
        chatId: new Types.ObjectId(chatId),
        type: 'ai',
        content: aiContent,
        metadata: {
          emailUpdated: shouldUpdateEmail,
          projectUpdated: projectUpdated,
          suggestions: enhancedResponse?.suggestions || [],
          model: enhancedResponse?.metadata?.model || 'fallback',
          confidence: enhancedResponse?.metadata?.confidence || 0.5,
          enhancedFeatures: enhancedResponse?.metadata?.enhancedFeatures || ['fallback-response'],
          executionTime: enhancedResponse?.metadata?.processingTime || 0,
          projectContext: {
            hasProject: !!projectToUpdate,
            hasContent: projectContext.hasProjectContent,
            projectName: projectContext.projectName
          },
          analysisData: enhancedResponse?.analysis || null,
          modificationsApplied: shouldUpdateEmail ? enhancedResponse?.enhancedContent || {} : null
        }
      })

      await aiMessage.save()
      console.log('✅ [CHAT SERVICE] Mensagem da IA salva')

      // Atualizar metadata do chat
      await Chat.findByIdAndUpdate(chatId, {
        $inc: { 'metadata.totalMessages': 2 },
        $set: { 'metadata.lastActivity': new Date() }
      })

      console.log('🎉 [CHAT SERVICE] PROCESSAMENTO COMPLETO:', {
        projectUpdated,
        shouldUpdateEmail,
        hasEnhancedResponse: !!enhancedResponse,
        messageId: aiMessage._id
      })

      return {
        userMessage: convertMessageToInterface(userMessage),
        aiMessage: convertMessageToInterface(aiMessage),
        projectUpdated
      }
    } catch (error: any) {
      console.error('❌ [CHAT SERVICE] ERRO CRÍTICO ao enviar mensagem:', {
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 10).join('\n'),
        chatId,
        userId
      })
      
      logger.error('Send message failed:', error)
      throw error
    }
  }

  async updateChat(chatId: string, userId: string, updates: UpdateChatDto): Promise<IChat | null> {
    try {
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

      // Desvincular do projeto
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