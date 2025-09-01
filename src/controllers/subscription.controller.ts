import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import StripeService from '../services/stripe.service'
import subscriptionService from '../services/subscription.service'
import { supabase } from '../config/supabase.config'
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants'
import { logger } from '../utils/logger'

class SubscriptionController {
  // Obter planos disponíveis
  getPlans = async (_req: Request, res: Response): Promise<void> => {
    try {
      const plansInfo = await StripeService.getPlansInfo()
      const priceIds = await StripeService.getPriceIds()
      
      // Formatar planos para resposta
      const plans = [
        {
          id: 'free',
          name: 'Free',
          description: 'Perfeito para começar',
          price: 0,
          ai_credits: plansInfo.free.credits,
          max_projects: 3,
          has_multi_user: false,
          has_html_export: false,
          has_email_preview: false,
          stripe_price_id: null,
          popular: false,
          features: plansInfo.free.features
        },
        {
          id: 'starter',
          name: 'Starter',
          description: 'Ideal para profissionais',
          // ✅ CORRIGIDO: mudei de plansInfo.pro para plansInfo.starter
          price: plansInfo.starter.price_monthly / 100,
          ai_credits: plansInfo.starter.credits,
          max_projects: 50,
          has_multi_user: false,
          has_html_export: true,
          has_email_preview: true,
          // ✅ CORRIGIDO: mudei de priceIds.pro para priceIds.starter
          stripe_price_id: priceIds.starter.monthly,
          popular: true,
          // ✅ CORRIGIDO: mudei de plansInfo.pro para plansInfo.starter
          features: plansInfo.starter.features
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'Para equipes e empresas',
          price: plansInfo.enterprise.price_monthly / 100,
          ai_credits: plansInfo.enterprise.credits,
          max_projects: 100,
          has_multi_user: true,
          has_html_export: true,
          has_email_preview: true,
          stripe_price_id: priceIds.enterprise.monthly,
          popular: false,
          features: plansInfo.enterprise.features
        },
        {
          id: 'unlimited',
          name: 'Unlimited',
          description: 'Recursos ilimitados',
          price: plansInfo.unlimited.promotional_price / 100,
          original_price: plansInfo.unlimited.original_price / 100,
          ai_credits: -1,
          max_projects: -1,
          has_multi_user: true,
          has_html_export: true,
          has_email_preview: true,
          stripe_price_id: priceIds.unlimited.monthly,
          popular: false,
          features: plansInfo.unlimited.features
        }
      ]
      
      res.json({
        success: true,
        data: { plans }
      })
    } catch (error: any) {
      logger.error('Error fetching plans:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar planos',
        error: error.message
      })
    }
  }

  // Obter assinatura atual do usuário
  getCurrentSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      // Buscar informações de assinatura e uso
      const usageInfo = await subscriptionService.getUsageInfo(req.user.id)
      
      if (!usageInfo) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Informações de assinatura não encontradas'
        })
        return
      }
      
      res.json({
        success: true,
        data: {
          subscription: {
            plan_type: usageInfo.planType,
            status: usageInfo.status,
            current_period_end: usageInfo.billing.currentPeriodEnd?.toISOString(),
            cancel_at_period_end: usageInfo.billing.cancelAtPeriodEnd || false,
            credits: {
              available: usageInfo.usage.available,
              used: usageInfo.usage.used,
              total: usageInfo.usage.total,
              resetAt: usageInfo.billing.currentPeriodEnd?.toISOString(),
              unlimited: usageInfo.usage.unlimited
            },
            features: {
              has_multi_user: usageInfo.features.hasMultiUser,
              has_html_export: usageInfo.features.hasHtmlExport,
              has_email_preview: usageInfo.features.hasEmailPreview,
              max_projects: usageInfo.features.maxProjects
            }
          }
        }
      })
    } catch (error: any) {
      logger.error('Error fetching subscription:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar assinatura',
        error: error.message
      })
    }
  }

  // Obter créditos atuais
  getCurrentCredits = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      const usageInfo = await subscriptionService.getUsageInfo(req.user.id)
      
      if (!usageInfo) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Informações de créditos não encontradas'
        })
        return
      }
      
      res.json({
        success: true,
        data: { 
          credits: {
            available: usageInfo.usage.available,
            used: usageInfo.usage.used,
            total: usageInfo.usage.total,
            resetAt: usageInfo.billing.currentPeriodEnd,
            unlimited: usageInfo.usage.unlimited
          }
        }
      })
    } catch (error: any) {
      logger.error('Error fetching credits:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar créditos',
        error: error.message
      })
    }
  }

  // Obter uso mensal detalhado
  getMonthlyUsage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      const usageInfo = await subscriptionService.getUsageInfo(req.user.id)
      
      if (!usageInfo) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Informações de uso não encontradas'
        })
        return
      }
      
      res.json({
        success: true,
        data: { 
          monthlyUsage: {
            userId: req.user.id,
            periodStart: usageInfo.billing.currentPeriodStart,
            periodEnd: usageInfo.billing.currentPeriodEnd,
            requestsUsed: usageInfo.usage.used,
            requestsAvailable: usageInfo.usage.available,
            requestsTotal: usageInfo.usage.total,
            isUnlimited: usageInfo.usage.unlimited,
            daysUntilReset: usageInfo.billing.daysUntilReset,
            percentageUsed: usageInfo.usage.percentage
          }
        }
      })
    } catch (error: any) {
      logger.error('Error fetching monthly usage:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar uso mensal',
        error: error.message
      })
    }
  }

  // Obter histórico de uso
  getUsageHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      // Parâmetro removido da linha original para evitar warning
      // const months = parseInt(req.query.months as string) || 6
      
      // Por enquanto, retornar histórico vazio (pode ser implementado depois)
      const history: any[] = []
      
      res.json({
        success: true,
        data: { 
          usageHistory: history
        }
      })
    } catch (error: any) {
      logger.error('Error fetching usage history:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar histórico de uso',
        error: error.message
      })
    }
  }

  // Verificar limite antes de consumir
  checkLimit = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      const hasCredits = await subscriptionService.hasCredits(req.user.id)
      const usageInfo = await subscriptionService.getUsageInfo(req.user.id)
      
      res.json({
        success: true,
        data: { 
          limitCheck: {
            can_consume: hasCredits,
            current_usage: usageInfo?.usage.used || 0,
            monthly_limit: usageInfo?.usage.total || 0,
            is_unlimited: usageInfo?.usage.unlimited || false,
            percentage_used: usageInfo?.usage.percentage || 0,
            days_until_reset: usageInfo?.billing.daysUntilReset || 0
          }
        }
      })
    } catch (error: any) {
      logger.error('Error checking limit:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao verificar limite',
        error: error.message
      })
    }
  }

  // Consumir créditos
  consumeCredits = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      const { amount = 1 } = req.body

      // Usar novo sistema de créditos
      const result = await subscriptionService.consumeCredits(req.user.id, amount)
      
      if (!result.success) {
        const usageInfo = await subscriptionService.getUsageInfo(req.user.id)
        
        res.status(HTTP_STATUS.PAYMENT_REQUIRED).json({
          success: false,
          message: 'Limite mensal de requisições atingido',
          error: {
            code: ERROR_CODES.INSUFFICIENT_CREDITS,
            monthlyLimit: usageInfo?.usage.total || 0,
            used: usageInfo?.usage.used || 0,
            resetDate: usageInfo?.billing.currentPeriodEnd
          }
        })
        return
      }
      
      res.json({
        success: true,
        message: 'Requisição consumida com sucesso',
        data: {
          consumed: result.consumed || amount,
          remaining: result.remaining,
          total: result.totalUsed,
          unlimited: result.unlimited
        }
      })
    } catch (error: any) {
      logger.error('Error consuming credits:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao consumir requisição',
        error: error.message
      })
    }
  }

  // Sincronizar assinatura do usuário
  syncUserSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      // A sincronização agora é automática via triggers
      const state = await subscriptionService.getState(req.user.id)
      
      res.json({
        success: true,
        message: 'Assinatura já está sincronizada',
        data: {
          planType: state?.planType || 'free',
          status: state?.status || 'active'
        }
      })
    } catch (error: any) {
      logger.error('Error syncing subscription:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao sincronizar assinatura',
        error: error.message
      })
    }
  }

  // 🔧 FIX: Criar sessão de checkout com validações robustas
  createCheckoutSession = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      const { priceId } = req.body

      // 🔧 FIX: Validações melhoradas
      if (!priceId || typeof priceId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Price ID é obrigatório e deve ser uma string válida'
        })
        return
      }

      if (!priceId.startsWith('price_')) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Price ID deve ter formato Stripe válido (price_xxx)'
        })
        return
      }

      // 🔧 FIX: Validar variáveis de ambiente
      const frontendUrl = process.env.FRONTEND_URL
      if (!frontendUrl) {
        logger.error('❌ [CHECKOUT] FRONTEND_URL not configured')
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Configuração de ambiente incompleta'
        })
        return
      }

      const successUrl = `${frontendUrl}/dashboard?success=true`
      const cancelUrl = `${frontendUrl}/dashboard?canceled=true`
      
      logger.info('💳 [CHECKOUT] Creating session for user', { 
        userId: req.user.id, 
        priceId,
        frontendUrl: frontendUrl.substring(0, 30) + '...' 
      })

      const sessionUrl = await StripeService.createCheckoutSession(
        req.user.id,
        priceId,
        successUrl,
        cancelUrl
      )
      
      res.json({
        success: true,
        data: {
          url: sessionUrl
        }
      })
    } catch (error: any) {
      logger.error('Error creating checkout session:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao criar sessão de checkout',
        error: error.message
      })
    }
  }

  // Criar sessão do portal do cliente
  createPortalSession = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      const returnUrl = req.body.returnUrl || `${process.env.FRONTEND_URL}/settings`

      const portalUrl = await StripeService.createPortalSession(req.user.id, returnUrl)
      
      res.json({
        success: true,
        data: {
          url: portalUrl
        }
      })
    } catch (error: any) {
      logger.error('Error creating portal session:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao criar sessão do portal',
        error: error.message
      })
    }
  }

  // Verificar pagamento
  verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      const { sessionId } = req.query

      if (!sessionId || typeof sessionId !== 'string') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'ID da sessão é obrigatório'
        })
        return
      }

      const result = await StripeService.verifyPaymentStatus(req.user.id, sessionId)
      
      res.json({
        success: true,
        data: result
      })
    } catch (error: any) {
      logger.error('Error verifying payment:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao verificar pagamento',
        error: error.message
      })
    }
  }

  // Atualizar assinatura
  updateSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      const { planId, billingPeriod = 'monthly' } = req.body

      if (!planId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'ID do plano é obrigatório'
        })
        return
      }

      // Buscar subscription_id atual do usuário
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', req.user.id)
        .single()

      if (!subscription?.stripe_subscription_id) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Assinatura não encontrada'
        })
        return
      }

      // Obter o priceId correto
      const priceIds = await StripeService.getPriceIds()
      const priceId = priceIds[planId as keyof typeof priceIds]?.[billingPeriod as 'monthly' | 'yearly']

      if (!priceId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Plano ou período de cobrança inválido'
        })
        return
      }

      await StripeService.updateSubscription(subscription.stripe_subscription_id, priceId)
      
      // Reset uso mensal ao fazer upgrade
      await subscriptionService.resetMonthlyUsage(req.user.id)
      
      res.json({
        success: true,
        message: 'Assinatura atualizada com sucesso'
      })
    } catch (error: any) {
      logger.error('Error updating subscription:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao atualizar assinatura',
        error: error.message
      })
    }
  }

  // Cancelar assinatura
  cancelSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      // Buscar subscription_id atual do usuário
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', req.user.id)
        .single()

      if (!subscription?.stripe_subscription_id) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Assinatura não encontrada'
        })
        return
      }

      await StripeService.cancelSubscription(subscription.stripe_subscription_id)
      
      res.json({
        success: true,
        message: 'Assinatura cancelada com sucesso'
      })
    } catch (error: any) {
      logger.error('Error canceling subscription:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao cancelar assinatura',
        error: error.message
      })
    }
  }

  // Verificar se upgrade é necessário
  checkUpgradeRequired = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      const { feature } = req.body

      if (!feature) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Feature é obrigatória'
        })
        return
      }

      const upgradeInfo = await StripeService.checkUpgradeRequired(
        req.user.id,
        feature
      )
      
      res.json({
        success: true,
        data: upgradeInfo
      })
    } catch (error: any) {
      logger.error('Error checking upgrade:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao verificar upgrade',
        error: error.message
      })
    }
  }

  // Webhook do Stripe
  handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const sig = req.headers['stripe-signature'] as string
      
      if (!sig) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Assinatura do webhook ausente'
        })
        return
      }

      // Delegar o processamento para o StripeService
      await StripeService.handleWebhook(req.body, sig)

      res.json({
        success: true,
        message: 'Webhook processado com sucesso'
      })
    } catch (error: any) {
      logger.error('Error processing webhook:', error)
      
      // Para webhooks, retornar 200 mesmo em caso de erro para evitar retry
      res.json({
        success: false,
        message: 'Erro ao processar webhook',
        error: error.message
      })
    }
  }

  // ✅ NOVO: Simular pagamento em ambiente DEV
  simulatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // APENAS em desenvolvimento
      if (process.env.NODE_ENV === 'production') {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: 'Simulação de pagamento disponível apenas em desenvolvimento'
        })
        return
      }

      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      const userId = req.user.id
      
      logger.info('[SIMULATE-PAYMENT] Simulating successful payment...', { userId })

      const { supabaseAdmin } = await import('../config/supabase.config')

      // Calcular novo período (próximo mês)
      const now = new Date()
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
      
      // Atualizar subscription para status ativo e período válido
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_end: nextMonth.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        logger.error('[SIMULATE-PAYMENT] Error updating subscription:', updateError)
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro ao simular pagamento: ' + updateError.message
        })
        return
      }

      // Limpar cache do subscription service
      const subscriptionServiceInstance = subscriptionService as any
      if (subscriptionServiceInstance.stateCache?.delete) {
        subscriptionServiceInstance.stateCache.delete(userId)
      }

      // Verificar estado atualizado
      const updatedState = await subscriptionService.getState(userId)

      logger.info('[SIMULATE-PAYMENT] Payment simulation completed!', {
        userId,
        newStatus: updatedState?.status,
        newPeriodEnd: updatedState?.currentPeriodEnd
      })

      res.json({
        success: true,
        message: 'Pagamento simulado com sucesso!',
        data: {
          userId,
          status: updatedState?.status || 'active',
          planType: updatedState?.planType,
          currentPeriodEnd: updatedState?.currentPeriodEnd,
          creditsAvailable: updatedState?.creditsAvailable
        }
      })
    } catch (error: any) {
      logger.error('[SIMULATE-PAYMENT] Error simulating payment:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao simular pagamento: ' + error.message
      })
    }
  }

  // ✅ NOVO: Endpoint para forçar inicialização de usuário (para debug/correção)
  forceUserInitialization = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: 'Autenticação requerida'
        })
        return
      }

      const userId = req.user.id
      const email = req.user.email
      
      logger.info('[SUBSCRIPTION-CONTROLLER] Force initializing user...', { userId, email })

      // Usar SecureDbService diretamente para garantir criação com privilégios admin
      const secureDbService = (await import('../services/secure-db.service')).default

      try {
        await secureDbService.initializeNewUser(userId)
        logger.info('[SUBSCRIPTION-CONTROLLER] User initialized via SecureDbService')
        
        // Aguardar um pouco para garantir que dados foram criados
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Limpar cache do subscription service
        const subscriptionServiceInstance = subscriptionService as any
        if (subscriptionServiceInstance.stateCache?.delete) {
          subscriptionServiceInstance.stateCache.delete(userId)
        }
        
        // Tentar buscar dados novamente
        const state = await subscriptionService.getState(userId)
        
        if (state) {
          res.json({
            success: true,
            message: 'Usuário inicializado com sucesso',
            data: {
              userId: state.userId,
              email: state.email,
              planType: state.planType,
              creditsAvailable: state.creditsAvailable,
              features: state.features
            }
          })
        } else {
          // Fallback: criar manualmente usando supabaseAdmin  
          logger.warn('[SUBSCRIPTION-CONTROLLER] State not found after init, trying manual creation...')
          
          const { supabaseAdmin } = await import('../config/supabase.config')
          
          // Criar profile se não existe
          await supabaseAdmin.from('profiles').upsert({
            id: userId,
            email: email,
            name: email?.split('@')[0] || 'Usuário',
            subscription: 'starter',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })
          
          res.json({
            success: true,
            message: 'Usuário inicializado com fallback',
            data: {
              userId,
              email,
              planType: 'starter',
              manualCreation: true
            }
          })
        }
      } catch (initError: any) {
        logger.error('[SUBSCRIPTION-CONTROLLER] Initialization error:', initError)
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro na inicialização: ' + initError.message
        })
      }
    } catch (error: any) {
      logger.error('[SUBSCRIPTION-CONTROLLER] Error in force initialization:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao inicializar usuário: ' + error.message
      })
    }
  }

  // ✅ DEBUG: Cache stats para desenvolvimento
  getCacheStats = async (_req: Request, res: Response): Promise<void> => {
    try {
      if (process.env.NODE_ENV === 'production') {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: 'Endpoint disponível apenas em desenvolvimento'
        })
        return
      }

      const subscriptionServiceInstance = subscriptionService as any
      const cacheSize = subscriptionServiceInstance.stateCache?.size || 0
      
      // Estatísticas de memória
      const memoryUsage = process.memoryUsage()
      
      res.json({
        success: true,
        data: {
          subscription: {
            cacheSize,
            cacheTTL: subscriptionServiceInstance.CACHE_TTL_SUBSCRIPTION || 120000
          },
          memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
          },
          uptime: `${Math.round(process.uptime())}s`,
          nodeEnv: process.env.NODE_ENV || 'unknown'
        }
      })
    } catch (error: any) {
      logger.error('Error getting cache stats:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao obter estatísticas do cache'
      })
    }
  }

  // ✅ ENDPOINT DE EMERGÊNCIA - SÓ PARA DEV (sem autenticação)
  emergencyUserFix = async (_req: Request, res: Response): Promise<void> => {
    try {
      // APENAS em desenvolvimento
      if (process.env.NODE_ENV === 'production') {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: 'Endpoint disponível apenas em desenvolvimento'
        })
        return
      }

      const targetUserId = '9d8b1331-c611-4914-a8d3-449083d84b59'
      const targetEmail = 'gabrielpaula04@gmail.com'

      logger.info('[EMERGENCY] Fixing user data...', { targetUserId, targetEmail })

      const { supabaseAdmin } = await import('../config/supabase.config')

      // 1. Criar/atualizar profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: targetUserId,
          email: targetEmail,
          name: 'Gabriel',
          subscription: 'starter',
          is_lifetime_free: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (profileError) {
        logger.error('[EMERGENCY] Error creating profile:', profileError)
        throw profileError
      }

      logger.info('[EMERGENCY] Profile created/updated:', profile)

      // 2. Criar subscription
      const { error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: targetUserId,
          plan_type: 'starter',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (subscriptionError) {
        logger.warn('[EMERGENCY] Warning creating subscription:', subscriptionError)
      }

      // 3. Inicializar créditos
      const { error: creditsError } = await supabaseAdmin
        .rpc('initialize_user_credits', {
          p_user_id: targetUserId,
          p_plan_type: 'starter'
        })

      if (creditsError) {
        logger.warn('[EMERGENCY] Warning initializing credits:', creditsError)
      }

      // 4. Criar período de uso mensal
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      const { error: usageError } = await supabaseAdmin
        .from('user_monthly_usage')
        .upsert({
          user_id: targetUserId,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          requests_used: 0,
          period_month: periodStart.toISOString().substring(0, 7),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,period_month'
        })

      if (usageError) {
        logger.warn('[EMERGENCY] Warning creating monthly usage:', usageError)
      }

      // 5. Verificar se dados foram criados corretamente
      const { data: checkState } = await supabaseAdmin
        .from('subscription_state')
        .select('*')
        .eq('user_id', targetUserId)
        .single()

      logger.info('[EMERGENCY] User fix completed successfully!', {
        profile: !!profile,
        subscription: !subscriptionError,
        credits: !creditsError,
        usage: !usageError,
        stateCreated: !!checkState
      })

      res.json({
        success: true,
        message: 'Dados do usuário corrigidos com sucesso!',
        data: {
          userId: targetUserId,
          email: targetEmail,
          planType: 'starter',
          stateAvailable: !!checkState,
          details: {
            profileCreated: !!profile,
            subscriptionCreated: !subscriptionError,
            creditsInitialized: !creditsError,
            usageCreated: !usageError
          }
        }
      })
    } catch (error: any) {
      logger.error('[EMERGENCY] Error fixing user:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao corrigir usuário: ' + error.message,
        error: error.stack
      })
    }
  }
}

export default new SubscriptionController()