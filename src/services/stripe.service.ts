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
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || ''
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
      '3 emails por mês',
      '3 créditos de IA',
      'Editor básico',
      'Suporte por email'
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
        logger.info('✅ STEP 4: Found existing customer, returning early', {
          userId,
          existingCustomerId: existingSubscription.stripe_customer_id
        })
        return existingSubscription.stripe_customer_id
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
      logger.info('Creating checkout session for user:', { userId, priceId })

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (!authUser?.user) {
        throw new Error('Auth user not found')
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single()

      const userEmail = authUser.user.email
      const userName = profile?.name || authUser.user.user_metadata?.name || 'User'

      logger.info('User data for checkout:', { 
        userId, 
        email: userEmail, 
        name: userName 
      })

      if (!userEmail) {
        throw new Error('User email not found in auth')
      }

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

      logger.info('Creating Stripe checkout session:', { sessionData })

      const session = await stripe.checkout.sessions.create(sessionData)

      logger.info('Checkout session created:', { sessionId: session.id, userId })
      return session.url || ''
    } catch (error: any) {
      logger.error('Error creating checkout session:', error)
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