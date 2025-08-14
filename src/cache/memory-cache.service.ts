import { logger } from '../utils/logger'

interface CacheItem<T> {
  data: T
  expiresAt: number
  createdAt: number
}

class MemoryCacheService {
  private cache = new Map<string, CacheItem<any>>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutos padrão

  // Cache para tokens de autenticação (TTL menor para segurança)
  private authCache = new Map<string, CacheItem<any>>()
  private readonly authTTL = 2 * 60 * 1000 // 2 minutos para auth

  // Cache para dados de subscription (TTL maior para dados estáveis)
  private subscriptionCache = new Map<string, CacheItem<any>>()
  private readonly subscriptionTTL = 10 * 60 * 1000 // 10 minutos para subscription

  constructor() {
    // Limpeza automática a cada 5 minutos
    setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)

    logger.info('🧠 [CACHE] Memory cache service initialized')
  }

  // ========== CACHE GERAL ==========
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now()
    })

    logger.debug('📝 [CACHE] Data cached:', { 
      key: key.substring(0, 30) + '...', 
      ttl: ttl || this.defaultTTL,
      size: this.cache.size 
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      logger.debug('⏰ [CACHE] Expired item removed:', { key: key.substring(0, 30) + '...' })
      return null
    }

    logger.debug('✅ [CACHE] Cache hit:', { 
      key: key.substring(0, 30) + '...', 
      age: Date.now() - item.createdAt 
    })
    return item.data
  }

  // ========== CACHE DE AUTENTICAÇÃO ==========
  setAuth(token: string, userData: any): void {
    const key = `auth:${this.hashToken(token)}`
    const expiresAt = Date.now() + this.authTTL
    
    this.authCache.set(key, {
      data: userData,
      expiresAt,
      createdAt: Date.now()
    })

    logger.debug('🔐 [AUTH_CACHE] User cached:', { 
      userId: userData.id,
      ttl: this.authTTL,
      size: this.authCache.size 
    })
  }

  getAuth(token: string): any | null {
    const key = `auth:${this.hashToken(token)}`
    const item = this.authCache.get(key)
    
    if (!item) {
      return null
    }

    if (Date.now() > item.expiresAt) {
      this.authCache.delete(key)
      logger.debug('⏰ [AUTH_CACHE] Expired auth removed:', { userId: item.data?.id })
      return null
    }

    logger.debug('✅ [AUTH_CACHE] Auth cache hit:', { 
      userId: item.data?.id,
      age: Date.now() - item.createdAt 
    })
    return item.data
  }

  invalidateAuth(token: string): void {
    const key = `auth:${this.hashToken(token)}`
    this.authCache.delete(key)
    logger.debug('🗑️ [AUTH_CACHE] Auth invalidated')
  }

  // ========== CACHE DE SUBSCRIPTION ==========
  setSubscription(userId: string, subscriptionData: any): void {
    const key = `subscription:${userId}`
    const expiresAt = Date.now() + this.subscriptionTTL
    
    this.subscriptionCache.set(key, {
      data: subscriptionData,
      expiresAt,
      createdAt: Date.now()
    })

    logger.debug('💳 [SUB_CACHE] Subscription cached:', { 
      userId,
      planType: subscriptionData.plan_type,
      ttl: this.subscriptionTTL,
      size: this.subscriptionCache.size 
    })
  }

  getSubscription(userId: string): any | null {
    const key = `subscription:${userId}`
    const item = this.subscriptionCache.get(key)
    
    if (!item) {
      return null
    }

    if (Date.now() > item.expiresAt) {
      this.subscriptionCache.delete(key)
      logger.debug('⏰ [SUB_CACHE] Expired subscription removed:', { userId })
      return null
    }

    logger.debug('✅ [SUB_CACHE] Subscription cache hit:', { 
      userId,
      planType: item.data?.plan_type,
      age: Date.now() - item.createdAt 
    })
    return item.data
  }

  invalidateSubscription(userId: string): void {
    const key = `subscription:${userId}`
    this.subscriptionCache.delete(key)
    logger.debug('🗑️ [SUB_CACHE] Subscription invalidated:', { userId })
  }

  // ========== UTILITÁRIOS ==========
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.authCache.clear()
    this.subscriptionCache.clear()
    logger.info('🧹 [CACHE] All caches cleared')
  }

  // Limpeza automática de itens expirados
  private cleanup(): void {
    const now = Date.now()
    let totalCleaned = 0

    // Limpar cache geral
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key)
        totalCleaned++
      }
    }

    // Limpar cache de auth
    for (const [key, item] of this.authCache.entries()) {
      if (now > item.expiresAt) {
        this.authCache.delete(key)
        totalCleaned++
      }
    }

    // Limpar cache de subscription
    for (const [key, item] of this.subscriptionCache.entries()) {
      if (now > item.expiresAt) {
        this.subscriptionCache.delete(key)
        totalCleaned++
      }
    }

    if (totalCleaned > 0) {
      logger.debug('🧹 [CACHE] Cleanup completed:', { 
        itemsRemoved: totalCleaned,
        totalSize: this.cache.size + this.authCache.size + this.subscriptionCache.size
      })
    }
  }

  // Hash simples do token para usar como chave (apenas últimos 10 chars)
  private hashToken(token: string): string {
    return token.slice(-10)
  }

  // Estatísticas do cache
  getStats(): any {
    return {
      general: {
        size: this.cache.size,
        ttl: this.defaultTTL
      },
      auth: {
        size: this.authCache.size,
        ttl: this.authTTL
      },
      subscription: {
        size: this.subscriptionCache.size,
        ttl: this.subscriptionTTL
      },
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024
      }
    }
  }
}

export default new MemoryCacheService()
