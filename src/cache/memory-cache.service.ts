import { logger } from '../utils/logger'

interface CacheItem<T> {
  data: T
  expiresAt: number
  createdAt: number
}

class MemoryCacheService {
  private cache = new Map<string, CacheItem<any>>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutos padrão

  // 🚀 OTIMIZAÇÃO: Cache de autenticação com TTL balanceado
  private authCache = new Map<string, CacheItem<any>>()
  private readonly authTTL = 3 * 60 * 1000 // 3 minutos para auth (aumentado de 2m)

  // 📊 SMART CACHE: Subscription com TTL sincronizado com frontend
  private subscriptionCache = new Map<string, CacheItem<any>>()
  private readonly subscriptionTTL = 2 * 60 * 1000 // 2 minutos sincronizado
  
  // 🎯 PERFORMANCE METRICS: Cache hit/miss tracking
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    lastCleanup: Date.now()
  }

  constructor() {
    // 🚀 OTIMIZAÇÃO: Limpeza mais frequente para melhor performance
    setInterval(() => {
      this.cleanup()
    }, 3 * 60 * 1000) // 3 minutos (reduzido de 5m)

    // 📊 METRICS: Log performance stats every 10 minutes
    setInterval(() => {
      this.logPerformanceStats()
    }, 10 * 60 * 1000)

    logger.info('🧠 [CACHE-PERF] Enhanced memory cache service initialized')
  }

  // ========== CACHE GERAL ==========
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now()
    })

    // 📊 METRICS: Track cache operations
    this.metrics.sets++

    logger.debug('📝 [CACHE-PERF] Data cached:', { 
      key: key.substring(0, 30) + '...', 
      ttl: ttl || this.defaultTTL,
      size: this.cache.size 
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      // 📊 METRICS: Track cache miss
      this.metrics.misses++
      return null
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      this.metrics.evictions++
      logger.debug('⏰ [CACHE-PERF] Expired item removed:', { key: key.substring(0, 30) + '...' })
      return null
    }

    // 📊 METRICS: Track cache hit
    this.metrics.hits++
    
    logger.debug('✅ [CACHE-PERF] Cache hit:', { 
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

  // 📊 ENHANCED: Estatísticas detalhadas do cache com performance metrics
  getStats(): any {
    const totalOperations = this.metrics.hits + this.metrics.misses
    const hitRate = totalOperations > 0 ? (this.metrics.hits / totalOperations * 100).toFixed(2) : '0.00'
    
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
      performance: {
        hitRate: `${hitRate}%`,
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        sets: this.metrics.sets,
        evictions: this.metrics.evictions,
        totalOperations
      },
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024
      }
    }
  }
  
  // 📈 PERFORMANCE LOGGING: Método para log periódico de performance
  private logPerformanceStats(): void {
    const stats = this.getStats()
    
    logger.info('📊 [CACHE-PERF] Performance Statistics:', {
      cacheSize: {
        general: stats.general.size,
        auth: stats.auth.size,
        subscription: stats.subscription.size
      },
      performance: stats.performance,
      memoryUsage: `${stats.memory.used.toFixed(1)}MB / ${stats.memory.total.toFixed(1)}MB`
    })
    
    // Reset metrics periodically to avoid overflow
    if (stats.performance.totalOperations > 10000) {
      this.resetMetrics()
      logger.debug('[CACHE-PERF] Metrics reset after reaching 10k operations')
    }
  }
  
  // 🔄 METRICS RESET: Reset performance counters
  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      lastCleanup: Date.now()
    }
  }
}

export default new MemoryCacheService()
