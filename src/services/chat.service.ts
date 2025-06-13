import { Types } from 'mongoose'
import { Conversation, IConversationDocument } from '../models/Conversation.model'
import { Project } from '../models/Project.model'
import { logger } from '../utils/logger'

interface SendMessageDto {
  content: string
}

interface MessageResponse {
  conversation: any
  messageAdded: boolean
  projectUpdated: boolean
}

interface ConversationResponse {
  conversation: any
  project?: any
  stats: any
}

class ChatService {
  
  async sendMessage(
    projectId: string, 
    userId: string, 
    messageDto: SendMessageDto
  ): Promise<MessageResponse> {
    try {
      if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(userId)) {
        throw new Error('IDs inválidos')
      }

      if (!messageDto?.content?.trim()) {
        throw new Error('Conteúdo da mensagem é obrigatório')
      }

      // Buscar conversation
      let conversation = await Conversation.findOne({
        projectId: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId)
      })

      if (!conversation) {
        // Criar nova conversation
        const project = await Project.findById(projectId)
        if (!project) {
          throw new Error('Projeto não encontrado')
        }

        conversation = new Conversation({
          userId: new Types.ObjectId(userId),
          projectId: new Types.ObjectId(projectId),
          conversation: {
            title: `Chat - ${project.name}`,
            createdAt: new Date(),
            lastActivity: new Date(),
            messages: [],
            context: {
              projectSnapshot: {
                name: project.name,
                currentHTML: project.content?.html,
                currentSubject: project.content?.subject,
                industry: project.metadata?.industry || 'geral',
                tone: project.metadata?.tone || 'professional'
              },
              conversationState: {
                pendingModifications: [],
                userPreferences: {}
              }
            }
          },
          stats: {
            totalMessages: 0,
            emailModifications: 0,
            averageResponseTime: 0,
            lastModified: new Date()
          }
        })

        await conversation.save()

        // Atualizar project
        await Project.findByIdAndUpdate(projectId, {
          conversationId: conversation._id
        })
      }

      // Adicionar mensagem do usuário
      await conversation.addMessage('user', messageDto.content.trim())

      // Chamar Python AI Service
      let aiResponse = 'Processando sua solicitação...'
      let projectUpdated = false

