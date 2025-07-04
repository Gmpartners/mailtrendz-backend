import { supabase } from '../../config/supabase.config'
import { RealtimeChannel } from '@supabase/supabase-js'
import { logger } from '../../utils/logger'

type ChangeHandler = (payload: any) => void

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map()

  subscribeToProject(
    projectId: string,
    userId: string,
    handlers: {
      onInsert?: ChangeHandler
      onUpdate?: ChangeHandler
      onDelete?: ChangeHandler
    }
  ) {
    const channelName = `project:${projectId}:${userId}`
    
    if (this.channels.has(channelName)) {
      logger.warn(`Already subscribed to channel: ${channelName}`)
      return this.channels.get(channelName)!
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`
        },
        (payload: any) => {
          logger.info(`Realtime event on project ${projectId}:`, payload.eventType)
          
          switch (payload.eventType) {
            case 'INSERT':
              handlers.onInsert?.(payload)
              break
            case 'UPDATE':
              handlers.onUpdate?.(payload)
              break
            case 'DELETE':
              handlers.onDelete?.(payload)
              break
          }
        }
      )
      .subscribe((status) => {
        logger.info(`Channel ${channelName} status:`, status)
      })

    this.channels.set(channelName, channel)
    return channel
  }

  subscribeToChat(
    chatId: string,
    userId: string,
    handlers: {
      onNewMessage?: ChangeHandler
      onMessageUpdate?: ChangeHandler
      onMessageDelete?: ChangeHandler
    }
  ) {
    const channelName = `chat:${chatId}:${userId}`
    
    if (this.channels.has(channelName)) {
      logger.warn(`Already subscribed to channel: ${channelName}`)
      return this.channels.get(channelName)!
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload: any) => {
          logger.info(`Realtime event on chat ${chatId}:`, payload.eventType)
          
          switch (payload.eventType) {
            case 'INSERT':
              handlers.onNewMessage?.(payload)
              break
            case 'UPDATE':
              handlers.onMessageUpdate?.(payload)
              break
            case 'DELETE':
              handlers.onMessageDelete?.(payload)
              break
          }
        }
      )
      .subscribe((status) => {
        logger.info(`Channel ${channelName} status:`, status)
      })

    this.channels.set(channelName, channel)
    return channel
  }

  subscribeToUserProjects(
    userId: string,
    handlers: {
      onProjectCreated?: ChangeHandler
      onProjectUpdated?: ChangeHandler
      onProjectDeleted?: ChangeHandler
    }
  ) {
    const channelName = `user-projects:${userId}`
    
    if (this.channels.has(channelName)) {
      logger.warn(`Already subscribed to channel: ${channelName}`)
      return this.channels.get(channelName)!
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          logger.info(`Realtime event on user ${userId} projects:`, payload.eventType)
          
          switch (payload.eventType) {
            case 'INSERT':
              handlers.onProjectCreated?.(payload)
              break
            case 'UPDATE':
              handlers.onProjectUpdated?.(payload)
              break
            case 'DELETE':
              handlers.onProjectDeleted?.(payload)
              break
          }
        }
      )
      .subscribe((status) => {
        logger.info(`Channel ${channelName} status:`, status)
      })

    this.channels.set(channelName, channel)
    return channel
  }

  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName)
    
    if (!channel) {
      logger.warn(`Channel not found: ${channelName}`)
      return
    }

    supabase.removeChannel(channel)
    this.channels.delete(channelName)
    logger.info(`Unsubscribed from channel: ${channelName}`)
  }

  unsubscribeAll() {
    for (const [channelName, channel] of this.channels) {
      supabase.removeChannel(channel)
      logger.info(`Unsubscribed from channel: ${channelName}`)
    }
    
    this.channels.clear()
    logger.info('Unsubscribed from all channels')
  }

  broadcastToChannel(channelName: string, event: string, payload: any) {
    const channel = this.channels.get(channelName)
    
    if (!channel) {
      logger.warn(`Cannot broadcast: channel not found: ${channelName}`)
      return
    }

    channel.send({
      type: 'broadcast',
      event,
      payload
    })
  }

  getActiveChannels() {
    return Array.from(this.channels.keys())
  }
}

export default new RealtimeService()
