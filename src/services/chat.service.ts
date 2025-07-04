import { getSupabaseWithAuth } from '../config/supabase.config'
import { Database } from '../database/types'
import { CreateChatDto, CreateMessageDto } from '../types/chat.types'
import { ApiError } from '../utils/api-error'
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants'
import { logger } from '../utils/logger'

type Chat = Database['public']['Tables']['chats']['Row']
type ChatMessage = Database['public']['Tables']['chat_messages']['Row']

class ChatService {
  async createChat(userId: string, data: CreateChatDto, userToken?: string): Promise<Chat> {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { data: chat, error } = await supabase
        .from('chats')
        .insert({
          user_id: userId,
          title: data.title || 'Nova conversa',
          context: data.context || {},
          project_id: data.projectId || null
        })
        .select()
        .single()

      if (error || !chat) {
        logger.error('Error creating chat:', {
          error: error?.message,
          userId,
          hasUserToken: !!userToken
        })
        throw new ApiError('Erro ao criar chat', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      logger.info(`Chat created: ${chat.id} by user ${userId}`)
      return chat
    } catch (error) {
      logger.error('Create chat error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao criar chat', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async getUserChats(userId: string, limit: number = 50, userToken?: string) {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { data: chats, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error('Error fetching user chats:', {
          error: error.message,
          userId,
          hasUserToken: !!userToken
        })
        throw new ApiError('Erro ao buscar conversas', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return chats || []
    } catch (error) {
      logger.error('Get user chats error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao buscar conversas', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async getChatById(chatId: string, userId: string, userToken?: string): Promise<Chat> {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { data: chat, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .eq('user_id', userId)
        .single()

      if (error || !chat) {
        throw new ApiError('Conversa não encontrada', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND)
      }

      return chat
    } catch (error) {
      logger.error('Get chat error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao buscar conversa', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async getChatByProjectId(projectId: string, userId: string, userToken?: string): Promise<Chat | null> {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { data: chat, error } = await supabase
        .from('chats')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No chat found for this project
          return null
        }
        logger.error('Error fetching chat by project:', {
          error: error.message,
          projectId,
          userId,
          hasUserToken: !!userToken
        })
        throw new ApiError('Erro ao buscar conversa do projeto', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return chat
    } catch (error) {
      logger.error('Get chat by project error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao buscar conversa do projeto', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async getChatMessages(chatId: string, userId: string, limit: number = 100, userToken?: string) {
    try {
      // ✅ VERIFICAR SE CHAT PERTENCE AO USUÁRIO
      await this.getChatById(chatId, userId, userToken)

      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)

      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) {
        logger.error('Error fetching chat messages:', {
          error: error.message,
          chatId,
          userId,
          hasUserToken: !!userToken
        })
        throw new ApiError('Erro ao buscar mensagens', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return messages || []
    } catch (error) {
      logger.error('Get chat messages error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao buscar mensagens', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async addMessage(chatId: string, userId: string, messageData: CreateMessageDto, userToken?: string): Promise<ChatMessage> {
    try {
      // ✅ VERIFICAR SE CHAT PERTENCE AO USUÁRIO
      await this.getChatById(chatId, userId, userToken)

      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)

      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          role: messageData.type || 'user',
          content: messageData.content,
          metadata: {}
        })
        .select()
        .single()

      if (error || !message) {
        logger.error('Error creating message:', {
          error: error?.message,
          chatId,
          userId,
          hasUserToken: !!userToken
        })
        throw new ApiError('Erro ao adicionar mensagem', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // ✅ ATUALIZAR TIMESTAMP DO CHAT
      const { error: updateError } = await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId)

      if (updateError) {
        logger.error('Error updating chat timestamp:', updateError)
      }

      return message
    } catch (error) {
      logger.error('Add message error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao adicionar mensagem', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async updateChatTitle(chatId: string, userId: string, title: string, userToken?: string): Promise<Chat> {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { data: chat, error } = await supabase
        .from('chats')
        .update({ title })
        .eq('id', chatId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error || !chat) {
        if (error?.code === 'PGRST116') {
          throw new ApiError('Conversa não encontrada', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND)
        }
        throw new ApiError('Erro ao atualizar conversa', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return chat
    } catch (error) {
      logger.error('Update chat title error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao atualizar conversa', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async deleteChat(chatId: string, userId: string, userToken?: string): Promise<void> {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId)
        .eq('user_id', userId)

      if (error) {
        if (error.code === 'PGRST116') {
          throw new ApiError('Conversa não encontrada', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND)
        }
        throw error
      }

      logger.info(`Chat deleted: ${chatId} by user ${userId}`)
    } catch (error) {
      logger.error('Delete chat error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao deletar conversa', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async archiveChat(chatId: string, userId: string, userToken?: string): Promise<Chat> {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { data: chat, error } = await supabase
        .from('chats')
        .update({ is_active: false })
        .eq('id', chatId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error || !chat) {
        if (error?.code === 'PGRST116') {
          throw new ApiError('Conversa não encontrada', HTTP_STATUS.NOT_FOUND, ERROR_CODES.RESOURCE_NOT_FOUND)
        }
        throw new ApiError('Erro ao arquivar conversa', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return chat
    } catch (error) {
      logger.error('Archive chat error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao arquivar conversa', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async searchChats(userId: string, query: string, userToken?: string) {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          chat_messages!inner(content)
        `)
        .eq('user_id', userId)
        .or(`title.ilike.%${query}%`, { foreignTable: 'chat_messages' })
        .order('updated_at', { ascending: false })
        .limit(20)

      if (error) {
        logger.error('Error searching chats:', {
          error: error.message,
          userId,
          hasUserToken: !!userToken
        })
        throw new ApiError('Erro ao buscar conversas', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return chats || []
    } catch (error) {
      logger.error('Search chats error:', error)
      if (error instanceof ApiError) throw error
      throw new ApiError('Erro ao buscar conversas', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  async getChatStats(userId: string, userToken?: string) {
    try {
      // ✅ USAR CLIENTE COM CONTEXTO DE USUÁRIO
      const supabase = getSupabaseWithAuth(userToken)
      
      const { data: stats, error } = await supabase
        .from('chats')
        .select('id')
        .eq('user_id', userId)

      if (error) {
        logger.error('Error getting chat stats:', {
          error: error.message,
          userId,
          hasUserToken: !!userToken
        })
        return { totalChats: 0, activeChats: 0 }
      }

      const { data: activeStats } = await supabase
        .from('chats')
        .select('id')
        .eq('is_active', true)
        .eq('user_id', userId)

      return {
        totalChats: stats?.length || 0,
        activeChats: activeStats?.length || 0
      }
    } catch (error) {
      logger.error('Get chat stats error:', error)
      return { totalChats: 0, activeChats: 0 }
    }
  }
}

export default new ChatService()