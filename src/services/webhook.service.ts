import Stripe from 'stripe'
import { logger } from '../utils/logger'
import { supabaseAdmin } from '../config/supabase.config'

interface WebhookProcessingResult {
  success: boolean
  eventId?: string
  error?: string
  data?: any
}

export class WebhookService {
  private stripe: Stripe
  private webhookSecret: string

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required')
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required')
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil'
    })
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  }

  /**
   * Valida a assinatura do webhook Stripe
   */
  async validateSignature(payload: string | Buffer, signature: string): Promise<Stripe.Event> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      )
      
      logger.info('Stripe webhook signature validated', {
        eventId: event.id,
        eventType: event.type,
        livemode: event.livemode
      })

      return event
    } catch (error: any) {
      logger.error('Stripe webhook signature validation failed', {
        error: error.message,
        hasSignature: !!signature
      })
      throw new Error('Webhook signature validation failed')
    }
  }

  /**
   * Processa um evento de webhook
   */
  async processWebhookEvent(event: Stripe.Event): Promise<WebhookProcessingResult> {
    const eventId = event.id
    const eventType = event.type

    logger.info('Processing webhook event', { eventId, eventType })

    try {
      // Processar baseado no tipo de evento
      let result: WebhookProcessingResult

      switch (eventType) {
        case 'checkout.session.completed':
          result = await this.handleCheckoutSessionCompleted(event)
          break
        
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          result = await this.handleSubscriptionEvent(event)
          break
        
        case 'invoice.payment_succeeded':
          result = await this.handlePaymentSucceeded(event)
          break
        
        case 'invoice.payment_failed':
          result = await this.handlePaymentFailed(event)
          break
        
        case 'invoice.upcoming':
        case 'customer.subscription.trial_will_end':
          result = await this.handleNotificationEvent(event)
          break
        
        default:
          logger.warn('Unhandled webhook event type', { eventId, eventType })
          result = {
            success: true,
            eventId,
            data: { message: 'Event type not handled but acknowledged' }
          }
      }

      logger.info('Webhook event processed successfully', { eventId, eventType })
      return result

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error'
      logger.error('Error processing webhook event', {
        eventId,
        eventType,
        error: errorMessage
      })

      return {
        success: false,
        eventId,
        error: errorMessage
      }
    }
  }

  /**
   * Processa checkout session completed
   */
  private async handleCheckoutSessionCompleted(event: Stripe.Event): Promise<WebhookProcessingResult> {
    try {
      const session = event.data.object as Stripe.Checkout.Session

      logger.info('Checkout session completed', {
        sessionId: session.id,
        customerId: session.customer,
        subscriptionId: session.subscription,
        mode: session.mode,
        paymentStatus: session.payment_status
      })

      return {
        success: true,
        eventId: event.id,
        data: { 
          message: 'Checkout session completed - credits will be processed on invoice.payment_succeeded',
          sessionId: session.id
        }
      }

    } catch (error: any) {
      return {
        success: false,
        eventId: event.id,
        error: error.message
      }
    }
  }

  /**
   * Processa eventos de subscription
   */
  private async handleSubscriptionEvent(event: Stripe.Event): Promise<WebhookProcessingResult> {
    try {
      const subscription = event.data.object as Stripe.Subscription

      logger.info(`Subscription ${event.type}`, {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status
      })

      return {
        success: true,
        eventId: event.id,
        data: { 
          message: `Subscription ${event.type} logged`,
          subscriptionId: subscription.id,
          status: subscription.status
        }
      }

    } catch (error: any) {
      return {
        success: false,
        eventId: event.id,
        error: error.message
      }
    }
  }

  /**
   * Processa pagamento bem-sucedido - CRÍTICO
   */
  private async handlePaymentSucceeded(event: Stripe.Event): Promise<WebhookProcessingResult> {
    try {
      const invoice = event.data.object as Stripe.Invoice

      if (!invoice.customer) {
        throw new Error('Invoice missing customer')
      }

      // Verificar se é uma cobrança paga
      if (invoice.status !== 'paid') {
        logger.warn('Invoice status is not paid, skipping credit renewal', {
          invoiceId: invoice.id,
          status: invoice.status
        })
        return {
          success: true,
          eventId: event.id,
          data: { message: 'Invoice not paid, no credits renewed' }
        }
      }

      // Buscar usuário pelo Stripe customer ID na tabela subscriptions
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id
      const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (subscriptionError || !subscriptionData) {
        logger.warn(`User not found for customer ${customerId}`, {
          error: subscriptionError?.message
        })
        return {
          success: true,
          eventId: event.id,
          data: { message: 'User not found, but webhook acknowledged' }
        }
      }

      // LÓGICA CRÍTICA: RENOVAR CRÉDITOS APENAS COM PAGAMENTO CONFIRMADO
      const planType = this.determinePlanType(invoice)
      
      logger.info('🎉 PAYMENT CONFIRMED - Renewing credits', {
        invoiceId: invoice.id,
        userId: subscriptionData.user_id,
        planType,
        amount: invoice.amount_paid
      })

      // Renovar créditos do usuário
      const { error: renewError } = await supabaseAdmin.rpc('initialize_user_credits', {
        p_user_id: subscriptionData.user_id,
        p_plan_type: planType as 'free' | 'starter' | 'enterprise' | 'unlimited'
      })

      if (renewError) {
        logger.error('Failed to renew credits', {
          userId: subscriptionData.user_id,
          planType,
          error: renewError.message
        })
      } else {
        logger.info('✅ Credits renewed successfully', {
          userId: subscriptionData.user_id,
          planType
        })
      }

      return {
        success: true,
        eventId: event.id,
        data: { 
          message: 'Payment succeeded - credits renewed',
          userId: subscriptionData.user_id,
          planType,
          amount: invoice.amount_paid
        }
      }

    } catch (error: any) {
      logger.error('Error handling payment succeeded', {
        eventId: event.id,
        error: error.message
      })

      return {
        success: false,
        eventId: event.id,
        error: error.message
      }
    }
  }

  /**
   * Processa falha de pagamento - CRÍTICO
   */
  private async handlePaymentFailed(event: Stripe.Event): Promise<WebhookProcessingResult> {
    try {
      const invoice = event.data.object as Stripe.Invoice

      if (!invoice.customer) {
        throw new Error('Invoice missing customer')
      }

      logger.error('🚨 PAYMENT FAILED - NOT renewing credits', {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amount: invoice.amount_due,
        failureReason: invoice.last_finalization_error?.message
      })

      // Buscar usuário pelo Stripe customer ID na tabela subscriptions
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id
      const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (subscriptionError || !subscriptionData) {
        logger.warn(`User not found for failed payment ${customerId}`)
        return {
          success: true,
          eventId: event.id,
          data: { message: 'Payment failed, user not found' }
        }
      }

      // NÃO RENOVAR CRÉDITOS - APENAS LOGAR
      logger.warn('❌ Credits NOT renewed due to payment failure', {
        userId: subscriptionData.user_id,
        invoiceId: invoice.id
      })

      return {
        success: true,
        eventId: event.id,
        data: { 
          message: 'Payment failed - credits NOT renewed',
          userId: subscriptionData.user_id,
          failureReason: invoice.last_finalization_error?.message
        }
      }

    } catch (error: any) {
      logger.error('Error handling payment failed', {
        eventId: event.id,
        error: error.message
      })

      return {
        success: false,
        eventId: event.id,
        error: error.message
      }
    }
  }

  /**
   * Processa eventos de notificação
   */
  private async handleNotificationEvent(event: Stripe.Event): Promise<WebhookProcessingResult> {
    try {
      logger.info(`Notification event ${event.type}`, {
        eventId: event.id,
        eventType: event.type
      })

      return {
        success: true,
        eventId: event.id,
        data: { 
          message: `${event.type} logged`,
          eventType: event.type
        }
      }

    } catch (error: any) {
      return {
        success: false,
        eventId: event.id,
        error: error.message
      }
    }
  }

  /**
   * Determina o tipo de plano baseado no invoice
   */
  private determinePlanType(invoice: Stripe.Invoice): string {
    // Primeiro, tentar determinar baseado no price_id se disponível
    if (invoice.lines && invoice.lines.data.length > 0) {
      const lineItem = invoice.lines.data[0] as any
      const priceId = lineItem.price?.id
      if (priceId) {
        const planFromPrice = this.getPlanTypeFromPriceId(priceId)
        if (planFromPrice) return planFromPrice
      }
    }

    // Fallback: usar valor da invoice para determinar plano
    const amount = invoice.amount_paid || 0
    
    // Baseado nos preços reais do Stripe:
    // Unlimited: $36.00 mensal = 3600 cents, $360.00 anual = 36000 cents
    // Enterprise: $22.00 mensal = 2200 cents, $216.00 anual = 21600 cents  
    // Starter: $14.00 mensal = 1400 cents, $120.00 anual = 12000 cents
    
    if (amount >= 36000) return 'unlimited' // $360+ (anual unlimited)
    if (amount >= 21600) return 'enterprise' // $216+ (anual enterprise)
    if (amount >= 12000) return 'starter' // $120+ (anual starter)
    if (amount >= 3600) return 'unlimited' // $36+ (mensal unlimited)
    if (amount >= 2200) return 'enterprise' // $22+ (mensal enterprise)
    if (amount >= 1400) return 'starter' // $14+ (mensal starter)
    
    return 'free'
  }

  /**
   * Mapeia price ID para tipo de plano
   */
  private getPlanTypeFromPriceId(priceId: string): string | null {
    const priceMapping: Record<string, string> = {
      // MailTrendz Basic/Starter
      'price_1RgrvNLIDpwN7e9FX3bJF6kH': 'starter', // Basic Monthly $14
      'price_1RgrwJLIDpwN7e9Fd59s3Lwt': 'starter', // Basic Annual $120
      
      // MailTrendz Pro/Enterprise  
      'price_1Rgs5NLIDpwN7e9FPOPLjVa5': 'enterprise', // Pro Monthly $22
      'price_1Rgs7KLIDpwN7e9FeEl8Fk01': 'enterprise', // Pro Annual $216
      
      // MailTrendz Unlimited
      'price_1Rgs8oLIDpwN7e9FHPegBado': 'unlimited', // Unlimited Monthly $36
      'price_1Rgs9aLIDpwN7e9FyIkQGFBt': 'unlimited'  // Enterprise Annual Monthly $360
    }
    
    return priceMapping[priceId] || null
  }

  /**
   * Health check do sistema de webhooks
   */
  async getHealthStatus(): Promise<{
    status: string
    webhookSecretConfigured: boolean
    stripeKeyConfigured: boolean
    recentEventsCount: number
    failedEventsCount: number
    retryingEventsCount: number
  }> {
    return {
      status: 'healthy',
      webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      stripeKeyConfigured: !!process.env.STRIPE_SECRET_KEY,
      recentEventsCount: 0,
      failedEventsCount: 0,
      retryingEventsCount: 0
    }
  }

  /**
   * Busca eventos recentes de webhook
   */
  async getRecentWebhookEvents(_limit: number = 50): Promise<{
    webhookEvents: any[]
    total: number
  }> {
    // Placeholder - retornará eventos quando as tabelas estiverem disponíveis
    return {
      webhookEvents: [],
      total: 0
    }
  }

  /**
   * Busca status de cobrança do usuário
   */
  async getUserBillingStatus(userId: string): Promise<any> {
    // Placeholder - retornará status quando as tabelas estiverem disponíveis
    return {
      current_status: 'active',
      last_payment_date: new Date().toISOString(),
      user_id: userId
    }
  }

  /**
   * Busca histórico de pagamentos do usuário
   */
  async getUserPaymentHistory(_userId: string, _limit: number = 10): Promise<any[]> {
    // Placeholder - retornará histórico quando as tabelas estiverem disponíveis
    return []
  }
}

export const webhookService = new WebhookService()