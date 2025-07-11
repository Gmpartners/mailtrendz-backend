import { Router } from 'express'
import express from 'express'
import SubscriptionController from '../controllers/subscription.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.get('/plans', SubscriptionController.getPlans)

router.get('/current', authenticateToken, SubscriptionController.getCurrentSubscription)

router.get('/credits', authenticateToken, SubscriptionController.getCurrentCredits)

router.post('/consume-credits', authenticateToken, SubscriptionController.consumeCredits)

router.post('/check-upgrade', authenticateToken, SubscriptionController.checkUpgradeRequired)

router.post('/checkout', authenticateToken, SubscriptionController.createCheckoutSession)

router.get('/verify-payment', authenticateToken, SubscriptionController.verifyPayment)

router.post('/portal', authenticateToken, SubscriptionController.createPortalSession)

router.post('/webhook', express.raw({ type: 'application/json' }), SubscriptionController.handleStripeWebhook)

router.put('/update', authenticateToken, SubscriptionController.updateSubscription)

router.delete('/cancel', authenticateToken, SubscriptionController.cancelSubscription)

export default router