      try {
        const response = await fetch(`${process.env.PYTHON_AI_SERVICE_URL}/chat/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: messageDto.content,
            chat_id: conversation._id.toString(),
            user_id: userId,
            project_id: projectId
          }),
          signal: AbortSignal.timeout(30000)
        })

        if (response.ok) {
          const data = (await response.json()) as any
          aiResponse = data.data?.ai_response || aiResponse
          projectUpdated = data.data?.project_updated || false
        }
      } catch (error: any) {
        logger.warn(`Python AI Service error: ${error.message}`)
        aiResponse = `Entendi: "${messageDto.content.substring(0, 50)}..."\n\nServiço temporariamente indisponível. Tente novamente em alguns momentos.`
      }

      // Adicionar resposta da IA
      await conversation.addMessage('ai', aiResponse, {
        emailUpdated: projectUpdated,
        model: 'python-ai-service'
      })

      if (projectUpdated) {
        await conversation.markEmailModified()
      }

      return {
        conversation: this.formatConversation(conversation),
        messageAdded: true,
        projectUpdated
      }

    } catch (error: any) {
      logger.error('Send message failed:', error)
      throw error
    }
  }
  
  async getConversationByProject(
    projectId: string, 
    userId: string
  ): Promise<ConversationResponse> {
    try {
      if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(userId)) {
        throw new Error('IDs inválidos')
      }

      const project = await Project.findOne({
        _id: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId)
      })

      if (!project) {
        throw new Error('Projeto não encontrado')
      }

      let conversation = await Conversation.findOne({
        projectId: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId)
      })

      if (!conversation) {
        // Criar conversation automática
        conversation = new Conversation({
          userId: new Types.ObjectId(userId),
          projectId: new Types.ObjectId(projectId),
          conversation: {
            title: `Chat - ${project.name}`,
            createdAt: new Date(),
            lastActivity: new Date(),
            messages: [],
            context: {
              projectSnapshot: {
                name: project.name,
                currentHTML: project.content?.html,
                currentSubject: project.content?.subject,
                industry: project.metadata?.industry || 'geral',
                tone: project.metadata?.tone || 'professional'
              },
              conversationState: {
                pendingModifications: [],
                userPreferences: {}
              }
            }
          },
          stats: {
            totalMessages: 0,
            emailModifications: 0,
            averageResponseTime: 0,
            lastModified: new Date()
          }
        })

        await conversation.save()

        await Project.findByIdAndUpdate(projectId, {
          conversationId: conversation._id
        })
      }

      return {
        conversation: this.formatConversation(conversation),
        project: {
          id: project._id.toString(),
          name: project.name,
          type: project.type
        },
        stats: conversation.stats
      }

    } catch (error: any) {
      logger.error('Get conversation by project failed:', error)
      throw error
    }
  }

  async getConversationById(id: string, userId: string): Promise<ConversationResponse> {
    try {
      const conversation = await Conversation.findOne({
        _id: id,
        userId: new Types.ObjectId(userId)
      })

      if (!conversation) {
        throw new Error('Conversa não encontrada')
      }

      const project = await Project.findById(conversation.projectId)

      return {
        conversation: this.formatConversation(conversation),
        project: project ? {
          id: project._id.toString(),
          name: project.name,
          type: project.type
        } : undefined,
        stats: conversation.stats
      }

    } catch (error: any) {
      logger.error('Get conversation by id failed:', error)
      throw error
    }
  }

  async getUserConversations(userId: string): Promise<any[]> {
    try {
      const conversations = await Conversation.find({
        userId: new Types.ObjectId(userId),
        isActive: true
      })
        .sort({ 'conversation.lastActivity': -1 })
        .limit(20)
        .populate('projectId', 'name type')

      return conversations.map(conv => this.formatConversation(conv))

    } catch (error: any) {
      logger.error('Get user conversations failed:', error)
      throw error
    }
  }

  async updateConversation(id: string, userId: string, updates: any): Promise<any> {
    try {
      const conversation = await Conversation.findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId) },
        { $set: updates },
        { new: true }
      )

      return conversation ? this.formatConversation(conversation) : null

    } catch (error: any) {
      logger.error('Update conversation failed:', error)
      throw error
    }
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    try {
      const result = await Conversation.deleteOne({
        _id: id,
        userId: new Types.ObjectId(userId)
      })

      if (result.deletedCount > 0) {
        // Remover referência do project
        await Project.updateOne(
          { conversationId: id },
          { $unset: { conversationId: 1 } }
        )
        return true
      }

      return false

    } catch (error: any) {
      logger.error('Delete conversation failed:', error)
      throw error
    }
  }

  async syncProjectSnapshot(projectId: string): Promise<void> {
    try {
      const project = await Project.findById(projectId)
      if (!project) return

      const conversation = await Conversation.findOne({ projectId })
      if (!conversation) return

      await conversation.updateProjectSnapshot(project)

    } catch (error: any) {
      logger.error('Sync project snapshot failed:', error)
    }
  }

  private formatConversation(conversation: IConversationDocument): any {
    return {
      id: conversation._id.toString(),
      userId: conversation.userId.toString(),
      projectId: conversation.projectId.toString(),
      title: conversation.conversation.title,
      messages: conversation.conversation.messages.map(msg => ({
        id: msg.id.toString(),
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
      })),
      context: conversation.conversation.context,
      stats: conversation.stats,
      isActive: conversation.isActive,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastActivity: conversation.conversation.lastActivity
    }
  }
}

export default new ChatService()