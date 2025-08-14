import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import { webhookService } from '../services/webhook.service'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'

class WebhookController {
  /**
   * Endpoint principal para webhooks do Stripe
   * Endpoint: POST /api/v1/webhooks/stripe
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const startTime = Date.now()
    const requestId = req.headers['x-request-id'] || 'unknown'

    try {
      const signature = req.headers['stripe-signature'] as string
      
      if (!signature) {
        logger.warn('Webhook request missing stripe-signature header', {
          requestId,
          headers: Object.keys(req.headers)
        })
        
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Missing stripe-signature header'
        })
        return
      }

      // Validar assinatura e obter evento
      const event = await webhookService.validateSignature(req.body, signature)

      logger.info('Webhook event received', {
        requestId,
        eventId: event.id,
        eventType: event.type,
        apiVersion: event.api_version,
        livemode: event.livemode
      })

      // Processar evento com idempotência e retry
      await webhookService.processWebhookEvent(event)

      const processingTime = Date.now() - startTime

      logger.info('Webhook processed successfully', {
        requestId,
        eventId: event.id,
        eventType: event.type,
        processingTimeMs: processingTime
      })

      // Resposta de sucesso para o Stripe
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Webhook processed successfully',
        eventId: event.id,
        processingTimeMs: processingTime
      })

    } catch (error: any) {
      const processingTime = Date.now() - startTime

      logger.error('Webhook processing failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime
      })

      // Para webhooks, é importante retornar o status correto
      // 200: Processado com sucesso
      // 400: Erro de validação (não tentar novamente)
      // 500: Erro interno (Stripe tentará novamente)
      
      const isValidationError = error.message.includes('signature validation') || 
                               error.message.includes('invalid event')
      
      const statusCode = isValidationError ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.INTERNAL_SERVER_ERROR

      res.status(statusCode).json({
        success: false,
        message: 'Webhook processing failed',
        error: error.message,
        requestId,
        processingTimeMs: processingTime
      })
    }
  }

  /**
   * Endpoint para consultar status de cobrança do usuário
   * Endpoint: GET /api/v1/webhooks/billing-status
   */
  async getUserBillingStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        })
        return
      }

      const billingStatus = await webhookService.getUserBillingStatus(req.user.id)

      if (!billingStatus) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Billing status not found'
        })
        return
      }

      res.json({
        success: true,
        data: {
          billingStatus: {
            status: billingStatus.current_status,
            lastPaymentDate: billingStatus.last_payment_date,
            lastPaymentAmount: billingStatus.last_payment_amount_cents,
            nextPaymentDate: billingStatus.next_payment_date,
            failedPaymentCount: billingStatus.failed_payment_count,
            lastFailedPaymentDate: billingStatus.last_failed_payment_date,
            lastFailedPaymentReason: billingStatus.last_failed_payment_reason,
            gracePeriodEnd: billingStatus.grace_period_end,
            isOverdue: billingStatus.current_status === 'past_due' && 
                      billingStatus.next_payment_date && 
                      new Date(billingStatus.next_payment_date) < new Date(),
            requiresAttention: billingStatus.failed_payment_count >= 3
          }
        }
      })

    } catch (error: any) {
      logger.error('Error fetching billing status', {
        userId: req.user?.id,
        error: error.message
      })

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching billing status',
        error: error.message
      })
    }
  }

  /**
   * Endpoint para consultar histórico de pagamentos do usuário
   * Endpoint: GET /api/v1/webhooks/payment-history
   */
  async getUserPaymentHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        })
        return
      }

      const limit = parseInt(req.query.limit as string) || 10
      const paymentHistory = await webhookService.getUserPaymentHistory(req.user.id, limit)

      res.json({
        success: true,
        data: {
          paymentHistory: paymentHistory.map((payment: any) => ({
            id: payment.id,
            amount: payment.amount_cents,
            currency: payment.currency,
            status: payment.status,
            paymentMethod: payment.payment_method,
            planType: payment.plan_type,
            billingPeriod: payment.billing_period,
            failureReason: payment.failure_reason,
            processedAt: payment.processed_at,
            createdAt: payment.created_at
          }))
        }
      })

    } catch (error: any) {
      logger.error('Error fetching payment history', {
        userId: req.user?.id,
        error: error.message
      })

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching payment history',
        error: error.message
      })
    }
  }

  /**
   * Endpoint administrativo para consultar eventos de webhook recentes
   * Endpoint: GET /api/v1/webhooks/recent-events (Admin only)
   */
  async getRecentWebhookEvents(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Verificar se é admin (implementar verificação de role se necessário)
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Authentication required'
        })
        return
      }

      const limit = parseInt(req.query.limit as string) || 50
      const eventsData = await webhookService.getRecentWebhookEvents(limit)

      res.json({
        success: true,
        data: {
          webhookEvents: eventsData.webhookEvents.map((event: any) => ({
            id: event.id,
            stripeEventId: event.stripe_event_id,
            eventType: event.event_type,
            status: event.status,
            retryCount: event.retry_count,
            createdAt: event.created_at,
            processedAt: event.processed_at,
            errorMessage: event.error_message,
            ageSeconds: event.age_seconds
          }))
        }
      })

    } catch (error: any) {
      logger.error('Error fetching webhook events', {
        error: error.message
      })

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Error fetching webhook events',
        error: error.message
      })
    }
  }

  /**
   * Endpoint para health check específico de webhooks
   * Endpoint: GET /api/v1/webhooks/health
   */
  async webhookHealthCheck(_req: Request, res: Response): Promise<void> {
    try {
      // Verificar configuração do webhook
      const webhookSecretConfigured = !!process.env.STRIPE_WEBHOOK_SECRET
      const stripeKeyConfigured = !!process.env.STRIPE_SECRET_KEY

      // Verificar eventos recentes (últimas 24h)
      const recentEventsData = await webhookService.getRecentWebhookEvents(10)
      const recentEvents = recentEventsData.webhookEvents
      const failedEvents = recentEvents.filter((e: any) => e.status === 'failed')
      const retryingEvents = recentEvents.filter((e: any) => e.status === 'retrying')

      const healthStatus = {
        webhookSecretConfigured,
        stripeKeyConfigured,
        recentEventsCount: recentEvents.length,
        failedEventsCount: failedEvents.length,
        retryingEventsCount: retryingEvents.length,
        status: webhookSecretConfigured && stripeKeyConfigured && failedEvents.length < 5 ? 'healthy' : 'warning',
        timestamp: new Date().toISOString()
      }

      logger.info('Webhook health check', healthStatus)

      res.json({
        success: true,
        data: healthStatus
      })

    } catch (error: any) {
      logger.error('Webhook health check failed', {
        error: error.message
      })

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Webhook health check failed',
        error: error.message
      })
    }
  }
}

export default new WebhookController()