import { supabase, supabaseAdmin } from '../config/supabase.config'
import { logger } from '../utils/logger'

/**
 * Secure Database Service
 * Provides controlled access to admin operations with proper logging and validation
 */
class SecureDbService {
  /**
   * Executar operação administrativa com logs de auditoria
   */
  async executeAdminOperation<T>(
    operation: string,
    userId: string,
    callback: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      // Log início da operação
      logger.info('🔐 [ADMIN-OP] Starting admin operation', {
        operation,
        userId,
        context,
        timestamp: new Date().toISOString()
      })
      
      const result = await callback()
      
      // Log sucesso
      logger.info('✅ [ADMIN-OP] Admin operation completed successfully', {
        operation,
        userId,
        duration: Date.now() - startTime,
        context
      })
      
      return result
    } catch (error) {
      // Log erro
      logger.error('❌ [ADMIN-OP] Admin operation failed', {
        operation,
        userId,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : error,
        context
      })
      
      throw error
    }
  }

  /**
   * Criar perfil de usuário (operação administrativa necessária)
   */
  async createUserProfile(userId: string, profileData: {
    name: string
    email: string
    avatar?: string
    subscription?: string
    preferences?: Record<string, any>
  }) {
    return this.executeAdminOperation(
      'createUserProfile',
      userId,
      async () => {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            name: profileData.name,
            email: profileData.email,
            avatar: profileData.avatar,
            subscription: (profileData.subscription || 'free') as 'free' | 'starter' | 'enterprise' | 'unlimited',
            preferences: profileData.preferences || {}
          })
          .select()
          .single()
        
        if (error) throw error
        return data
      },
      { profileData }
    )
  }

  /**
   * Atualizar avatar de usuário (operação administrativa para contornar RLS temporariamente)
   */
  async updateUserAvatar(userId: string, avatarUrl: string) {
    return this.executeAdminOperation(
      'updateUserAvatar',
      userId,
      async () => {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .update({ 
            avatar: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single()
        
        if (error) throw error
        return data
      },
      { avatarUrl }
    )
  }

  /**
   * Buscar dados do usuário autenticado (sem usar admin quando possível)
   */
  async getUserProfile(userId: string, userToken?: string) {
    try {
      // Tentar primeiro com client normal (respeitando RLS)
      const clientSupabase = userToken ? supabase : supabaseAdmin
      
      const { data, error } = await clientSupabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error && error.code === 'PGRST116') {
        // Profile não encontrado, retornar null em vez de erro
        return null
      }
      
      if (error) throw error
      return data
      
    } catch (error) {
      logger.error('Error fetching user profile:', { userId, error })
      throw error
    }
  }

  /**
   * Buscar projetos do usuário (respeitando RLS)
   */
  async getUserProjects(userId: string, options: {
    limit?: number
    offset?: number
    folder_id?: string | null
  } = {}) {
    try {
      let query = supabase
        .from('projects_with_stats')
        .select('*')
        .eq('user_id', userId)
        .is('organization_id', null) // Personal projects only

      if (options.folder_id !== undefined) {
        if (options.folder_id === null) {
          query = query.is('folder_id', null)
        } else {
          query = query.eq('folder_id', options.folder_id)
        }
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
      
    } catch (error) {
      logger.error('Error fetching user projects:', { userId, options, error })
      throw error
    }
  }

  /**
   * Verificar se operação admin é necessária ou se pode usar client normal
   */
  async safeQuery<T>(
    operation: string,
    userId: string,
    clientOperation: () => Promise<T>,
    adminOperation?: () => Promise<T>
  ): Promise<T> {
    try {
      // Tentar primeiro com client (respeitando RLS)
      return await clientOperation()
    } catch (error: any) {
      // Se falhou e temos operação admin como fallback
      if (adminOperation && this.shouldUseAdminFallback(error)) {
        logger.warn('🔄 [SECURE-DB] Falling back to admin operation', {
          operation,
          userId,
          originalError: error.message
        })
        
        return this.executeAdminOperation(
          `${operation}_admin_fallback`,
          userId,
          adminOperation
        )
      }
      
      throw error
    }
  }

  /**
   * Determinar se deve usar fallback admin baseado no erro
   */
  private shouldUseAdminFallback(error: any): boolean {
    // Usar admin fallback apenas para erros específicos de RLS
    const allowedErrorCodes = [
      'PGRST301', // Permission denied
      '42501',    // Insufficient privilege
      'PGRST116'  // Row not found (pode ser RLS)
    ]
    
    return allowedErrorCodes.includes(error.code)
  }

  /**
   * Criar subscription para usuário (operação admin necessária)
   */
  async createUserSubscription(userId: string, subscriptionData: {
    plan_type: string
    status: string
    stripe_customer_id?: string
    stripe_subscription_id?: string
  }) {
    return this.executeAdminOperation(
      'createUserSubscription',
      userId,
      async () => {
        const { data, error } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: subscriptionData.plan_type as 'free' | 'starter' | 'enterprise' | 'unlimited',
            status: subscriptionData.status,
            stripe_customer_id: subscriptionData.stripe_customer_id,
            stripe_subscription_id: subscriptionData.stripe_subscription_id
          })
          .select()
          .single()
        
        if (error) throw error
        return data
      },
      { subscriptionData }
    )
  }

  /**
   * Inicializar recursos para novo usuário
   */
  async initializeNewUser(userId: string) {
    return this.executeAdminOperation(
      'initializeNewUser',
      userId,
      async () => {
        // 1. Verificar se já existe subscription
        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (!existingSubscription) {
          // Criar subscription inicial para usuários gratuitos
          const { error: subscriptionError } = await supabaseAdmin
            .from('subscriptions')
            .insert({
              user_id: userId,
              plan_type: 'free',
              status: 'active',
              monthly_requests_limit: 50,
              requests_used_this_month: 0,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
            })

          if (subscriptionError && subscriptionError.code !== '23505') {
            logger.warn('⚠️ Failed to create initial subscription:', subscriptionError)
          } else {
            logger.info('✅ Initial subscription created', { userId, plan: 'free' })
          }
        }

        // 2. Criar período de uso mensal inicial
        const currentDate = new Date()
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        
        const { error: usageError } = await supabaseAdmin
          .from('user_monthly_usage')
          .insert({
            user_id: userId,
            period_start: monthStart.toISOString(),
            period_end: monthEnd.toISOString(),
            requests_used: 0,
            period_month: monthStart.toISOString().substring(0, 10)
          })
        
        if (usageError && usageError.code !== '23505') { // Ignore unique constraint violations
          logger.warn('⚠️ Failed to create initial usage period:', usageError)
        }

        // 3. Inicializar créditos gratuitos usando função do banco
        const { error: creditsError } = await supabaseAdmin
          .rpc('initialize_user_credits', {
            p_user_id: userId,
            p_plan_type: 'free'
          })

        if (creditsError && creditsError.code !== '23505') {
          logger.warn('⚠️ Failed to create initial credits:', creditsError)
        } else {
          logger.info('✅ Initial credits created', { userId, credits: 3 })
        }

        logger.info('✅ User initialization completed', { userId })
        return true
      }
    )
  }
}

export default new SecureDbService()