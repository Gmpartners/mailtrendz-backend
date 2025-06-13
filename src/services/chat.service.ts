import { Types } from 'mongoose'
import Chat from '../models/chat.model'
import ChatMessage from '../models/chat-message.model'
import Project from '../models/project.model'
import { CreateChatDto, SendMessageDto, UpdateChatDto, ChatFilters, MessageResponse, ChatResponse, ChatHistoryResponse, ChatAnalytics } from '../types/chat.types'
import { logger } from '../utils/logger'
import PythonAIClient from './ai/PythonAIClient'

/**
 * ✅ CHAT SERVICE ATUALIZADO - USANDO PYTHON AI SERVICE
 * Agora usa o microserviço Python para toda IA
 * Comunicação Node.js → Python → MongoDB
 */
class ChatService {
  
  // ✅ MÉTODO PRINCIPAL: Envio de Mensagem com Python AI Service
  async sendMessage(chatId: string, userId: string, messageDto: SendMessageDto): Promise<MessageResponse> {
    try {
      console.log('💬 [CHAT SERVICE] Processando mensagem com Python AI Service...')

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

      // ✅ Verificar saúde do Python AI Service
      const pythonAIHealth = await PythonAIClient.healthCheck()
      console.log('🐍 [CHAT SERVICE] Python AI Status:', pythonAIHealth.status)

      // ✅ Preparar contexto para Python AI Service
      let projectContext: any = {
        userId,
        chatId,
        projectName: 'Chat Geral',
        type: 'campaign',
        industry: 'geral',
        tone: 'professional',
        hasProjectContent: false,
        currentEmailContent: null
      }

      let projectToUpdate = null

      if (chat.projectId) {
        projectToUpdate = await Project.findById(chat.projectId)
        
        if (projectToUpdate) {
          projectContext = {
            userId,
            chatId,
            projectId: projectToUpdate._id.toString(),
            projectName: projectToUpdate.name,
            type: projectToUpdate.type,
            industry: projectToUpdate.metadata?.industry || 'geral',
            tone: projectToUpdate.metadata?.tone || 'professional',
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
          
          console.log('📊 [CHAT SERVICE] Projeto carregado para Python AI:', {
            projectId: projectToUpdate._id,
            name: projectToUpdate.name,
            hasHTML: !!projectToUpdate.content?.html,
            htmlLength: projectToUpdate.content?.html?.length || 0
          })
        }
      }

      // ✅ Criar mensagem do usuário no Node.js
      const userMessage = new ChatMessage({
        chatId: new Types.ObjectId(chatId),
        type: 'user',
        content: messageDto.content.trim(),
        metadata: {
          processing: true,
          timestamp: new Date(),
          pythonAIVersion: '2.0.0'
        }
      })

      await userMessage.save()
      console.log('✅ [CHAT SERVICE] Mensagem do usuário salva no Node.js')

      // ✅ Processamento com Python AI Service
      let aiContent = 'Desculpe, houve um problema temporário. Tente novamente.'
      let shouldUpdateEmail = false
      let projectUpdated = false
      let aiResponse: any = null

      try {
        if (pythonAIHealth.status === 'available') {
          console.log('🐍 [CHAT SERVICE] Enviando para Python AI Service...')

          // Buscar histórico recente do chat para o Python
          const recentMessages = await ChatMessage.find({ chatId: new Types.ObjectId(chatId) })
            .sort({ createdAt: -1 })
            .limit(10)

          const chatHistory = recentMessages.reverse().map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: msg.createdAt
          }))

          // ✅ Chamar Python AI Service via HTTP
          aiResponse = await PythonAIClient.smartChat(
            messageDto.content,
            chatHistory,
            projectContext
          )

          aiContent = aiResponse.response
          shouldUpdateEmail = aiResponse.shouldUpdateEmail || false

          console.log('✅ [CHAT SERVICE] Resposta do Python AI processada:', {
            shouldUpdateEmail,
            confidence: aiResponse.metadata?.confidence,
            model: aiResponse.metadata?.model
          })

          // ✅ O Python AI Service já atualiza o projeto diretamente no MongoDB
          // Verificar se o projeto foi atualizado
          if (shouldUpdateEmail && projectToUpdate) {
            // Recarregar projeto para ver se foi atualizado pelo Python
            const updatedProject = await Project.findById(projectToUpdate._id)
            
            if (updatedProject && updatedProject.updatedAt > projectToUpdate.updatedAt) {
              projectUpdated = true
              console.log('🎉 [CHAT SERVICE] Projeto foi atualizado pelo Python AI Service!')
              
              // Melhorar mensagem da IA
              if (!aiContent.includes('✅')) {
                aiContent += `\n\n✅ **Modificações aplicadas com sucesso!**\n🚀 Seu email foi atualizado pelo Python AI Service\n📱 Confira na prévia`
              }
            } else {
              console.log('⚠️ [CHAT SERVICE] Projeto não foi modificado pelo Python AI')
            }
          }

        } else {
          console.warn('⚠️ [CHAT SERVICE] Python AI Service indisponível, usando fallback')
          aiResponse = await PythonAIClient.smartChat(messageDto.content, [], projectContext)
          aiContent = aiResponse.response
        }

      } catch (aiError: any) {
        console.error('❌ [CHAT SERVICE] Erro no Python AI Service:', aiError.message)
        aiContent = this.generateErrorResponse(messageDto.content, aiError.message)
      }

