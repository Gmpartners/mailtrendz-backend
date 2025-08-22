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

// ✅ CORRIGIDO: Mudei 'pro' para 'starter' para corresponder ao schema do banco
const PRICE_IDS: PriceMap = {
  starter: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || ''
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || ''
  },
  unlimited: {
    monthly: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_UNLIMITED_YEARLY || ''
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
      logger.info('🔍 STEP 1: Starting createCustomer method', {
        userId,
        email,
        name,
        timestamp: new Date().toISOString()
      })

      // Log antes de verificar subscription existente
      logger.info('🔍 STEP 2: Checking for existing subscription', {
        userId,
        query: `SELECT stripe_customer_id FROM subscriptions WHERE user_id = '${userId}'`
      })

      const { data: existingSubscription, error: queryError } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single()

      // Log detalhado do resultado da consulta
      logger.info('🔍 STEP 3: Query result for existing subscription', {
        userId,
        existingSubscription,
        queryError,
        hasCustomerId: !!existingSubscription?.stripe_customer_id
      })

      if (existingSubscription?.stripe_customer_id) {
        logger.info('🔍 STEP 4: Found existing customer, validating with Stripe...', {
          userId,
          existingCustomerId: existingSubscription.stripe_customer_id
        })
        
        try {
          // ✅ VERIFICAR se o customer existe no Stripe live mode
          const customer = await stripe.customers.retrieve(existingSubscription.stripe_customer_id)
          logger.info('✅ STEP 4a: Customer validated in Stripe live mode', {
            userId,
            customerId: customer.id,
            customerEmail: customer.deleted ? null : (customer as Stripe.Customer).email
          })
          return existingSubscription.stripe_customer_id
        } catch (stripeError: any) {
          logger.warn('⚠️ STEP 4b: Customer not found in Stripe live mode, creating new one', {
            userId,
            oldCustomerId: existingSubscription.stripe_customer_id,
            stripeError: stripeError.message,
            isTestModeError: stripeError.message.includes('test mode')
          })
          
          // Customer existe apenas no test mode, vamos criar um novo
          // Não retornamos o antigo, continuamos para criar um novo
        }
      }

      // Log antes de criar customer no Stripe
      logger.info('🔍 STEP 5: No existing customer found, creating new Stripe customer', {
        userId,
        email,
        name
      })

      const customerData: any = {
        metadata: {
          supabase_user_id: userId
        }
      }

      if (email) {
        customerData.email = email
      }

      if (name) {
        customerData.name = name
      }

      logger.info('🔍 STEP 6: Stripe customer data prepared', {
        userId,
        customerData: JSON.stringify(customerData, null, 2)
      })

      const customer = await stripe.customers.create(customerData)

      logger.info('✅ STEP 7: Stripe customer created successfully', {
        userId,
        customerId: customer.id,
        customerEmail: customer.email,
        customerName: customer.name
      })

      // Log antes do upsert no Supabase
      const upsertData = {
        user_id: userId,
        stripe_customer_id: customer.id,
        plan_type: 'free' as 'free' | 'starter' | 'enterprise' | 'unlimited',
        status: 'active'
      }

      // ✅ Se havia um customer antigo (test mode), loggar a migração
      if (existingSubscription?.stripe_customer_id) {
        logger.info('🔄 STEP 7b: Migrating from test mode customer to live mode customer', {
          userId,
          oldCustomerId: existingSubscription.stripe_customer_id,
          newCustomerId: customer.id,
          migrationReason: 'Test mode customer detected with live mode keys'
        })
      }

      logger.info('🔍 STEP 8: Preparing upsert to subscriptions table', {
        userId,
        upsertData: JSON.stringify(upsertData, null, 2),
        tableName: 'subscriptions'
      })

      const { data: upsertResult, error: upsertError } = await supabaseAdmin
        .from('subscriptions')
        .upsert(upsertData)

      // Log detalhado do resultado do upsert
      if (upsertError) {
        logger.error('❌ STEP 9: UPSERT FAILED', {
          userId,
          customerId: customer.id,
          upsertError: {
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint,
            code: upsertError.code
          },
          upsertData,
          timestamp: new Date().toISOString()
        })
        throw new Error(`Upsert failed: ${upsertError.message}`)
      } else {
        logger.info('✅ STEP 9: UPSERT SUCCESSFUL', {
          userId,
          customerId: customer.id,
          upsertResult,
          upsertData,
          timestamp: new Date().toISOString()
        })
      }

      logger.info('✅ STEP 10: createCustomer completed successfully', {
        userId,
        customerId: customer.id,
        totalSteps: 10,
        timestamp: new Date().toISOString()
      })

      return customer.id
    } catch (error: any) {
      logger.error('❌ CRITICAL ERROR in createCustomer:', {
        userId,
        email,
        name,
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
          type: error.type,
          name: error.name
        },
        timestamp: new Date().toISOString()
      })
      throw error
    }
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

      // Buscar profile (opcional)
      logger.info('🔍 [STRIPE] Fetching user profile...')
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .single()

      if (profileError) {
        logger.warn('⚠️ [STRIPE] Profile not found, will create minimal one', { 
          userId, 
          error: profileError.message 
        })
        
        // Criar profile básico se não existir
        const { error: createError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            email: authUser.user.email,
            name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User',
            subscription: 'starter',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })

        if (createError) {
          logger.error('❌ [STRIPE] Failed to create profile', createError)
          // Não bloquear checkout por isso
        } else {
          logger.info('✅ [STRIPE] Profile created successfully')
        }
      }

      const userEmail = authUser.user.email
      const userName = profile?.name || authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User'

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