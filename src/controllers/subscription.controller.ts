import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import StripeService from '../services/stripe.service'
import CreditsService from '../services/credits.service'
import { supabase } from '../config/supabase.config'
import { HTTP_STATUS } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

class SubscriptionController {
  getPlans = asyncHandler(async (_req: Request, res: Response) => {
    const { error } = await supabase
      .from('plan_features')
      .select('*')
      .order('ai_credits')

    if (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar planos'
      })
      return
    }

    const priceIds = await StripeService.getPriceIds()
    const plansInfo = await StripeService.getPlansInfo()

    const enhancedPlans = [
      {
        id: 'free',
        name: 'Free',
        description: 'Perfeito para começar',
        price: plansInfo.free.price_monthly / 100,
        ai_credits: plansInfo.free.credits,
        max_projects: 3,
        has_folders: false,
        has_multi_user: false,
        has_html_export: false,
        has_email_preview: false,
        stripe_price_id: null,
        popular: false
      },
      {
        id: 'pro',
        name: 'Pro',
        description: 'Ideal para profissionais',
        price: plansInfo.pro.price_monthly / 100,
        ai_credits: plansInfo.pro.credits,
        max_projects: 50,
        has_folders: false,
        has_multi_user: false,
        has_html_export: true,
        has_email_preview: true,
        stripe_price_id: priceIds.pro.monthly,
        popular: false
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Para empresas e equipes',
        price: plansInfo.enterprise.price_monthly / 100,
        ai_credits: plansInfo.enterprise.credits,
        max_projects: 100,
        has_folders: true,
        has_multi_user: true,
        has_html_export: true,
        has_email_preview: true,
        stripe_price_id: priceIds.enterprise.monthly,
        popular: false
      },
      {
        id: 'unlimited',
        name: 'Unlimited',
        description: 'Poder ilimitado',
        price: plansInfo.unlimited.price_monthly / 100,
        ai_credits: 999999,
        max_projects: 999999,
        has_folders: true,
        has_multi_user: true,
        has_html_export: true,
        has_email_preview: true,
        stripe_price_id: priceIds.unlimited.monthly,
        popular: true,
        badge: 'Melhor'
      }
    ]

    res.json({
      success: true,
      data: { plans: enhancedPlans }
    })
  })

  getCurrentSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    const { data: subscriptionInfo, error } = await supabase
      .from('user_subscription_info')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar assinatura'
      })
      return
    }

    res.json({
      success: true,
      data: { 
        subscription: {
          plan_type: subscriptionInfo.plan_type,
          status: subscriptionInfo.subscription_status || 'active',
          current_period_end: subscriptionInfo.current_period_end,
          cancel_at_period_end: subscriptionInfo.cancel_at_period_end,
          credits: {
            available: subscriptionInfo.credits_available,
            used: subscriptionInfo.credits_used,
            total: subscriptionInfo.plan_credits,
            resetAt: subscriptionInfo.credits_reset_at,
            unlimited: subscriptionInfo.plan_type === 'unlimited'
          },
          features: {
            has_folders: subscriptionInfo.has_folders,
            has_multi_user: subscriptionInfo.has_multi_user,
            has_html_export: subscriptionInfo.has_html_export,
            has_email_preview: subscriptionInfo.has_email_preview,
            max_projects: subscriptionInfo.max_projects
          }
        }
      }
    })
  })

  getCurrentCredits = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    try {
      console.log('💎 [SUBSCRIPTION] Buscando créditos para usuário:', userId)
      
      const creditsBalance = await CreditsService.getCreditsBalance(userId)
      
      if (!creditsBalance) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Créditos não encontrados'
        })
        return
      }

      const creditsResponse = {
        user_id: userId,
        available: creditsBalance.available,
        used: creditsBalance.used,
        total: creditsBalance.total,
        reset_at: creditsBalance.resetAt?.toISOString() || null,
        unlimited: creditsBalance.unlimited,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('✅ [SUBSCRIPTION] Créditos encontrados:', {
        available: creditsResponse.available,
        total: creditsResponse.total,
        unlimited: creditsResponse.unlimited
      })

      res.json({
        success: true,
        data: { credits: creditsResponse }
      })
    } catch (error: any) {
      console.error('❌ [SUBSCRIPTION] Erro ao buscar créditos:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar créditos'
      })
    }
  })

  checkUpgradeRequired = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { feature } = req.body

    try {
      const upgradeCheck = await StripeService.checkUpgradeRequired(userId, feature)
      
      res.json({
        success: true,
        data: upgradeCheck
      })
    } catch (error: any) {
      logger.error('Upgrade check error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao verificar necessidade de upgrade'
      })
    }
  })

  createCheckoutSession = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { priceId } = req.body

    if (!priceId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Price ID é obrigatório'
      })
      return
    }

    const successUrl = process.env.STRIPE_SUCCESS_URL || `${process.env.FRONTEND_URL}/dashboard?success=true`
    const cancelUrl = process.env.STRIPE_CANCEL_URL || `${process.env.FRONTEND_URL}/pricing?canceled=true`

    try {
      const sessionUrl = await StripeService.createCheckoutSession(
        userId,
        priceId,
        successUrl,
        cancelUrl
      )

      res.json({
        success: true,
        data: { url: sessionUrl }
      })
    } catch (error: any) {
      logger.error('Checkout session error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao criar sessão de pagamento'
      })
    }
  })

  verifyPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { sessionId } = req.query

    if (!sessionId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Session ID é obrigatório'
      })
      return
    }

    try {
      const paymentStatus = await StripeService.verifyPaymentStatus(
        userId,
        sessionId as string
      )

      res.json({
        success: true,
        data: paymentStatus
      })
    } catch (error: any) {
      logger.error('Payment verification error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao verificar pagamento'
      })
    }
  })

  createPortalSession = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const returnUrl = `${process.env.FRONTEND_URL}/dashboard`

    try {
      const portalUrl = await StripeService.createPortalSession(userId, returnUrl)

      res.json({
        success: true,
        data: { url: portalUrl }
      })
    } catch (error: any) {
      logger.error('Portal session error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao criar portal de gerenciamento'
      })
    }
  })

  handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string

    if (!signature) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No signature provided'
      })
      return
    }

    try {
      await StripeService.handleWebhook(req.body, signature)
      res.json({ received: true })
    } catch (error: any) {
      logger.error('Webhook processing error:', error)
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Webhook processing failed'
      })
    }
  })

  updateSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { newPriceId } = req.body

    if (!newPriceId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'New price ID é obrigatório'
      })
      return
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single()

    if (!subscription?.stripe_subscription_id) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Nenhuma assinatura ativa encontrada'
      })
      return
    }

    try {
      await StripeService.updateSubscription(
        subscription.stripe_subscription_id,
        newPriceId
      )

      res.json({
        success: true,
        message: 'Assinatura atualizada com sucesso'
      })
    } catch (error: any) {
      logger.error('Update subscription error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao atualizar assinatura'
      })
    }
  })

  cancelSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single()

    if (!subscription?.stripe_subscription_id) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Nenhuma assinatura ativa encontrada'
      })
      return
    }

    try {
      await StripeService.cancelSubscription(subscription.stripe_subscription_id)

      res.json({
        success: true,
        message: 'Assinatura será cancelada no final do período'
      })
    } catch (error: any) {
      logger.error('Cancel subscription error:', error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao cancelar assinatura'
      })
    }
  })
}

export default new SubscriptionController()
