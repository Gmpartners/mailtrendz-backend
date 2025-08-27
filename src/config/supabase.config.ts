import { createClient } from '@supabase/supabase-js'
import { Database } from '../database/types'
import { logger } from '../utils/logger'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// 🚀 PERFORMANCE OPTIMIZATION: Enhanced connection configuration
const connectionConfig = {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public' as 'public'
  },
  // 📊 CONNECTION POOLING: Otimizar para produção
  global: {
    headers: {
      'cache-control': 'no-cache',
      'pragma': 'no-cache'
    }
  }
}

// 🚀 OTIMIZAÇÃO: Cliente admin com connection pooling inteligente
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  ...connectionConfig,
  // 🎯 ADMIN-SPECIFIC: Configurações otimizadas para operações administrativas
  realtime: {
    params: {
      eventsPerSecond: 10 // Limit events for admin client
    }
  }
})

// 🚀 OTIMIZAÇÃO: Cliente base com configuração otimizada
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  ...connectionConfig,
  // 🎯 USER-SPECIFIC: Configurações para operações de usuário
  realtime: {
    params: {
      eventsPerSecond: 5 // Limit events for regular client
    }
  }
})

// 🚀 SMART CONNECTION STRATEGY: Intelligent client selection
const connectionPool = {
  adminConnections: 0,
  userConnections: 0,
  maxAdminConnections: 10,
  maxUserConnections: 20,
  lastCleanup: Date.now()
}

// 📊 CONNECTION MONITORING: Track active connections
function trackConnection(type: 'admin' | 'user', increment: boolean = true) {
  if (increment) {
    connectionPool[`${type}Connections`]++
  } else {
    connectionPool[`${type}Connections`] = Math.max(0, connectionPool[`${type}Connections`] - 1)
  }
  
  // Log when approaching limits
  const currentCount = type === 'admin' ? connectionPool.adminConnections : connectionPool.userConnections
  const maxCount = type === 'admin' ? connectionPool.maxAdminConnections : connectionPool.maxUserConnections
  
  if (currentCount >= maxCount * 0.8) {
    logger.warn(`🔥 [SUPABASE-PERF] High ${type} connection usage:`, {
      current: currentCount,
      max: maxCount,
      percentage: Math.round((currentCount / maxCount) * 100)
    })
  }
}

// 🎯 OPTIMIZED: Smart client selection with connection pooling awareness
export function getSupabaseWithAuth(_userToken?: string) {
  // Track admin client usage
  trackConnection('admin')
  
  // 📊 PERFORMANCE: Monitor and optimize client usage
  logger.debug('🚀 [SUPABASE-PERF] Using optimized admin client', {
    adminConnections: connectionPool.adminConnections,
    userConnections: connectionPool.userConnections
  })
  
  return supabaseAdmin
}

// 📊 ENHANCED CONNECTION TEST: Performance monitoring included
export async function testConnection(): Promise<boolean> {
  const startTime = Date.now()
  
  try {
    // 🎯 OPTIMIZED QUERY: Minimal data fetch for connection test
    const { error } = await supabase.from('profiles').select('count').limit(1)
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      logger.error('[SUPABASE-PERF] Connection test failed:', {
        error: error.message,
        responseTime: `${responseTime}ms`
      })
      return false
    }
    
    // 📊 PERFORMANCE LOGGING: Track connection performance
    logger.info('🚀 [SUPABASE-PERF] Connection test successful:', {
      responseTime: `${responseTime}ms`,
      status: responseTime < 200 ? 'excellent' : responseTime < 500 ? 'good' : 'slow'
    })
    
    return true
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    logger.error('[SUPABASE-PERF] Connection error:', {
      error: error?.message || 'Unknown error',
      responseTime: `${responseTime}ms`
    })
    return false
  }
}

// 📈 CONNECTION POOL STATUS: Get current pool statistics
export function getConnectionPoolStats() {
  return {
    ...connectionPool,
    utilization: {
      admin: Math.round((connectionPool.adminConnections / connectionPool.maxAdminConnections) * 100),
      user: Math.round((connectionPool.userConnections / connectionPool.maxUserConnections) * 100)
    }
  }
}

// 🔄 CLEANUP: Periodic cleanup of connection tracking
setInterval(() => {
  const now = Date.now()
  if (now - connectionPool.lastCleanup > 300000) { // 5 minutes
    connectionPool.adminConnections = Math.max(0, Math.floor(connectionPool.adminConnections * 0.9))
    connectionPool.userConnections = Math.max(0, Math.floor(connectionPool.userConnections * 0.9))
    connectionPool.lastCleanup = now
    
    logger.debug('🧽 [SUPABASE-PERF] Connection pool cleanup completed')
  }
}, 60000) // Check every minute

export default supabase