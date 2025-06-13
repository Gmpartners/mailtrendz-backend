import { connect, disconnect } from 'mongoose'
import { Chat } from '../models/Chat.model'
import { Message } from '../models/Message.model'
import { Conversation } from '../models/Conversation.model'
import { Project } from '../models/Project.model'
import { logger } from '../utils/logger'

interface MigrationStats {
  chatsProcessed: number
  conversationsCreated: number
  messagesProcessed: number
  errors: string[]
}

export class DatabaseMigration {
  
  async migrateToConversations(): Promise<MigrationStats> {
    const stats: MigrationStats = {
      chatsProcessed: 0,
      conversationsCreated: 0,
      messagesProcessed: 0,
      errors: []
    }
    
    try {
      logger.info('🔄 Iniciando migração para modelo Conversation')
      
      // Buscar todos os chats
      const chats = await Chat.find({}).populate('projectId')
      logger.info(`📊 Encontrados ${chats.length} chats para migrar`)
      
      for (const chat of chats) {
        try {
          await this.migrateChat(chat, stats)
          stats.chatsProcessed++
        } catch (error: any) {
          stats.errors.push(`Chat ${chat._id}: ${error.message}`)
          logger.error(`❌ Erro ao migrar chat ${chat._id}:`, error.message)
        }
      }
      
      logger.success(`✅ Migração concluída:`, stats)
      return stats
      
    } catch (error: any) {
      logger.error('❌ Erro na migração:', error)
      throw error
    }
  }
  
  private async migrateChat(chat: any, stats: MigrationStats): Promise<void> {
    // Verificar se já existe conversation para este projeto
    const existingConversation = await Conversation.findOne({ projectId: chat.projectId._id })
    if (existingConversation) {
      logger.warn(`⚠️ Conversation já existe para projeto ${chat.projectId._id}`)
      return
    }
    
    // Buscar mensagens do chat
    const messages = await Message.find({ chatId: chat._id }).sort({ createdAt: 1 })
    
    // Buscar projeto completo
    const project = await Project.findById(chat.projectId._id)
    if (!project) {
      throw new Error(`Projeto ${chat.projectId._id} não encontrado`)
    }
    
    // Criar nova conversation
    const conversation = new Conversation({
      userId: chat.userId,
      projectId: chat.projectId._id,
      
      conversation: {
        title: chat.title || `Chat - ${project.name}`,
        createdAt: chat.createdAt,
        lastActivity: chat.metadata?.lastActivity || chat.updatedAt,
        
        messages: messages.map(msg => ({
          id: msg._id,
          type: msg.type,
          content: msg.content,
          timestamp: msg.createdAt,
          metadata: {
            model: msg.metadata?.model || msg.metadata?.modelUsed,
            emailUpdated: msg.metadata?.emailUpdated || false,
            modifications: msg.metadata?.suggestions || [],
            confidence: msg.metadata?.confidence,
            processingTime: msg.metadata?.processingTime || msg.metadata?.executionTime
          }
        })),
        
        context: {
          projectSnapshot: {
            name: project.name,
            currentHTML: project.content?.html,
            currentSubject: project.content?.subject,
            industry: project.metadata?.industry || 'geral',
            tone: project.metadata?.tone || 'professional'
          },
          conversationState: {
            lastIntent: '',
            pendingModifications: [],
            userPreferences: {}
          }
        }
      },
      
      stats: {
        totalMessages: messages.length,
        emailModifications: messages.filter(m => m.metadata?.emailUpdated).length,
        averageResponseTime: this.calculateAverageResponseTime(messages),
        lastModified: chat.updatedAt
      },
      
      isActive: chat.isActive,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    })
    
    await conversation.save()
    
    // Atualizar project para referenciar conversation
    await Project.findByIdAndUpdate(project._id, {
      conversationId: conversation._id
    })
    
    stats.conversationsCreated++
    stats.messagesProcessed += messages.length
    
    logger.info(`✅ Chat ${chat._id} migrado para Conversation ${conversation._id}`)
  }
  
  private calculateAverageResponseTime(messages: any[]): number {
    if (messages.length < 2) return 0
    
    let totalTime = 0
    let responseCount = 0
    
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].type === 'ai' && messages[i-1].type === 'user') {
        const responseTime = messages[i].createdAt.getTime() - messages[i-1].createdAt.getTime()
        totalTime += responseTime
        responseCount++
      }
    }
    
    return responseCount > 0 ? totalTime / responseCount : 0
  }
  
  async cleanupOldCollections(): Promise<void> {
    logger.info('🧹 Limpando collections antigas...')
    
    try {
      // Remover collections antigas (CUIDADO!)
      await Chat.collection.drop()
      await Message.collection.drop()
      
      logger.success('✅ Collections antigas removidas')
    } catch (error: any) {
      logger.warn(`⚠️ Erro ao remover collections: ${error.message}`)
    }
  }
  
  async validateMigration(): Promise<boolean> {
    try {
      const conversationCount = await Conversation.countDocuments()
      const projectsWithConversations = await Project.countDocuments({ conversationId: { $exists: true } })
      
      logger.info(`📊 Validação da migração:`)
      logger.info(`   Conversations: ${conversationCount}`)
      logger.info(`   Projects com conversationId: ${projectsWithConversations}`)
      
      return conversationCount > 0 && conversationCount === projectsWithConversations
    } catch (error: any) {
      logger.error('❌ Erro na validação:', error)
      return false
    }
  }
}

// Script executável
if (require.main === module) {
  async function runMigration() {
    try {
      await connect(process.env.MONGODB_URL!)
      
      const migration = new DatabaseMigration()
      
      logger.info('🚀 Iniciando migração do banco de dados...')
      const stats = await migration.migrateToConversations()
      
      logger.info('✅ Validando migração...')
      const isValid = await migration.validateMigration()
      
      if (isValid) {
        logger.success('🎉 Migração concluída com sucesso!')
        logger.info('⚠️ Para limpar collections antigas, execute: npm run migration:cleanup')
      } else {
        logger.error('❌ Migração falhou na validação')
      }
      
      await disconnect()
    } catch (error) {
      logger.error('❌ Erro na migração:', error)
      process.exit(1)
    }
  }
  
  runMigration()
}