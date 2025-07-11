import Stripe from 'stripe'
import { logger } from '../utils/logger'
import { supabase, supabaseAdmin } from '../config/supabase.config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-06-30.basil'
})

interface PriceMap {
  pro: {
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

const PRICE_IDS: PriceMap = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || process.env.STRIPE_PRICE_STARTER_YEARLY || ''
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
  pro: {
    credits: 20,
    emails: 20,
    price_monthly: 2990,
    price_yearly: 24900,
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
    price_monthly: 4990,
    price_yearly: 39900,
    features: [
      '100 emails por mês',
      '50 créditos de IA',
      'Todos os recursos Pro',
      'Pastas organizadas',
      'Multi-usuário',
      'Suporte 24/7'
    ]
  },
  unlimited: {
    credits: -1,
    emails: -1,
    price_monthly: 1500,
    price_yearly: 79900,
    promotional_price: 1500,
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
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single()

      if (existingSubscription?.stripe_customer_id) {
        return existingSubscription.stripe_customer_id
      }

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

      const customer = await stripe.customers.create(customerData)

      await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customer.id,
          plan_type: 'free',
          status: 'active'
        })

      logger.info('Stripe customer created:', { customerId: customer.id, userId })
      return customer.id
    } catch (error: any) {
      logger.error('Error creating Stripe customer:', error)
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
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
      if (!webhookSecret) {
        throw new Error('Stripe webhook secret not configured')
      }

      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      )

      logger.info('Stripe webhook received:', { type: event.type })

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break
        
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
          break
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break
        
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice)
          break
        
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice)
          break
        
        default:
          logger.info('Unhandled webhook event type:', { type: event.type })
      }
    } catch (error: any) {
      logger.error('Webhook error:', error)
      throw error
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.user_id
    if (!userId) {
      logger.error('No user_id in checkout session metadata')
      return
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    await this.syncSubscriptionToDatabase(subscription, userId)
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    await this.syncSubscriptionToDatabase(subscription)
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.user_id
    const firstItem = subscription.items.data[0]

    await supabase
      .from('subscriptions')
      .update({ 
        status: 'canceled',
        current_period_end: firstItem?.current_period_end ? new Date(firstItem.current_period_end * 1000).toISOString() : null
      })
      .eq('stripe_subscription_id', subscription.id)

    if (userId) {
      await supabase
        .from('profiles')
        .update({ subscription: 'free' })
        .eq('id', userId)

      await supabase.rpc('initialize_user_credits', {
        p_user_id: userId,
        p_plan_type: 'free'
      })
    }

    logger.info('Subscription deleted:', { subscriptionId: subscription.id })
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Payment succeeded for invoice:', { invoiceId: invoice.id })
    
    const subscriptionId = this.getSubscriptionIdFromInvoiceLines(invoice)
    
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const userId = subscription.metadata?.user_id
      
      if (userId) {
        const planType = this.getPlanTypeFromPriceId(subscription.items.data[0].price.id)
        if (planType && ['pro', 'enterprise', 'unlimited'].includes(planType)) {
          await supabase.rpc('initialize_user_credits', {
            p_user_id: userId,
            p_plan_type: planType
          })
        }
      }
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.error('Payment failed for invoice:', { invoiceId: invoice.id })
    
    const subscriptionId = this.getSubscriptionIdFromInvoiceLines(invoice)
    
    if (subscriptionId) {
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', subscriptionId)
    }
  }

  private getSubscriptionIdFromInvoiceLines(invoice: Stripe.Invoice): string | null {
    if (!invoice.lines?.data) return null
    
    for (const line of invoice.lines.data) {
      if (line.parent && (line.parent as any).type === 'subscription_item_details') {
        const subscriptionItemDetails = (line.parent as any).subscription_item_details
        if (subscriptionItemDetails?.subscription_item) {
          return subscriptionItemDetails.subscription_item as string
        }
      }
    }
    
    return null
  }

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
      plan_type: planType,
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
      .update({ subscription: planType })
      .eq('id', subscriptionUserId)

    await supabase.rpc('initialize_user_credits', {
      p_user_id: subscriptionUserId,
      p_plan_type: planType
    })

    logger.info('Subscription synced to database:', { 
      subscriptionId: subscription.id, 
      planType,
      userId: subscriptionUserId 
    })
  }

  private getPlanTypeFromPriceId(priceId: string): 'pro' | 'enterprise' | 'unlimited' | null {
    for (const [plan, prices] of Object.entries(PRICE_IDS)) {
      if (prices.monthly === priceId || prices.yearly === priceId) {
        return plan as 'pro' | 'enterprise' | 'unlimited'
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
        'ai_generation': 'pro',
        'html_export': 'pro', 
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

      const planHierarchy = ['free', 'pro', 'enterprise', 'unlimited']
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
        requiredPlan: 'pro',
        message: 'Erro ao verificar plano'
      }
    }
  }
}

export default new StripeService()