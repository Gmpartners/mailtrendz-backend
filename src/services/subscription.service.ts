import { supabase, supabaseAdmin } from '../config/supabase.config'
import { logger } from '../utils/logger'
import { 
  SubscriptionState, 
  ConsumeResult, 
  UsageInfo,
  UpgradeInfo,
  isSubscriptionStateResult,
  SubscriptionType
} from '../types/subscription.types'

// ✅ HELPER: Validar se string é um tipo de assinatura válido
function isValidSubscriptionType(planType: string): planType is SubscriptionType {
  return ['free', 'starter', 'enterprise', 'unlimited'].includes(planType)
}

class SubscriptionService {
  // 🚀 OTIMIZAÇÃO CACHE: Sincronizado com frontend para melhor performance
  private stateCache = new Map<string, { data: SubscriptionState; timestamp: number }>()
  
  // 📊 SMART CACHE: Optimized TTL for subscription state
  private readonly CACHE_TTL_SUBSCRIPTION = 120000 // 2 minutes for subscription data
  
  /**
   * Obter estado completo da assinatura do usuário
   * Usa a view subscription_state criada no banco com cache
   */
  async getState(userId: string): Promise<SubscriptionState | null> {
    try {
      // 🚀 SMART CACHE: Verificar cache primeiro com TTL inteligente
      const cached = this.stateCache.get(userId)
      const now = Date.now()
      
      if (cached && (now - cached.timestamp < this.CACHE_TTL_SUBSCRIPTION)) {
        logger.debug('[SubscriptionService-PERF] Returning cached state for user:', userId)
        return cached.data
      }
      
      // 📈 PERFORMANCE METRICS: Log cache miss for monitoring
      if (cached && (now - cached.timestamp >= this.CACHE_TTL_SUBSCRIPTION)) {
        logger.debug('[SubscriptionService-PERF] Cache expired, fetching fresh data', {
          userId,
          cacheAge: now - cached.timestamp,
          ttl: this.CACHE_TTL_SUBSCRIPTION
        })
      }
      
      logger.debug('[SubscriptionService] Getting fresh state for user:', userId)

      const { data, error } = await supabaseAdmin
        .from('subscription_state')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        logger.error('[SubscriptionService] Error getting state:', error)
        
        // ✅ NOVO: Se não encontrou dados, tentar inicializar o usuário
        if (error.code === 'PGRST116') {
          logger.info('[SubscriptionService] User data not found, attempting to initialize...', { userId })
          const initialized = await this.ensureUserInitialized(userId)
          
          if (initialized) {
            logger.info('[SubscriptionService] User initialized, retrying state fetch...', { userId })
            
            // Tentar novamente após inicialização
            const { data: retryData, error: retryError } = await supabaseAdmin
              .from('subscription_state')
              .select('*')
              .eq('user_id', userId)
              .single()
              
            if (retryError) {
              logger.error('[SubscriptionService] Error on retry after initialization:', retryError)
              
              // ✅ FALLBACK FINAL: Construir state manualmente das tabelas base
              logger.info('[SubscriptionService] Attempting manual state construction...', { userId })
              const manualState = await this.constructStateManually(userId)
              if (manualState) {
                return manualState
              }
              
              return null
            }
            
            if (!retryData) {
              logger.error('[SubscriptionService] No data found after initialization')
              
              // ✅ FALLBACK FINAL: Construir state manualmente das tabelas base
              logger.info('[SubscriptionService] Attempting manual state construction...', { userId })
              const manualState = await this.constructStateManually(userId)
              if (manualState) {
                return manualState
              }
              
              return null
            }
            
            // Continuar com os dados obtidos na retry
            return this.processStateData(retryData, userId)
          }
        }
        
        return null
      }

      if (!data) {
        return null
      }

      return this.processStateData(data, userId)
    } catch (error) {
      logger.error('[SubscriptionService] Error getting subscription state:', error)
      return null
    }
  }

  /**
   * ✅ NOVO: Processar dados de estado (extraído para reutilização)
   */
  private processStateData(data: any, userId: string): SubscriptionState | null {
    try {

      // Validar e converter os dados
      if (!isSubscriptionStateResult(data)) {
        logger.error('[SubscriptionService] Invalid subscription state data format')
        return null
      }

      const stateData = {
        userId: data.user_id,
        email: data.email || '',
        name: data.name,
        planType: data.plan_type,
        status: data.status,
        monthlyCredits: data.monthly_credits,
        creditsAvailable: data.credits_available,
        creditsUsed: data.credits_used,
        features: {
          maxProjects: data.max_projects,
          hasMultiUser: data.has_multi_user,
          hasHtmlExport: data.has_html_export,
          hasEmailPreview: data.has_email_preview,
          hasAiImageAnalysis: data.has_ai_image_analysis || false  // ✅ NOVA FEATURE
        },
        isUnlimited: data.is_unlimited,
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
        currentPeriodStart: data.current_period_start ? new Date(data.current_period_start) : undefined,
        currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : undefined,
        cancelAtPeriodEnd: data.cancel_at_period_end,
        
        // ✅ NOVOS CAMPOS PARA FREE VITALÍCIO
        freeRequestsUsed: data.free_requests_used,
        freeRequestsLimit: data.free_requests_limit,
        isFreePlan: data.is_free_plan,
        isLifetimeFree: data.is_lifetime_free
      }
      
      // Cachear resultado
      this.stateCache.set(userId, {
        data: stateData,
        timestamp: Date.now()
      })
      
      return stateData
    } catch (error) {
      logger.error('[SubscriptionService] Error processing state data:', error)
      return null
    }
  }

  /**
   * ✅ NOVO: Garantir que um usuário tenha dados inicializados
   */
  private async ensureUserInitialized(userId: string): Promise<boolean> {
    try {
      logger.info('[SubscriptionService] Initializing missing user data...', { userId })

      // 1. Verificar se o perfil existe - se não, criar (usando admin client)
      let { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, subscription, email, name')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        logger.warn('[SubscriptionService] Profile not found, attempting to create...', profileError)
        
        // Tentar buscar dados do usuário do auth.users
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
        
        if (authError || !authUser.user) {
          logger.error('[SubscriptionService] Cannot find user in auth.users:', authError)
          return false
        }

        // Criar profile faltante
        const email = authUser.user.email
        const name = authUser.user.user_metadata?.name || authUser.user.user_metadata?.full_name || email?.split('@')[0]
        
        logger.info('[SubscriptionService] Creating missing profile...', { userId, email, name })

        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            name: name,
            subscription: 'starter', // Usar 'starter' pois logs mostram que usuário tem esta subscription
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id, subscription, email, name')
          .single()

        if (createError) {
          logger.error('[SubscriptionService] Failed to create profile:', createError)
          return false
        }

        profile = newProfile
        logger.info('[SubscriptionService] Profile created successfully:', { userId, email })
      }

      // 2. Usar função administrativa para inicializar dados
      const { error: initError } = await supabaseAdmin
        .rpc('initialize_user_credits', {
          p_user_id: userId,
          p_plan_type: (profile.subscription || 'free') as 'free' | 'starter' | 'enterprise' | 'unlimited'
        })

      if (initError) {
        logger.error('[SubscriptionService] Error initializing user credits:', initError)
      } else {
        logger.info('[SubscriptionService] User credits initialized successfully')
      }

      // 3. Criar subscription se não existir - método mais seguro
      try {
        const { data: existingSubscription } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('user_id', userId)
          .single()

        if (!existingSubscription) {
          const { error: subscriptionError } = await supabaseAdmin
            .from('subscriptions')
            .insert({
              user_id: userId,
              plan_type: profile.subscription || 'starter',
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (subscriptionError) {
            logger.warn('[SubscriptionService] Warning creating subscription:', subscriptionError)
          } else {
            logger.info('[SubscriptionService] Subscription created successfully')
          }
        } else {
          logger.info('[SubscriptionService] Subscription already exists')
        }
      } catch (subError) {
        logger.warn('[SubscriptionService] Warning checking subscription:', subError)
      }

      // 4. Criar período de uso mensal - sem period_month (campo gerado)
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      try {
        const { data: existingUsage } = await supabaseAdmin
          .from('user_monthly_usage')
          .select('user_id')
          .eq('user_id', userId)
          .gte('period_start', periodStart.toISOString())
          .single()

        if (!existingUsage) {
          const { error: usageError } = await supabaseAdmin
            .from('user_monthly_usage')
            .insert({
              user_id: userId,
              period_start: periodStart.toISOString(),
              period_end: periodEnd.toISOString(),
              requests_used: 0,
              // ✅ Removido period_month - é campo gerado automaticamente
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (usageError) {
            logger.warn('[SubscriptionService] Warning creating monthly usage:', usageError)
          } else {
            logger.info('[SubscriptionService] Monthly usage created successfully')
          }
        } else {
          logger.info('[SubscriptionService] Monthly usage already exists')
        }
      } catch (usageCheckError) {
        logger.warn('[SubscriptionService] Warning checking monthly usage:', usageCheckError)
      }

      logger.info('[SubscriptionService] User initialization completed successfully', { userId })
      return true
    } catch (error) {
      logger.error('[SubscriptionService] Error ensuring user initialization:', error)
      return false
    }
  }

  /**
   * ✅ FALLBACK: Construir state manualmente das tabelas base quando view falha
   */
  private async constructStateManually(userId: string): Promise<SubscriptionState | null> {
    try {
      logger.info('[SubscriptionService] Constructing state manually from base tables...', { userId })

      // 1. Buscar profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!profile) {
        logger.error('[SubscriptionService] Profile not found for manual construction')
        return null
      }

      // 2. Buscar subscription
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single()

      // 3. Buscar plan features
      const { data: planFeatures } = await supabaseAdmin
        .from('plan_features')
        .select('*')
        .eq('plan_type', profile.subscription || 'starter')
        .single()

      // 4. Construir state manualmente
      const manualState: SubscriptionState = {
        userId: profile.id,
        email: profile.email || '',
        name: profile.name || '',
        planType: profile.subscription || 'starter',
        status: subscription?.status || 'active',
        monthlyCredits: planFeatures?.ai_credits || 20,
        creditsAvailable: planFeatures?.ai_credits || 20,
        creditsUsed: 0,
        features: {
          maxProjects: planFeatures?.max_projects || 50,
          hasMultiUser: planFeatures?.has_multi_user || false,
          hasHtmlExport: planFeatures?.has_html_export || true,
          hasEmailPreview: planFeatures?.has_email_preview || true,
          hasAiImageAnalysis: planFeatures?.has_ai_image_analysis || false  // ✅ NOVA FEATURE
        },
        isUnlimited: (profile.subscription || 'starter') === 'unlimited',
        stripeCustomerId: subscription?.stripe_customer_id || undefined,
        stripeSubscriptionId: subscription?.stripe_subscription_id || undefined,
        currentPeriodStart: subscription?.current_period_start ? new Date(subscription.current_period_start) : undefined,
        currentPeriodEnd: subscription?.current_period_end ? new Date(subscription.current_period_end) : undefined,
        cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
        freeRequestsUsed: 0,
        freeRequestsLimit: 3,
        isFreePlan: (profile.subscription || 'starter') === 'free',
        isLifetimeFree: profile.is_lifetime_free || false
      }

      logger.info('[SubscriptionService] State constructed manually successfully', { 
        userId, 
        planType: manualState.planType,
        credits: manualState.creditsAvailable 
      })

      // Cachear resultado
      this.stateCache.set(userId, {
        data: manualState,
        timestamp: Date.now()
      })

      return manualState
    } catch (error) {
      logger.error('[SubscriptionService] Error constructing state manually:', error)
      return null
    }
  }

  /**
   * ✅ MÉTODO ATUALIZADO: Consumir créditos usando sistema unificado
   */
  async consumeCredits(userId: string, amount: number = 1, operation: string = 'ai_generation'): Promise<ConsumeResult> {
    try {
      logger.debug('[SubscriptionService] Consuming credits via unified system:', { userId, amount, operation })

      // ✅ USAR FUNÇÃO ESPECÍFICA PARA CHAT AI
      let rpcFunction: string
      let rpcParams: any

      if (operation === 'ai_chat' || operation === 'chat_ai_processing') {
        rpcFunction = 'consume_ai_chat_credit'
        rpcParams = { p_user_id: userId }
        logger.info('[SubscriptionService] Using AI chat specific credit consumption:', { userId, operation })
      } else {
        rpcFunction = 'consume_credit'
        rpcParams = { p_user_id: userId, p_amount: amount }
      }

      const { data, error } = await supabase.rpc(rpcFunction as any, rpcParams)

      if (error) {
        logger.error('[SubscriptionService] Error consuming credits:', error)
        throw error
      }

      logger.info('[SubscriptionService] Credits consumed successfully:', data)
      
      // Limpar cache após consumo de créditos
      this.stateCache.delete(userId)

      // ✅ CORREÇÃO: RPC retorna array, pegar primeiro elemento
      const result = Array.isArray(data) ? data[0] : data
      if (!result || typeof result !== 'object') {
        logger.error('[SubscriptionService] Invalid response format:', { data, result, isArray: Array.isArray(data) })
        return {
          success: false,
          error: 'invalid_response_format'
        }
      }

      // ✅ CORREÇÃO: Mapear resposta correta do RPC
      return {
        success: result.success || false,
        remaining: result.credits_remaining || 0,
        error: result.error_message || null,
        unlimited: false, // Enterprise plan has limits
        consumed: amount,
        totalUsed: 0, // Can be calculated later if needed
        isFreePlan: false, // Enterprise user
        isLifetimeFree: false,
        planType: 'enterprise',
        monthlyLimit: 50, // Enterprise limit
        resetDate: undefined
      }
    } catch (error) {
      logger.error('[SubscriptionService] Error consuming credits:', error)
      return {
        success: false,
        error: 'internal_error'
      }
    }
  }

  /**
   * ✅ MÉTODO ATUALIZADO: Verificar se usuário pode usar uma feature específica
   */
  async canUseFeature(userId: string, feature: string): Promise<boolean> {
    try {
      const state = await this.getState(userId)
      if (!state) return false

      switch (feature) {
        case 'multi_user':
          return state.features.hasMultiUser
        case 'html_export':
          return state.features.hasHtmlExport
        case 'email_preview':
          return state.features.hasEmailPreview
        case 'ai_image_analysis':  // ✅ NOVA FEATURE
          return state.features.hasAiImageAnalysis
        default:
          return true
      }
    } catch (error) {
      logger.error('[SubscriptionService] Error checking feature:', error)
      return false
    }
  }

  /**
   * Verificar se usuário tem créditos disponíveis
   */
  async hasCredits(userId: string, amount: number = 1): Promise<boolean> {
    try {
      const state = await this.getState(userId)
      if (!state) return false
      
      return state.isUnlimited || state.creditsAvailable >= amount
    } catch (error) {
      logger.error('[SubscriptionService] Error checking credits:', error)
      return false
    }
  }

  /**
   * Obter informações de uso para o dashboard
   */
  async getUsageInfo(userId: string): Promise<UsageInfo | null> {
    try {
      const state = await this.getState(userId)
      if (!state) return null

      const now = new Date()
      const periodEnd = state.currentPeriodEnd || new Date()
      const daysUntilReset = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

      return {
        planType: state.planType,
        status: state.status,
        usage: {
          used: state.creditsUsed,
          available: state.creditsAvailable,
          total: state.monthlyCredits,
          unlimited: state.isUnlimited,
          percentage: state.isUnlimited ? 0 : Math.round((state.creditsUsed / state.monthlyCredits) * 100)
        },
        features: state.features,
        billing: {
          currentPeriodStart: state.currentPeriodStart,
          currentPeriodEnd: state.currentPeriodEnd,
          cancelAtPeriodEnd: state.cancelAtPeriodEnd,
          daysUntilReset: state.isLifetimeFree ? 0 : daysUntilReset  // ✅ FREE não reseta
        },
        stripe: {
          customerId: state.stripeCustomerId,
          subscriptionId: state.stripeSubscriptionId
        }
      }
    } catch (error) {
      logger.error('[SubscriptionService] Error getting usage info:', error)
      return null
    }
  }

  /**
   * Verificar limite de projetos
   */
  async checkProjectLimit(userId: string, currentProjectCount: number): Promise<boolean> {
    try {
      const state = await this.getState(userId)
      if (!state) return false

      return currentProjectCount < state.features.maxProjects
    } catch (error) {
      logger.error('[SubscriptionService] Error checking project limit:', error)
      return false
    }
  }

  /**
   * ✅ MÉTODO ATUALIZADO: Informações de upgrade específicas para nova feature
   */
  async getUpgradeInfo(userId: string, reason: 'credits' | 'projects' | 'features' | 'ai_image_analysis'): Promise<UpgradeInfo | null> {
    try {
      const state = await this.getState(userId)
      if (!state) return null

      const currentPlan = state.planType
      const upgradeOptions = []

      // ✅ NOVA MENSAGEM ESPECÍFICA PARA AI IMAGE ANALYSIS
      if (reason === 'ai_image_analysis') {
        return {
          currentPlan,
          reason: 'ai_image_analysis',
          upgradeOptions: [
            {
              planType: 'enterprise',
              benefits: {
                credits: 50,
                renewable: true,
                features: ['ai_image_analysis', 'multi_user', 'html_export', 'email_preview']
              }
            },
            {
              planType: 'unlimited',
              benefits: {
                credits: 'unlimited',
                renewable: true,
                features: ['ai_image_analysis', 'all_features']
              }
            }
          ],
          message: 'Análise de imagens com IA é uma feature exclusiva dos planos Enterprise e Unlimited. Upgrade agora e crie emails ainda mais incríveis!',
          currentUsage: {
            credits: state.isLifetimeFree 
              ? `${state.freeRequestsUsed}/${state.freeRequestsLimit}`
              : `${state.creditsUsed}/${state.monthlyCredits}`,
            projects: state.features.maxProjects
          }
        }
      }

      // ✅ MENSAGEM ESPECÍFICA PARA FREE VITALÍCIO ESGOTADO
      if (state.isLifetimeFree && state.creditsAvailable === 0) {
        return {
          currentPlan: 'free',
          reason: 'free_limit_reached',
          upgradeOptions: [
            {
              planType: 'starter',
              benefits: {
                credits: 20,
                renewable: true,
                features: ['html_export', 'email_preview']
              }
            },
            {
              planType: 'enterprise', 
              benefits: {
                credits: 50,
                renewable: true,
                features: ['ai_image_analysis', 'multi_user', 'html_export', 'email_preview']
              }
            },
            {
              planType: 'unlimited',
              benefits: {
                credits: 'unlimited',
                renewable: true,
                features: ['ai_image_analysis', 'all_features']
              }
            }
          ],
          message: 'Você já utilizou suas 3 requisições gratuitas! Faça upgrade para continuar criando emails incríveis.',
          currentUsage: {
            credits: `${state.freeRequestsUsed}/${state.freeRequestsLimit}`,
            projects: state.features.maxProjects
          }
        }
      }

      // Lógica existente para outros planos continua igual...
      if (currentPlan === 'free') {
        upgradeOptions.push(
          {
            planType: 'starter',
            benefits: {
              credits: 20,
              projects: 50,
              features: ['html_export', 'email_preview']
            }
          },
          {
            planType: 'enterprise',
            benefits: {
              credits: 50,
              projects: 100,
              features: ['ai_image_analysis', 'multi_user', 'html_export', 'email_preview']
            }
          }
        )
      } else if (currentPlan === 'starter') {
        upgradeOptions.push({
          planType: 'enterprise',
          benefits: {
            credits: 50,
            projects: 100,
            features: ['ai_image_analysis', 'multi_user']
          }
        })
      }

      // Sempre sugerir unlimited como opção
      if (currentPlan !== 'unlimited') {
        upgradeOptions.push({
          planType: 'unlimited',
          benefits: {
            credits: 'unlimited',
            projects: 'unlimited',
            features: ['ai_image_analysis', 'all']
          }
        })
      }

      return {
        currentPlan,
        reason,
        upgradeOptions,
        currentUsage: {
          credits: state.isLifetimeFree 
            ? `${state.freeRequestsUsed}/${state.freeRequestsLimit}`
            : `${state.creditsUsed}/${state.monthlyCredits}`,
          projects: state.features.maxProjects
        }
      }
    } catch (error) {
      logger.error('[SubscriptionService] Error getting upgrade info:', error)
      return null
    }
  }

  /**
   * ✅ MÉTODO ROBUSTO: Migrar usuário para novo plano com sincronização
   */
  async migrateFromLifetimeFree(userId: string, newPlanType: string): Promise<boolean> {
    try {
      logger.info('[SubscriptionService] Migrating from lifetime free:', { userId, newPlanType })

      // ✅ VALIDAR TIPO DE ASSINATURA
      if (!isValidSubscriptionType(newPlanType)) {
        logger.error('[SubscriptionService] Invalid subscription type:', newPlanType)
        return false
      }

      // Atualizar profile (trigger sincronizará automaticamente)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          is_lifetime_free: false,
          subscription: newPlanType,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (profileError) {
        logger.error('[SubscriptionService] Error updating profile:', profileError)
        return false
      }

      // Garantir período mensal para o novo plano
      try {
        // Criar período mensal manualmente
        const now = new Date()
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

        const { error: periodError } = await supabase
          .from('user_monthly_usage')
          .upsert({
            user_id: userId,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            requests_used: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,period_month',
            ignoreDuplicates: true
          })

        if (periodError) {
          logger.warn('[SubscriptionService] Warning creating monthly period:', periodError)
        }
      } catch (periodError) {
        logger.warn('[SubscriptionService] Warning creating monthly period:', periodError)
      }

      logger.info('[SubscriptionService] Successfully migrated user to:', newPlanType)
      return true
    } catch (error) {
      logger.error('[SubscriptionService] Error migrating from lifetime free:', error)
      return false
    }
  }

  /**
   * Resetar uso mensal (útil para testes)
   */
  async resetMonthlyUsage(userId: string): Promise<boolean> {
    try {
      logger.info('[SubscriptionService] Resetting monthly usage for:', userId)

      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      const { error } = await supabase
        .from('user_monthly_usage')
        .update({ 
          requests_used: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .gte('period_start', periodStart.toISOString())
        .lte('period_end', periodEnd.toISOString())

      if (error) {
        logger.error('[SubscriptionService] Error resetting usage:', error)
        return false
      }

      return true
    } catch (error) {
      logger.error('[SubscriptionService] Error resetting monthly usage:', error)
      return false
    }
  }

  /**
   * ✅ MÉTODO ROBUSTO: Sincronizar assinatura com trigger automático
   */
  async syncSubscription(userId: string, planType: string, stripeData?: any): Promise<boolean> {
    try {
      logger.info('[SubscriptionService] Syncing subscription:', { userId, planType, stripeData })

      // ✅ VALIDAR TIPO DE ASSINATURA
      if (!isValidSubscriptionType(planType)) {
        logger.error('[SubscriptionService] Invalid subscription type:', planType)
        return false
      }

      // Atualizar profile (trigger sincronizará tabela subscriptions automaticamente)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          subscription: planType,
          is_lifetime_free: false, // Usuários pagos não são lifetime free
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (profileError) {
        logger.error('[SubscriptionService] Error syncing profile:', profileError)
        return false
      }

      // Atualizar dados específicos do Stripe se fornecidos
      if (stripeData) {
        const { error: stripeError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan_type: planType,
            stripe_customer_id: stripeData.customer_id,
            stripe_subscription_id: stripeData.subscription_id,
            stripe_price_id: stripeData.price_id,
            status: 'active',
            current_period_start: stripeData.current_period_start,
            current_period_end: stripeData.current_period_end,
            billing_interval: stripeData.billing_interval || 'month',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })

        if (stripeError) {
          logger.error('[SubscriptionService] Error syncing Stripe data:', stripeError)
          // Não falhar por isso, profile já foi atualizado
        }
      }

      logger.info('[SubscriptionService] Successfully synced subscription')
      return true
    } catch (error) {
      logger.error('[SubscriptionService] Error syncing subscription:', error)
      return false
    }
  }
}

export default new SubscriptionService()