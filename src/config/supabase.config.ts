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

// ✅ FUNÇÃO PRINCIPAL - Para operações que precisam de RLS, usar admin com contexto
export function getSupabaseWithAuth(_userToken?: string) {
  // ✅ CORREÇÃO: Não tentar usar JWT do backend com Supabase
  // O token JWT é nosso, não do Supabase - usar admin client
  logger.warn('⚠️ [SUPABASE] Using admin client for RLS operations (JWT token not Supabase-compatible)')
  return supabaseAdmin
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