import { logger } from '../utils/logger'
import { EventEmitter } from 'events'

interface QueueItem<T = any> {
  id: string
  data: T
  priority: number
  timestamp: number
  retries: number
  userId: string
}

interface QueueOptions {
  maxConcurrent: number
  retryLimit: number
  retryDelay: number
  processInterval: number
}

export class QueueService extends EventEmitter {
  private queue: QueueItem[] = []
  private processing = new Map<string, QueueItem>()
  private userCooldowns = new Map<string, number>()
  private options: QueueOptions
  private intervalId: NodeJS.Timeout | null = null // ✅ CORRIGIDO: Tipo explícito

  constructor(options: Partial<QueueOptions> = {}) {
    super()
    this.options = {
      maxConcurrent: 5,
      retryLimit: 3,
      retryDelay: 2000,
      processInterval: 100,
      ...options
    }
  }

  start(): void {
    if (this.intervalId) return
    
    this.intervalId = setInterval(() => {
      this.processQueue()
    }, this.options.processInterval)
    
    logger.info('Queue service started', { options: this.options })
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId) // ✅ CORRIGIDO: Agora funciona corretamente
      this.intervalId = null
      logger.info('Queue service stopped')
    }
  }

  async add<T>(
    userId: string, 
    data: T, 
    processor: (data: T) => Promise<any>,
    priority: number = 1
  ): Promise<any> {
    // Verificar cooldown do usuário
    const userCooldown = this.userCooldowns.get(userId) || 0
    if (Date.now() < userCooldown) {
      const waitTime = Math.ceil((userCooldown - Date.now()) / 1000)
      throw new Error(`Por favor, aguarde ${waitTime} segundos antes de criar outro projeto`)
    }

    const item: QueueItem<T> = {
      id: `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data,
      priority,
      timestamp: Date.now(),
      retries: 0,
      userId
    }

    // Adicionar à fila com prioridade
    this.queue.push(item)
    this.queue.sort((a, b) => b.priority - a.priority)

    logger.info('Item added to queue', {
      queueId: item.id,
      userId,
      queueLength: this.queue.length,
      priority
    })

    // Retornar uma promise que resolve quando o item for processado
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        // Verificar se está sendo processado
        if (this.processing.has(item.id)) {
          return
        }

        // Verificar se foi removido da fila (processado ou erro)
        const stillInQueue = this.queue.find(q => q.id === item.id)
        if (!stillInQueue && !this.processing.has(item.id)) {
          clearInterval(checkInterval)
          
          // Verificar se houve erro
          const error = this.getError(item.id)
          if (error) {
            reject(error)
          } else {
            // Buscar resultado
            const result = this.getResult(item.id)
            if (result) {
              resolve(result)
            } else {
              reject(new Error('Item processado mas resultado não encontrado'))
            }
          }
        }
      }, 100)

      // Timeout de segurança (5 minutos)
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval)
        reject(new Error('Timeout ao processar item na fila'))
      }, 5 * 60 * 1000)

      // Armazenar o processador para uso posterior
      ;(item as any).processor = processor
    })
  }

  private async processQueue(): Promise<void> {
    // Não processar se já estiver no limite de concorrência
    if (this.processing.size >= this.options.maxConcurrent) {
      return
    }

    // Pegar próximo item da fila
    const item = this.queue.shift()
    if (!item) return

    // Verificar cooldown do usuário novamente
    const userCooldown = this.userCooldowns.get(item.userId) || 0
    if (Date.now() < userCooldown) {
      // Recolocar na fila para tentar depois
      this.queue.unshift(item)
      return
    }

    // Marcar como em processamento
    this.processing.set(item.id, item)

    try {
      logger.info('Processing queue item', {
        queueId: item.id,
        userId: item.userId,
        attempt: item.retries + 1
      })

      // Processar o item
      const processor = (item as any).processor
      const result = await processor(item.data)

      // Sucesso - definir cooldown do usuário (3 segundos)
      this.userCooldowns.set(item.userId, Date.now() + 3000)

      // Armazenar resultado
      this.storeResult(item.id, result)

      // Remover do processamento
      this.processing.delete(item.id)

      // Emitir evento de sucesso
      this.emit('processed', { item, result })

      logger.info('Queue item processed successfully', {
        queueId: item.id,
        userId: item.userId
      })

    } catch (error: any) {
      logger.error('Error processing queue item', {
        queueId: item.id,
        userId: item.userId,
        error: error.message,
        attempt: item.retries + 1
      })

      // Remover do processamento
      this.processing.delete(item.id)

      // Verificar se é erro de rate limit
      if (error.response?.status === 429) {
        const retryAfter = error.response?.headers?.['retry-after']
        const cooldownTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000
        
        // Definir cooldown maior para o usuário
        this.userCooldowns.set(item.userId, Date.now() + cooldownTime)
        
        // Recolocar na fila com prioridade reduzida
        item.priority = Math.max(0, item.priority - 1)
        this.queue.push(item)
        this.queue.sort((a, b) => b.priority - a.priority)
        
        logger.warn('Rate limit hit, item requeued with cooldown', {
          queueId: item.id,
          userId: item.userId,
          cooldownSeconds: cooldownTime / 1000
        })
        
        return
      }

      // Tentar novamente se ainda tiver retries
      if (item.retries < this.options.retryLimit) {
        item.retries++
        
        // Aguardar antes de recolocar na fila
        setTimeout(() => {
          this.queue.push(item)
          this.queue.sort((a, b) => b.priority - a.priority)
        }, this.options.retryDelay * item.retries)
        
        return
      }

      // Erro final - armazenar erro
      this.storeError(item.id, error)

      // Emitir evento de erro
      this.emit('error', { item, error })
    }
  }

  getQueueStatus(): {
    queueLength: number
    processing: number
    userCooldowns: Record<string, number>
  } {
    const cooldowns: Record<string, number> = {}
    const now = Date.now()
    
    this.userCooldowns.forEach((time, userId) => {
      if (time > now) {
        cooldowns[userId] = Math.ceil((time - now) / 1000)
      }
    })

    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      userCooldowns: cooldowns
    }
  }

  getUserQueuePosition(userId: string): number {
    const userItems = this.queue.filter(item => item.userId === userId)
    if (userItems.length === 0) return -1
    
    const firstUserItem = userItems[0]
    return this.queue.indexOf(firstUserItem) + 1
  }

  clearUserCooldown(userId: string): void {
    this.userCooldowns.delete(userId)
  }

  // Armazenamento temporário de resultados e erros
  private results = new Map<string, any>()
  private errors = new Map<string, any>()

  private storeResult(id: string, result: any): void {
    this.results.set(id, result)
    // Limpar após 5 minutos
    setTimeout(() => this.results.delete(id), 5 * 60 * 1000)
  }

  private storeError(id: string, error: any): void {
    this.errors.set(id, error)
    // Limpar após 5 minutos
    setTimeout(() => this.errors.delete(id), 5 * 60 * 1000)
  }

  private getResult(id: string): any {
    return this.results.get(id)
  }

  private getError(id: string): any {
    return this.errors.get(id)
  }
}

// Instância singleton
export const projectQueue = new QueueService({
  maxConcurrent: 3, // Processar até 3 projetos simultaneamente
  retryLimit: 2,
  retryDelay: 3000,
  processInterval: 200
})

// Iniciar a fila
projectQueue.start()

export default projectQueue