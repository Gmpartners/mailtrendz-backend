// Tracking Controller - MailTrendz
// Controlador para endpoints de tracking Facebook Conversions API

import { Request, Response } from 'express';
import { facebookConversionsService, FacebookEventData, TrackingResult } from '../services/facebook-conversions.service';

class TrackingController {
  /**
   * Endpoint genérico para tracking de eventos
   */
  async trackEvent(req: Request, res: Response): Promise<Response> {
    try {
      const { eventName, eventData }: { eventName: string; eventData: FacebookEventData } = req.body;

      if (!eventName) {
        return res.status(400).json({
          success: false,
          error: 'Event name is required'
        });
      }

      // ✅ ENHANCED: Extract client IP for Facebook matching
      const getClientIP = (req: Request): string | undefined => {
        const forwarded = req.headers['x-forwarded-for'];
        const clientIP = typeof forwarded === 'string' 
          ? forwarded.split(',')[0].trim()
          : req.connection.remoteAddress || req.socket.remoteAddress;
        
        // Filter out localhost/internal IPs for better matching
        if (clientIP && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(clientIP)) {
          return clientIP;
        }
        return undefined;
      };

      // Enriquecer com dados do usuário autenticado e IP do cliente
      const enrichedEventData = {
        ...eventData,
        userEmail: eventData.userEmail || (req as any).user?.email,
        externalId: eventData.externalId || (req as any).user?.id,
        sourceUrl: eventData.sourceUrl || req.headers.referer || 'https://mailtrendz.com',
        customData: {
          ...eventData.customData,
          // ✅ CRITICAL: Add client IP for Facebook matching
          clientIpAddress: getClientIP(req),
          // Add server-side request info
          serverTimestamp: Date.now(),
          userAgent: req.headers['user-agent']
        }
      };

      let result: TrackingResult;

      // Router para eventos específicos
      switch (eventName) {
        case 'CompleteRegistration':
          result = await facebookConversionsService.trackRegistration(enrichedEventData);
          break;
        case 'Purchase':
          result = await facebookConversionsService.trackPurchase({
            ...enrichedEventData,
            orderId: enrichedEventData.externalId || 'unknown',
            value: enrichedEventData.value // Don't default to 0, let it be undefined if not provided
          });
          break;
        case 'Subscribe':
          result = await facebookConversionsService.trackSubscribe({
            ...enrichedEventData,
            subscriptionId: enrichedEventData.externalId || 'unknown'
          });
          break;
        case 'EmailCreated':
          result = await facebookConversionsService.trackEmailCreated({
            ...enrichedEventData,
            projectId: enrichedEventData.externalId || 'unknown'
          });
          break;
        case 'StartTrial':
          result = await facebookConversionsService.trackTrialStart(enrichedEventData);
          break;
        case 'Lead':
          result = await facebookConversionsService.trackLead(enrichedEventData);
          break;
        default:
          result = await facebookConversionsService.sendEvent({
            ...enrichedEventData,
            eventName
          });
      }

      return res.status(result.success ? 200 : 500).json(result);

    } catch (error: any) {
      console.error('Tracking controller error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Track user registration
   */
  async trackRegistration(req: Request, res: Response): Promise<Response> {
    try {
      const { eventId, method, sourceUrl } = req.body;
      const user = (req as any).user;

      if (!user?.email) {
        return res.status(400).json({
          success: false,
          error: 'User email is required for registration tracking'
        });
      }

      const result = await facebookConversionsService.trackRegistration({
        eventId,
        userEmail: user.email,
        userId: user.id,
        method: method || 'email',
        sourceUrl: sourceUrl || req.headers.referer
      });

      return res.status(result.success ? 200 : 500).json(result);

    } catch (error: any) {
      console.error('Registration tracking error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to track registration'
      });
    }
  }

  /**
   * Track purchase/subscription
   */
  async trackPurchase(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        eventId, 
        orderId, 
        value, 
        currency = 'BRL', 
        productName,
        sourceUrl 
      } = req.body;
      
      const user = (req as any).user;

      if (!orderId || !value) {
        return res.status(400).json({
          success: false,
          error: 'Order ID and value are required for purchase tracking'
        });
      }

      const result = await facebookConversionsService.trackPurchase({
        eventId,
        userEmail: user?.email,
        orderId,
        value: parseFloat(value),
        currency,
        productName,
        sourceUrl: sourceUrl || req.headers.referer
      });

      return res.status(result.success ? 200 : 500).json(result);

    } catch (error: any) {
      console.error('Purchase tracking error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to track purchase'
      });
    }
  }

  /**
   * Track email creation
   */
  async trackEmailCreated(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        eventId, 
        projectId, 
        templateType, 
        aiGenerated,
        sourceUrl 
      } = req.body;
      
      const user = (req as any).user;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required for email creation tracking'
        });
      }

      const result = await facebookConversionsService.trackEmailCreated({
        eventId,
        userEmail: user?.email,
        projectId,
        templateType,
        aiGenerated: aiGenerated || false,
        sourceUrl: sourceUrl || req.headers.referer
      });

      return res.status(result.success ? 200 : 500).json(result);

    } catch (error: any) {
      console.error('Email creation tracking error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to track email creation'
      });
    }
  }

  /**
   * Track subscription
   */
  async trackSubscription(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        eventId, 
        subscriptionId, 
        planName, 
        value, 
        currency = 'BRL',
        sourceUrl 
      } = req.body;
      
      const user = (req as any).user;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          error: 'Subscription ID is required'
        });
      }

      const result = await facebookConversionsService.trackSubscribe({
        eventId,
        userEmail: user?.email,
        subscriptionId,
        planName,
        value: value ? parseFloat(value) : undefined,
        currency,
        sourceUrl: sourceUrl || req.headers.referer
      });

      return res.status(result.success ? 200 : 500).json(result);

    } catch (error: any) {
      console.error('Subscription tracking error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to track subscription'
      });
    }
  }

  /**
   * Track trial start
   */
  async trackTrialStart(req: Request, res: Response): Promise<Response> {
    try {
      const { eventId, trialType, sourceUrl } = req.body;
      const user = (req as any).user;

      const result = await facebookConversionsService.trackTrialStart({
        eventId,
        userEmail: user?.email,
        userId: user?.id,
        trialType: trialType || 'free_trial',
        sourceUrl: sourceUrl || req.headers.referer
      });

      return res.status(result.success ? 200 : 500).json(result);

    } catch (error: any) {
      console.error('Trial start tracking error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to track trial start'
      });
    }
  }

  /**
   * Track lead generation
   */
  async trackLead(req: Request, res: Response): Promise<Response> {
    try {
      const { eventId, leadType, userEmail, sourceUrl } = req.body;
      const user = (req as any).user;

      const result = await facebookConversionsService.trackLead({
        eventId,
        userEmail: userEmail || user?.email,
        leadType: leadType || 'general',
        sourceUrl: sourceUrl || req.headers.referer
      });

      return res.status(result.success ? 200 : 500).json(result);

    } catch (error: any) {
      console.error('Lead tracking error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to track lead'
      });
    }
  }

  /**
   * Health check do serviço de tracking
   */
  async healthCheck(_req: Request, res: Response): Promise<Response> {
    try {
      const isConfigured = !!(process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PIXEL_ID);
      
      return res.json({
        success: true,
        service: 'Facebook Conversions API',
        configured: isConfigured,
        pixelId: process.env.FACEBOOK_PIXEL_ID ? '***' + process.env.FACEBOOK_PIXEL_ID.slice(-4) : 'not set',
        environment: process.env.NODE_ENV
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  }
}

export const trackingController = new TrackingController();