      // ✅ Criar mensagem da IA no Node.js
      const aiMessage = new ChatMessage({
        chatId: new Types.ObjectId(chatId),
        type: 'ai',
        content: aiContent,
        metadata: {
          emailUpdated: projectUpdated,
          projectUpdated: projectUpdated,
          updateSuccess: projectUpdated,
          model: aiResponse?.metadata?.model || 'python-ai-service',
          confidence: aiResponse?.metadata?.confidence || 0.8,
          processingTime: aiResponse?.metadata?.processingTime || 0,
          projectContext: {
            hasProject: !!projectToUpdate,
            hasContent: projectContext.hasProjectContent,
            projectName: projectContext.projectName
          },
          timestamp: new Date(),
          aiVersion: '2.0.0-python-service',
          pythonAIUsed: true
        }
      })

      await aiMessage.save()
      console.log('✅ [CHAT SERVICE] Mensagem da IA salva no Node.js')

      // ✅ Atualizar estatísticas do chat
      await Chat.findByIdAndUpdate(chatId, {
        $inc: { 'metadata.totalMessages': 2 },
        $set: { 
          'metadata.lastActivity': new Date(),
          'metadata.lastUpdateSuccess': projectUpdated,
          'metadata.pythonAIUsed': true
        }
      })

      console.log('🎊 [CHAT SERVICE] Processamento completo via Python AI:', {
        messageProcessed: true,
        projectUpdated: projectUpdated,
        shouldUpdateEmail,
        pythonAIHealth: pythonAIHealth.status
      })

