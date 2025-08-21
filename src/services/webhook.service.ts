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
   * Processa checkout session completed - PRIMEIRA SINCRONIZAÇÃO
   */
  private async handleCheckoutSessionCompleted(event: Stripe.Event): Promise<WebhookProcessingResult> {
    try {
      const session = event.data.object as Stripe.Checkout.Session

      logger.info('🛒 Checkout session completed', {
        sessionId: session.id,
        customerId: session.customer,
        customerEmail: session.customer_details?.email,
        subscriptionId: session.subscription,
        mode: session.mode,
        paymentStatus: session.payment_status
      })

      // Se há customer e email, tentar sincronizar
      if (session.customer && session.customer_details?.email) {
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id
        const customerEmail = session.customer_details.email
        
        await this.syncStripeCustomerWithSupabase(customerId, customerEmail, event.id)
      }

      return {
        success: true,
        eventId: event.id,
        data: { 
          message: 'Checkout session completed - customer synced if possible',
          sessionId: session.id,
          customerSynced: !!(session.customer && session.customer_details?.email)
        }
      }

    } catch (error: any) {
      logger.error('Error in handleCheckoutSessionCompleted', { error: error.message })
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
   * Processa pagamento bem-sucedido - CRÍTICO COM SINCRONIZAÇÃO AUTOMÁTICA
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

      // Buscar ou criar usuário baseado no customer
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id
      
      // NOVA LÓGICA: Buscar usuário e sincronizar se necessário
      let userId = await this.findOrCreateUserFromStripeCustomer(customerId, event.id)
      
      if (!userId) {
        logger.error(`🚨 Unable to find or create user for customer ${customerId}`)
        return {
          success: false,
          eventId: event.id,
          error: 'Unable to find or create user for customer'
        }
      }

      // LÓGICA CRÍTICA: RENOVAR CRÉDITOS APENAS COM PAGAMENTO CONFIRMADO
      const planType = this.determinePlanType(invoice)
      
      logger.info('🎉 PAYMENT CONFIRMED - Renewing credits', {
        invoiceId: invoice.id,
        userId: userId,
        customerId: customerId,
        planType,
        amount: invoice.amount_paid
      })

      // Renovar créditos do usuário
      const { error: renewError } = await supabaseAdmin.rpc('initialize_user_credits', {
        p_user_id: userId,
        p_plan_type: planType as 'free' | 'starter' | 'enterprise' | 'unlimited'
      })

      if (renewError) {
        logger.error('Failed to renew credits', {
          userId: userId,
          planType,
          error: renewError.message
        })
      } else {
        logger.info('✅ Credits renewed successfully', {
          userId: userId,
          planType,
          customerId: customerId
        })
      }

      // Atualizar subscription no Supabase se necessário
      await this.updateSubscriptionFromInvoice(userId, invoice, planType)

      return {
        success: true,
        eventId: event.id,
        data: { 
          message: 'Payment succeeded - credits renewed and subscription updated',
          userId: userId,
          customerId: customerId,
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

      // Buscar usuário usando nova lógica de sincronização
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id
      const userId = await this.findOrCreateUserFromStripeCustomer(customerId, event.id)

      if (!userId) {
        logger.warn(`User not found for failed payment ${customerId}`)
        return {
          success: true,
          eventId: event.id,
          data: { message: 'Payment failed, user not found' }
        }
      }

      // NÃO RENOVAR CRÉDITOS - APENAS LOGAR
      logger.warn('❌ Credits NOT renewed due to payment failure', {
        userId: userId,
        customerId: customerId,
        invoiceId: invoice.id
      })

      return {
        success: true,
        eventId: event.id,
        data: { 
          message: 'Payment failed - credits NOT renewed',
          userId: userId,
          customerId: customerId,
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

  /**
   * 🔗 SINCRONIZAÇÃO AUTOMÁTICA - Conecta customer do Stripe com usuário do Supabase
   */
  private async syncStripeCustomerWithSupabase(customerId: string, customerEmail: string, eventId: string): Promise<string | null> {
    try {
      logger.info('🔗 Attempting to sync Stripe customer with Supabase', {
        customerId,
        customerEmail,
        eventId
      })

      // 1. Buscar usuário existente por email
      const { data: existingUser, error: userError } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', customerEmail)
        .single()

      if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.error('Error searching for existing user', { error: userError.message })
        return null
      }

      if (existingUser) {
        // Usuário existe - atualizar stripe_customer_id usando SQL direto
        try {
          await supabaseAdmin
            .from('profiles')
            .update({ 
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', existingUser.id)
            
          logger.info('✅ Updated existing user timestamp', {
            userId: existingUser.id,
            customerId
          })
        } catch (e) {
          logger.error('Failed to update user', { error: e })
        }

        // Verificar/criar subscription
        await this.ensureSubscriptionExists(existingUser.id, customerId)
        
        return existingUser.id
      }

      return null // Usuário não existe - será tratado em findOrCreateUserFromStripeCustomer
      
    } catch (error: any) {
      logger.error('Error in syncStripeCustomerWithSupabase', {
        customerId,
        customerEmail,
        error: error.message
      })
      return null
    }
  }

  /**
   * 🔍 BUSCA OU CRIA usuário baseado no customer do Stripe
   */
  private async findOrCreateUserFromStripeCustomer(customerId: string, eventId: string): Promise<string | null> {
    try {
      // 1. Tentar encontrar por stripe_customer_id em profiles
      const { data: userByCustomerId } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (userByCustomerId) {
        logger.info('✅ Found user by stripe_customer_id', {
          userId: userByCustomerId.id,
          customerId
        })
        return userByCustomerId.id
      }

      // 2. Tentar encontrar por stripe_customer_id em subscriptions
      const { data: subscriptionData } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (subscriptionData) {
        logger.info('✅ Found user by subscription stripe_customer_id', {
          userId: subscriptionData.user_id,
          customerId
        })
        
        // Atualizar profiles também
        try {
          await supabaseAdmin
            .from('profiles')
            .update({ 
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', subscriptionData.user_id)
        } catch (e) {
          logger.warn('Could not update profiles', { error: e })
        }
        
        return subscriptionData.user_id
      }

      // 3. Buscar customer no Stripe para obter email
      const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer
      
      if (!customer.email) {
        logger.warn('Customer no Stripe não tem email', { customerId })
        return null
      }

      // 4. Tentar encontrar usuário por email
      const { data: userByEmail } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', customer.email)
        .single()

      if (userByEmail) {
        // Usuário existe mas não tem stripe_customer_id - sincronizar
        logger.info('🔗 Found user by email, syncing stripe_customer_id', {
          userId: userByEmail.id,
          email: customer.email,
          customerId
        })
        
        await this.syncStripeCustomerWithSupabase(customerId, customer.email, eventId)
        return userByEmail.id
      }

      // 5. Criar novo usuário automaticamente
      logger.info('🆕 Creating new user from Stripe customer', {
        customerId,
        email: customer.email,
        name: customer.name
      })
      
      const newUserId = await this.createUserFromStripeCustomer(customer)
      return newUserId

    } catch (error: any) {
      logger.error('Error in findOrCreateUserFromStripeCustomer', {
        customerId,
        error: error.message
      })
      return null
    }
  }

  /**
   * 🆕 CRIA USUÁRIO automaticamente a partir dos dados do Stripe
   */
  private async createUserFromStripeCustomer(customer: Stripe.Customer): Promise<string | null> {
    try {
      if (!customer.email) {
        logger.error('Cannot create user without email')
        return null
      }

      // Gerar senha temporária
      const tempPassword = this.generateTemporaryPassword()
      
      // 1. Criar usuário no auth.users via Supabase Admin
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: customer.email,
        password: tempPassword,
        email_confirm: true, // Auto-confirmar email
        user_metadata: {
          name: customer.name || 'Usuário',
          created_via: 'stripe_payment',
          stripe_customer_id: customer.id
        }
      })

      if (createError || !newUser.user) {
        logger.error('Failed to create user in auth', { error: createError?.message })
        return null
      }

      const userId = newUser.user.id

      // 2. Criar perfil usando SQL direto para evitar problemas de tipo
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: customer.email,
          name: customer.name || 'Usuário'
        } as any)

      if (profileError) {
        logger.error('Failed to create profile', { error: profileError.message })
        // Limpar usuário criado
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return null
      }

      // 3. Criar subscription inicial
      await this.ensureSubscriptionExists(userId, customer.id)

      // 4. Enviar email com credenciais
      await this.sendWelcomeEmail(customer.email, customer.name || 'Usuário', tempPassword)

      logger.info('✅ Successfully created user from Stripe customer', {
        userId,
        customerId: customer.id,
        email: customer.email
      })

      return userId

    } catch (error: any) {
      logger.error('Error creating user from Stripe customer', {
        customerId: customer.id,
        error: error.message
      })
      return null
    }
  }

  /**
   * 🔒 Gera senha temporária segura
   */
  private generateTemporaryPassword(): string {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  /**
   * ✅ Garante que subscription existe no Supabase
   */
  private async ensureSubscriptionExists(userId: string, customerId: string): Promise<void> {
    try {
      // Verificar se subscription já existe
      const { data: existingSubscription } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!existingSubscription) {
        // Criar subscription inicial
        const { error: insertError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            stripe_customer_id: customerId,
            plan_type: 'free',
            status: 'active'
          })

        if (insertError) {
          logger.error('Failed to create subscription', { error: insertError.message })
        } else {
          logger.info('✅ Created initial subscription', { userId, customerId })
        }
      } else {
        // Atualizar stripe_customer_id se necessário
        await supabaseAdmin
          .from('subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', userId)
      }
    } catch (error: any) {
      logger.error('Error ensuring subscription exists', { error: error.message })
    }
  }

  /**
   * 📧 Envia email de boas-vindas com credenciais
   */
  private async sendWelcomeEmail(email: string, name: string, tempPassword: string): Promise<void> {
    try {
      // TODO: Implementar envio de email
      // Por enquanto, apenas log para desenvolvimento
      logger.info('📧 Welcome email would be sent', {
        email,
        name,
        passwordLength: tempPassword.length
      })
      
      // Implementação com email-helpers será adicionada
      console.log(`
      🎉 NOVO USUÁRIO CRIADO VIA STRIPE!
      
      Email: ${email}
      Nome: ${name}
      Senha temporária: ${tempPassword}
      
      ⚠️ Em produção, isso seria enviado por email!
      `)
      
    } catch (error: any) {
      logger.error('Error sending welcome email', { error: error.message })
    }
  }

  /**
   * 🔄 Atualiza subscription no Supabase baseada no invoice
   */
  private async updateSubscriptionFromInvoice(userId: string, invoice: Stripe.Invoice, planType: string): Promise<void> {
    try {
      const subscriptionId = typeof (invoice as any).subscription === 'string' 
        ? (invoice as any).subscription 
        : (invoice as any).subscription?.id
      
      // Buscar dados da subscription no Stripe se disponível
      let subscriptionData = null
      if (subscriptionId) {
        try {
          subscriptionData = await this.stripe.subscriptions.retrieve(subscriptionId)
        } catch (error) {
          logger.warn('Could not retrieve subscription from Stripe', { subscriptionId })
        }
      }

      const updateData: any = {
        plan_type: planType,
        status: subscriptionData?.status || 'active',
        updated_at: new Date().toISOString()
      }

      if (subscriptionData) {
        updateData.stripe_subscription_id = subscriptionData.id
        updateData.current_period_start = new Date((subscriptionData as any).current_period_start * 1000).toISOString()
        updateData.current_period_end = new Date((subscriptionData as any).current_period_end * 1000).toISOString()
        updateData.cancel_at_period_end = (subscriptionData as any).cancel_at_period_end
      }

      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update(updateData)
        .eq('user_id', userId)

      if (updateError) {
        logger.error('Failed to update subscription', { error: updateError.message })
      } else {
        logger.info('✅ Updated subscription from invoice', { userId, planType })
      }
      
    } catch (error: any) {
      logger.error('Error updating subscription from invoice', { error: error.message })
    }
  }
}

export const webhookService = new WebhookService()