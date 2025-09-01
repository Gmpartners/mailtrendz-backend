import Stripe from 'stripe'
import { logger } from '../utils/logger'
import { supabase, supabaseAdmin } from '../config/supabase.config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-06-30.basil'
})

// ✅ CORRIGIDO: Tipo para compatibilidade com banco de dados
type ValidPlanType = 'free' | 'starter' | 'enterprise' | 'unlimited'

interface PriceMap {
  starter: {
    monthly: string
    yearly: string
  }
  enterprise: {
    monthly: string
    yearly: string
  }
  unlimited: {
    monthly: string
    yearly: string
  }
}

// 🔧 FIX: Price IDs corrigidos e com fallback para live mode
const PRICE_IDS: PriceMap = {
  starter: {
    // 🔧 FIX: Usar variáveis consistentes ou fallback para live mode
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_1RvjVfLIDpwN7e9F8T0CENMT',
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || process.env.STRIPE_PRICE_PRO_YEARLY || 'price_1RvjVcLIDpwN7e9FTfR0kdOR'
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_1RvjVaLIDpwN7e9FdwUz9j1i',
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_1RvjVYLIDpwN7e9Ff2Xh2Aee'
  },
  unlimited: {
    monthly: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY || 'price_1RvjVWLIDpwN7e9Fr4Mnt9LI',
    yearly: process.env.STRIPE_PRICE_UNLIMITED_YEARLY || 'price_1RvjVRLIDpwN7e9FGLJ6ZxtI'
  }
}

const PLAN_FEATURES = {
  free: {
    credits: 3,
    emails: 3,
    price_monthly: 0,
    price_yearly: 0,
    features: [
      '3 créditos de IA',
      'Editor básico',
      'Suporte por email',
      'Projetos limitados'
    ]
  },
  // ✅ CORRIGIDO: Mudei 'pro' para 'starter'
  starter: {
    credits: 20,
    emails: 20,
    price_monthly: 1400,
    price_yearly: 12000,
    features: [
      '20 emails por mês',
      '20 créditos de IA',
      'Editor avançado',
      'Exportação HTML',
      'Suporte prioritário'
    ]
  },
  enterprise: {
    credits: 50,
    emails: 100,
    price_monthly: 2200,
    price_yearly: 21600,
    features: [
      '100 emails por mês',
      '50 créditos de IA',
      'Todos os recursos Starter',
      'Pastas organizadas',
      'Multi-usuário',
      'Suporte 24/7'
    ]
  },
  unlimited: {
    credits: -1,
    emails: -1,
    price_monthly: 3600,
    price_yearly: 36000,
    promotional_price: 3600,
    original_price: 3600,
    features: [
      'Emails ilimitados',
      'Créditos de IA ilimitados',
      'Todos os recursos Enterprise',
      'API dedicada',
      'Webhooks personalizados',
      'Account manager dedicado'
    ]
  }
}