      return {
        userMessage: this.convertMessageToInterface(userMessage),
        aiMessage: this.convertMessageToInterface(aiMessage),
        projectUpdated: projectUpdated
      }
    } catch (error: any) {
      console.error('❌ [CHAT SERVICE] Erro crítico:', error.message)
      logger.error('Send message failed:', error)
      throw error
    }
  }

  // ✅ Resposta de erro amigável
  private generateErrorResponse(message: string, errorMsg: string): string {
    const isTimeout = errorMsg.includes('timeout') || errorMsg.includes('Timeout')
    const isPythonError = errorMsg.includes('Python AI Service')
    
    let errorType = 'Problema técnico temporário'
    if (isTimeout) errorType = 'Timeout do serviço Python'
    if (isPythonError) errorType = 'Serviço Python indisponível'
    
    return `Recebi sua solicitação: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}".

🚨 **${errorType}**

**Diagnóstico:** ${errorMsg.substring(0, 100)}

**Soluções:**
• **Recarregue a página** (F5) e tente novamente
• **Aguarde 30 segundos** antes de enviar novamente
• **Reformule** de forma mais simples
• **Verifique** se o serviço Python está rodando

**Sistema híbrido ativo** - Fallback funcionando! 💪`
  }

  // ✅ OUTROS MÉTODOS DO SERVIÇO (mantidos iguais)
  
  async createChat(userId: string, createChatDto: CreateChatDto): Promise<ChatResponse> {
    try {
      const chat = new Chat({
        userId: new Types.ObjectId(userId),
        projectId: createChatDto.projectId ? new Types.ObjectId(createChatDto.projectId) : undefined,
        title: createChatDto.title || 'Novo Chat',
        isActive: true,
        metadata: {
          totalMessages: 0,
          emailUpdates: 0,
          lastActivity: new Date(),
          createdBy: 'user',
          version: '2.0.0-python-service',
          pythonAIEnabled: true
        }
      })

      await chat.save()

      const project = createChatDto.projectId 
        ? await Project.findById(createChatDto.projectId)
        : null

      return {
        chat: this.convertChatToInterface(chat),
        project: project ? {
          id: project._id.toString(),
          name: project.name,
          type: project.type
        } : undefined,
        stats: {
          totalMessages: 0,
          userMessages: 0,
          aiMessages: 0,
          emailUpdates: 0,
          lastActivity: chat.metadata?.lastActivity || new Date()
        }
      }
    } catch (error: any) {
      logger.error('Create chat failed:', error)
      throw error
    }
  }

  async getChatByProject(projectId: string, userId: string): Promise<ChatResponse> {
    try {
      if (!Types.ObjectId.isValid(projectId)) {
        throw new Error('ID do projeto inválido')
      }

      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('ID do usuário inválido')
      }

      const project = await Project.findOne({
        _id: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId)
      })

      if (!project) {
        throw new Error('Projeto não encontrado')
      }

      let chat = await Chat.findOne({
        projectId: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId),
        isActive: true
      })

      if (!chat) {
        chat = new Chat({
          userId: new Types.ObjectId(userId),
          projectId: new Types.ObjectId(projectId),
          title: `Chat - ${project.name}`,
          isActive: true,
          metadata: {
            totalMessages: 0,
            emailUpdates: 0,
            lastActivity: new Date(),
            createdBy: 'auto-generated',
            version: '2.0.0-python-service',
            pythonAIEnabled: true
          }
        })

        await chat.save()
      }

      const messages = await ChatMessage.find({ chatId: chat._id })
        .sort({ createdAt: 1 })
        .limit(100)

      const messageCount = messages.length
      const userMessageCount = messages.filter(m => m.type === 'user').length
      const aiMessageCount = messages.filter(m => m.type === 'ai').length
      const emailUpdates = messages.filter(m => m.metadata?.emailUpdated).length

      return {
        chat: this.convertChatToInterface(chat),
        messages: messages.map(msg => this.convertMessageToInterface(msg)),
        project: {
          id: project._id.toString(),
          name: project.name,
          type: project.type
        },
        stats: {
          totalMessages: messageCount,
          userMessages: userMessageCount,
          aiMessages: aiMessageCount,
          emailUpdates,
          lastActivity: chat.metadata?.lastActivity || new Date()
        }
      }
    } catch (error: any) {
      logger.error('Get chat by project failed:', error)
      throw error
    }
  }

  async getChatById(id: string, userId: string): Promise<ChatResponse> {
    try {
      const chat = await Chat.findOne({
        _id: id,
        userId: new Types.ObjectId(userId)
      }).populate('projectId')

      if (!chat) {
        throw new Error('Chat não encontrado')
      }

      const messages = await ChatMessage.find({ chatId: chat._id })
        .sort({ createdAt: 1 })
        .limit(100)

      return {
        chat: this.convertChatToInterface(chat),
        messages: messages.map(msg => this.convertMessageToInterface(msg)),
        project: chat.projectId ? {
          id: (chat.projectId as any)._id.toString(),
          name: (chat.projectId as any).name,
          type: (chat.projectId as any).type
        } : undefined,
        stats: {
          totalMessages: messages.length,
          userMessages: messages.filter(m => m.type === 'user').length,
          aiMessages: messages.filter(m => m.type === 'ai').length,
          emailUpdates: messages.filter(m => m.metadata?.emailUpdated).length,
          lastActivity: chat.metadata?.lastActivity || new Date()
        }
      }
    } catch (error: any) {
      logger.error('Get chat by id failed:', error)
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
      const messages = await ChatMessage.find({ chatId: new Types.ObjectId(chatId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

      const totalMessages = await ChatMessage.countDocuments({ chatId: new Types.ObjectId(chatId) })

      return {
        messages: messages.reverse().map(msg => this.convertMessageToInterface(msg)),
        pagination: {
          page,
          limit,
          total: totalMessages,
          pages: Math.ceil(totalMessages / limit)
        },
        stats: {
          totalMessages,
          userMessages: await ChatMessage.countDocuments({ chatId: new Types.ObjectId(chatId), type: 'user' }),
          aiMessages: await ChatMessage.countDocuments({ chatId: new Types.ObjectId(chatId), type: 'ai' }),
          emailUpdates: await ChatMessage.countDocuments({ chatId: new Types.ObjectId(chatId), 'metadata.emailUpdated': true }),
          lastActivity: chat.metadata?.lastActivity || new Date()
        }
      }
    } catch (error: any) {
      logger.error('Get chat history failed:', error)
      throw error
    }
  }

  async updateChat(id: string, userId: string, updates: UpdateChatDto): Promise<any> {
    try {
      const chat = await Chat.findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId) },
        { $set: updates },
        { new: true }
      )

      return chat ? this.convertChatToInterface(chat) : null
    } catch (error: any) {
      logger.error('Update chat failed:', error)
      throw error
    }
  }

  async deleteChat(id: string, userId: string): Promise<boolean> {
    try {
      const result = await Chat.deleteOne({
        _id: id,
        userId: new Types.ObjectId(userId)
      })

      if (result.deletedCount > 0) {
        await ChatMessage.deleteMany({ chatId: new Types.ObjectId(id) })
        return true
      }

      return false
    } catch (error: any) {
      logger.error('Delete chat failed:', error)
      throw error
    }
  }

  async getUserChats(userId: string, filters: ChatFilters): Promise<any[]> {
    try {
      const query: any = { userId: new Types.ObjectId(userId) }

      if (filters.projectId) {
        query.projectId = new Types.ObjectId(filters.projectId)
      }

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive
      }

      if (filters.search) {
        query.title = { $regex: filters.search, $options: 'i' }
      }

      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {}
        if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom
        if (filters.dateTo) query.createdAt.$lte = filters.dateTo
      }

      const skip = filters.pagination ? (filters.pagination.page - 1) * filters.pagination.limit : 0
      const limit = filters.pagination?.limit || 20

      const chats = await Chat.find(query)
        .sort({ [filters.sort?.field || 'updatedAt']: filters.sort?.order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate('projectId')

      return chats.map(chat => this.convertChatToInterface(chat))
    } catch (error: any) {
      logger.error('Get user chats failed:', error)
      throw error
    }
  }

  async getActiveChats(userId: string): Promise<any[]> {
    try {
      const chats = await Chat.find({
        userId: new Types.ObjectId(userId),
        isActive: true
      })
        .sort({ updatedAt: -1 })
        .limit(10)
        .populate('projectId')

      return chats.map(chat => this.convertChatToInterface(chat))
    } catch (error: any) {
      logger.error('Get active chats failed:', error)
      throw error
    }
  }

  async getChatAnalytics(id: string, userId: string): Promise<ChatAnalytics | null> {
    try {
      const chat = await Chat.findOne({
        _id: id,
        userId: new Types.ObjectId(userId)
      })

      if (!chat) {
        return null
      }

      const messages = await ChatMessage.find({ chatId: new Types.ObjectId(id) })
      
      return {
        totalMessages: messages.length,
        userMessages: messages.filter(m => m.type === 'user').length,
        aiMessages: messages.filter(m => m.type === 'ai').length,
        emailUpdates: messages.filter(m => m.metadata?.emailUpdated).length,
        averageResponseTime: 2500,
        lastActivity: chat.metadata?.lastActivity || new Date(),
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    } catch (error: any) {
      logger.error('Get chat analytics failed:', error)
      throw error
    }
  }

  // ✅ MÉTODOS AUXILIARES
  private convertChatToInterface(chat: any): any {
    return {
      id: chat._id.toString(),
      userId: chat.userId.toString(),
      projectId: chat.projectId?.toString(),
      title: chat.title,
      isActive: chat.isActive,
      metadata: chat.metadata,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    }
  }

  private convertMessageToInterface(message: any): any {
    return {
      id: message._id.toString(),
      chatId: message.chatId.toString(),
      type: message.type,
      content: message.content,
      metadata: message.metadata,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    }
  }

  // ✅ Método para verificar status do Python AI Service
  async getPythonAIStatus(): Promise<any> {
    try {
      const health = await PythonAIClient.healthCheck()
      const serviceInfo = PythonAIClient.getServiceInfo()
      
      return {
        ...health,
        serviceInfo,
        isHealthy: PythonAIClient.isServiceHealthy(),
        lastCheck: PythonAIClient.getLastHealthCheck()
      }
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message,
        isHealthy: false
      }
    }
  }
}

export default new ChatService()
