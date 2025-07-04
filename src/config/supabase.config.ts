import { createClient } from '@supabase/supabase-js'
import { Database } from '../database/types'
import { logger } from '../utils/logger'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// ✅ CLIENTE ADMIN - Para operações administrativas (bypassa RLS)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

// ✅ CLIENTE BASE - Para operações gerais sem contexto de usuário
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

// ✅ FUNÇÃO PRINCIPAL - Retorna cliente com contexto de usuário (respeita RLS)
export function getSupabaseWithAuth(userToken?: string) {
  if (!userToken) {
    logger.warn('⚠️ [SUPABASE] No user token provided, using anon client')
    return supabase
  }

  const clientWithAuth = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    }
  })

  // ✅ CORREÇÃO: Definir sessão com apenas as propriedades aceitas
  clientWithAuth.auth.setSession({
    access_token: userToken,
    refresh_token: ''
  })

  logger.info('✅ [SUPABASE] Client created with user context')
  return clientWithAuth
}

export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1)
    if (error) {
      logger.error('Supabase connection test failed:', error)
      return false
    }
    logger.info('Supabase connection successful')
    return true
  } catch (error) {
    logger.error('Supabase connection error:', error)
    return false
  }
}

export default supabase