class StripeService {
  async createCustomer(userId: string, email?: string, name?: string): Promise<string> {
    try {
      logger.info('🔍 [STRIPE] Creating customer for user', { userId, email: email?.substring(0, 5) + '***' })

      // 🔧 FIX: Verificar subscription existente com melhor tratamento de erro
      const { data: existingSubscription, error: queryError } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle() // 🔧 FIX: usar maybeSingle() ao invés de single()

      // 🔧 FIX: Tratar queryError adequadamente
      if (queryError) {
        logger.warn('⚠️ [STRIPE] Query error checking subscription:', queryError.message)
        // Continuar para criar novo customer se houver erro na consulta
      }

      // 🔧 FIX: Validação melhorada do customer existente
      if (existingSubscription?.stripe_customer_id && !queryError) {
        try {
          const customer = await stripe.customers.retrieve(existingSubscription.stripe_customer_id)
          if (!customer.deleted) {
            logger.info('✅ [STRIPE] Valid existing customer found', { userId, customerId: customer.id })
            return existingSubscription.stripe_customer_id
          }
        } catch (stripeError: any) {
          logger.warn('⚠️ [STRIPE] Invalid customer ID, will create new one', {
            userId,
            error: stripeError.message?.substring(0, 50)
          })
        }
      }

      // 🔧 FIX: Melhor validação de dados de entrada
      if (!email) {
        throw new Error('Email is required to create Stripe customer')
      }

      // 🔧 FIX: Melhor extração de nome
      const customerName = name || email.split('@')[0] || 'User'

      logger.info('🔍 [STRIPE] Creating new Stripe customer', { userId, hasEmail: !!email, hasName: !!name })

      const customerData: Stripe.CustomerCreateParams = {
        email,
        name: customerName,
        metadata: {
          supabase_user_id: userId,
          created_via: 'mailtrendz_backend',
          creation_date: new Date().toISOString()
        }
      }

      const customer = await stripe.customers.create(customerData)
      logger.info('✅ [STRIPE] Customer created successfully', { userId, customerId: customer.id })

      // 🔧 FIX: Upsert mais robusto e atômico
      const upsertData = {
        user_id: userId,
        stripe_customer_id: customer.id,
        plan_type: 'free' as ValidPlanType,
        status: 'active',
        updated_at: new Date().toISOString()
      }

      const { error: upsertError } = await supabaseAdmin
        .from('subscriptions')
        .upsert(upsertData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })

      if (upsertError) {
        logger.error('❌ [STRIPE] Failed to save customer to database', {
          userId,
          error: upsertError.message,
          customerId: customer.id
        })
        
        // 🔧 FIX: Cleanup - deletar customer do Stripe se DB falhou
        try {
          await stripe.customers.del(customer.id)
          logger.info('🧹 [STRIPE] Cleaned up Stripe customer after DB failure')
        } catch (cleanupError) {
          logger.error('❌ [STRIPE] Failed to cleanup Stripe customer', cleanupError)
        }
        
        throw new Error(`Database error: ${upsertError.message}`)
      }

      logger.info('✅ [STRIPE] Customer creation completed', { userId, customerId: customer.id })

      return customer.id
    } catch (error: any) {
      logger.error('❌ [STRIPE] createCustomer failed:', {
        userId,
        error: error.message,
        errorType: error.constructor.name
      })
      throw error
    }
  }

  // 🔧 FIX: Método auxiliar para extrair nome do usuário
  private extractUserName(user: any): string {
    // Tentar diferentes fontes de nome
    if (user.user_metadata?.name) {
      return user.user_metadata.name
    }
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    if (user.raw_user_meta_data?.name) {
      return user.raw_user_meta_data.name
    }
    if (user.raw_user_meta_data?.full_name) {
      return user.raw_user_meta_data.full_name
    }
    // Fallback para email
    return user.email?.split('@')[0] || 'User'
  }

  async createCheckoutSession(
    userId: string, 
    priceId: string, 
    successUrl: string, 
    cancelUrl: string
  ): Promise<string> {
    try {
      logger.info('🚀 [STRIPE] Creating checkout session', { userId, priceId })

      // Verificar se o price ID é válido
      if (!priceId) {
        throw new Error('Price ID is required')
      }

      // Buscar dados do usuário
      logger.info('🔍 [STRIPE] Fetching user auth data...')
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (authError) {
        logger.error('❌ [STRIPE] Auth error:', authError)
        throw new Error(`Auth error: ${authError.message}`)
      }
      
      if (!authUser?.user) {
        logger.error('❌ [STRIPE] Auth user not found', { userId })
        throw new Error('Auth user not found')
      }

      logger.info('✅ [STRIPE] Auth user found', { 
        userId, 
        email: authUser.user.email,
        hasEmail: !!authUser.user.email 
      })

      // 🔧 FIX: Buscar e criar profile com tratamento robusto
      let profile: any = null
      const { data: existingProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        logger.warn('⚠️ [STRIPE] Error fetching profile:', profileError.message)
      }

      if (!existingProfile) {
        logger.info('🔍 [STRIPE] No profile found, creating one...')
        
        // 🔧 FIX: Extrair nome dos metadados de auth corretamente
        const extractedName = this.extractUserName(authUser.user)
        
        const profileData = {
          id: userId,
          email: authUser.user.email,
          name: extractedName,
          subscription: 'free' as ValidPlanType, // 🔧 FIX: Novos usuários começam com 'free'
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' })
          .select('name, email')
          .single()

        if (createError) {
          logger.error('❌ [STRIPE] Failed to create profile:', createError.message)
          throw new Error(`Profile creation failed: ${createError.message}`)
        }
        
        profile = newProfile
        logger.info('✅ [STRIPE] Profile created successfully', { name: profile?.name })
      } else {
        profile = existingProfile
        logger.info('✅ [STRIPE] Profile found', { name: profile?.name })
      }

      const userEmail = authUser.user.email
      const userName = profile?.name || this.extractUserName(authUser.user)

      logger.info('📋 [STRIPE] User data for checkout:', { 
        userId, 
        email: userEmail, 
        name: userName,
        profileExists: !!profile
      })

      if (!userEmail) {
        throw new Error('User email not found in auth')
      }

      logger.info('🏪 [STRIPE] Creating Stripe customer...')
      const customerId = await this.createCustomer(userId, userEmail, userName)

      const sessionData: any = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId
        },
        subscription_data: {
          metadata: {
            user_id: userId
          }
        }
      }

      logger.info('💳 [STRIPE] Creating Stripe checkout session...', { 
        customerId,
        priceId,
        successUrl,
        cancelUrl,
        metadata: sessionData.metadata
      })

      const session = await stripe.checkout.sessions.create(sessionData)

      logger.info('✅ [STRIPE] Checkout session created successfully!', { 
        sessionId: session.id, 
        sessionUrl: session.url,
        userId 
      })
      
      return session.url || ''
    } catch (error: any) {
      logger.error('❌ [STRIPE] Error creating checkout session:', {
        error: {
          message: error.message,
          code: error.code,
          type: error.type,
          stack: error.stack
        },
        userId,
        priceId,
        timestamp: new Date().toISOString()
      })
      throw error
    }
  }

  async verifyPaymentStatus(userId: string, sessionId: string): Promise<any> {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      
      if (session.payment_status === 'paid' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        
        await this.syncSubscriptionToDatabase(subscription, userId)
        
        const firstItem = subscription.items.data[0]
        
        return {
          paid: true,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            current_period_end: firstItem?.current_period_end ? new Date(firstItem.current_period_end * 1000) : null,
            plan_type: this.getPlanTypeFromPriceId(subscription.items.data[0].price.id)
          }
        }
      }
      
      return {
        paid: false,
        status: session.payment_status
      }
    } catch (error: any) {
      logger.error('Error verifying payment status:', error)
      throw error
    }
  }

  async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single()

      if (!subscription?.stripe_customer_id) {
        throw new Error('No Stripe customer found for user')
      }

      // ✅ VERIFICAR se o customer existe no Stripe live mode antes de criar portal
      try {
        await stripe.customers.retrieve(subscription.stripe_customer_id)
      } catch (stripeError: any) {
        logger.warn('⚠️ Customer not found in live mode for portal, will try to recreate', {
          userId,
          customerId: subscription.stripe_customer_id,
          error: stripeError.message
        })
        
        // Se customer não existe no live mode, tentar recriar
        const newCustomerId = await this.createCustomer(userId)
        
        // Usar o novo customer ID
        const session = await stripe.billingPortal.sessions.create({
          customer: newCustomerId,
          return_url: returnUrl
        })

        logger.info('Portal session created with new customer:', { userId, newCustomerId })
        return session.url
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl
      })

      logger.info('Portal session created:', { userId })
      return session.url
    } catch (error: any) {
      logger.error('Error creating portal session:', error)
      
      // Tratar erros específicos do Stripe
      if (error.type === 'StripeInvalidRequestError') {
        if (error.message.includes('No configuration provided')) {
          throw new Error('Billing portal not configured. Please contact support.')
        }
        if (error.message.includes('customer') && error.message.includes('does not exist')) {
          throw new Error('Customer not found in Stripe. Please contact support.')
        }
      }
      
      throw error
    }
  }

  async updateSubscription(subscriptionId: string, newPriceId: string): Promise<void> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      
      await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: 'create_prorations'
      })

      logger.info('Subscription updated:', { subscriptionId, newPriceId })
    } catch (error: any) {
      logger.error('Error updating subscription:', error)
      throw error
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      })

      await supabase
        .from('subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('stripe_subscription_id', subscriptionId)

      logger.info('Subscription marked for cancellation:', { subscriptionId })
    } catch (error: any) {
      logger.error('Error canceling subscription:', error)
      throw error
    }
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    // DEPRECATED: Use webhookService.processWebhookEvent instead
    // Mantido para compatibilidade com controller antigo
    const webhookService = require('./webhook.service').default
    
    try {
      const event = await webhookService.validateSignature(payload, signature)
      await webhookService.processWebhookEvent(event)
    } catch (error: any) {
      logger.error('Legacy webhook handler error:', error)
      throw error
    }
  }

  // ✅ DEPRECATED METHODS REMOVED
  // These methods were replaced by the new webhookService.ts
  // All webhook processing is now handled by the dedicated webhook service

  // ✅ DEPRECATED METHOD REMOVED
  // This method was replaced by the new webhookService.ts

  private async syncSubscriptionToDatabase(
    subscription: Stripe.Subscription, 
    userId?: string
  ): Promise<void> {
    const priceId = subscription.items.data[0].price.id
    const planType = this.getPlanTypeFromPriceId(priceId)
    
    if (!planType) {
      logger.error('Unknown price ID:', { priceId })
      return
    }

    const subscriptionUserId = userId || subscription.metadata?.user_id
    if (!subscriptionUserId) {
      logger.error('No user_id found for subscription')
      return
    }

    const firstItem = subscription.items.data[0]
    
    const subscriptionData = {
      user_id: subscriptionUserId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan_type: planType as ValidPlanType,
      status: subscription.status,
      current_period_start: firstItem?.current_period_start ? new Date(firstItem.current_period_start * 1000).toISOString() : null,
      current_period_end: firstItem?.current_period_end ? new Date(firstItem.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end
    }

    await supabase
      .from('subscriptions')
      .upsert(subscriptionData)

    await supabase
      .from('profiles')
      .update({ subscription: planType as ValidPlanType })
      .eq('id', subscriptionUserId)

    await supabase.rpc('initialize_user_credits', {
      p_user_id: subscriptionUserId,
      p_plan_type: planType as ValidPlanType
    })

    logger.info('Subscription synced to database:', { 
      subscriptionId: subscription.id, 
      planType,
      userId: subscriptionUserId 
    })
  }

  // ✅ CORRIGIDO: Mudei retorno de 'pro' para 'starter'
  private getPlanTypeFromPriceId(priceId: string): ValidPlanType | null {
    for (const [plan, prices] of Object.entries(PRICE_IDS)) {
      if (prices.monthly === priceId || prices.yearly === priceId) {
        return plan as ValidPlanType
      }
    }
    return null
  }

  async getPriceIds() {
    return PRICE_IDS
  }

  async getPlansInfo() {
    return PLAN_FEATURES
  }

  async checkUpgradeRequired(userId: string, feature: string): Promise<{
    required: boolean
    currentPlan: string
    requiredPlan: string
    message: string
  }> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription')
        .eq('id', userId)
        .single()

      const currentPlan = profile?.subscription || 'free'
      
      const featureRequirements = {
        'ai_generation': 'starter', // ✅ CORRIGIDO: mudei de 'pro' para 'starter'
        'html_export': 'starter',   // ✅ CORRIGIDO: mudei de 'pro' para 'starter'
        'folders': 'enterprise',
        'multi_user': 'enterprise',
        'api_access': 'unlimited'
      }

      const requiredPlan = featureRequirements[feature as keyof typeof featureRequirements]
      
      if (!requiredPlan) {
        return {
          required: false,
          currentPlan,
          requiredPlan: currentPlan,
          message: 'Feature disponível no seu plano atual'
        }
      }

      // ✅ CORRIGIDO: mudei 'pro' para 'starter' na hierarquia
      const planHierarchy = ['free', 'starter', 'enterprise', 'unlimited']
      const currentLevel = planHierarchy.indexOf(currentPlan)
      const requiredLevel = planHierarchy.indexOf(requiredPlan)

      const upgradeRequired = currentLevel < requiredLevel

      return {
        required: upgradeRequired,
        currentPlan,
        requiredPlan,
        message: upgradeRequired 
          ? `Recurso disponível apenas no plano ${requiredPlan.toUpperCase()}`
          : 'Recurso disponível no seu plano atual'
      }
    } catch (error: any) {
      logger.error('Error checking upgrade requirement:', error)
      return {
        required: true,
        currentPlan: 'free',
        requiredPlan: 'starter', // ✅ CORRIGIDO: mudei de 'pro' para 'starter'
        message: 'Erro ao verificar plano'
      }
    }
  }
}

export default new StripeService()