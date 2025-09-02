// Tracking Routes - MailTrendz
// Rotas para sistema de tracking Facebook Conversions API

import express from 'express';
import { trackingController } from '../controllers/tracking.controller';

const router = express.Router();

/**
 * @route POST /api/tracking/event
 * @desc Tracking genérico de eventos
 * @access Public (mas pode ser protegido se necessário)
 */
router.post('/event', trackingController.trackEvent);

/**
 * @route POST /api/tracking/registration
 * @desc Track user registration
 * @access Protected (requer usuário autenticado)
 */
router.post('/registration', trackingController.trackRegistration);

/**
 * @route POST /api/tracking/purchase
 * @desc Track purchase/payment
 * @access Protected
 */
router.post('/purchase', trackingController.trackPurchase);

/**
 * @route POST /api/tracking/subscription
 * @desc Track subscription
 * @access Protected
 */
router.post('/subscription', trackingController.trackSubscription);

/**
 * @route POST /api/tracking/email-created
 * @desc Track email creation (MailTrendz specific)
 * @access Protected
 */
router.post('/email-created', trackingController.trackEmailCreated);

/**
 * @route POST /api/tracking/trial-start
 * @desc Track trial start
 * @access Protected
 */
router.post('/trial-start', trackingController.trackTrialStart);

/**
 * @route POST /api/tracking/lead
 * @desc Track lead generation
 * @access Public (para capturar leads anônimos)
 */
router.post('/lead', trackingController.trackLead);

/**
 * @route GET /api/tracking/health
 * @desc Health check do serviço de tracking
 * @access Public
 */
router.get('/health', trackingController.healthCheck);

export default router;