// Auto-Tracking Middleware - MailTrendz
// Middleware para tracking automático de eventos críticos

import { Request, Response, NextFunction } from 'express';
import { facebookConversionsService } from '../services/facebook-conversions.service';

interface TrackingConfig {
  eventName: string;
  dataExtractor?: (req: Request, res: Response, responseData?: any) => any;
  condition?: (req: Request, res: Response) => boolean;
}

/**
 * Middleware para tracking automático de eventos
 */
export const autoTrack = (config: TrackingConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original send method
    const originalSend = res.send;
    const originalJson = res.json;

    // Override send method to capture response
    res.send = function(data: any) {
      handleTracking.call(this, data);
      return originalSend.call(this, data);
    };

    res.json = function(data: any) {
      handleTracking.call(this, data);
      return originalJson.call(this, data);
    };

    function handleTracking(responseData: any) {
      // Only track successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Check condition if provided
        if (config.condition && !config.condition(req, res)) {
          return;
        }

        // Extract tracking data
        const trackingData = config.dataExtractor 
          ? config.dataExtractor(req, res, responseData)
          : extractDefaultData(req, res, responseData);

        // Track in background (don't block response)
        setImmediate(async () => {
          try {
            await trackEvent(config.eventName, trackingData, req);
          } catch (error) {
            console.error(`Auto-tracking error for ${config.eventName}:`, error);
          }
        });
      }
    }

    next();
  };
};

/**
 * Extract default tracking data from request/response
 */
function extractDefaultData(req: Request, _res: Response, responseData: any): any {
  const user = (req as any).user;
  
  return {
    userEmail: user?.email,
    externalId: user?.id || responseData?.id || responseData?.user_id,
    sourceUrl: req.headers.referer || 'https://mailtrendz.com',
    timestamp: Date.now(),
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress
  };
}

/**
 * Track event based on event name
 */
async function trackEvent(eventName: string, data: any, _req: Request): Promise<void> {
  const eventId = facebookConversionsService.generateEventId(eventName.toLowerCase());

  switch (eventName) {
    case 'CompleteRegistration':
      await facebookConversionsService.trackRegistration({
        eventId,
        userEmail: data.userEmail,
        userId: data.externalId,
        sourceUrl: data.sourceUrl
      });
      break;

    case 'Purchase':
      await facebookConversionsService.trackPurchase({
        eventId,
        userEmail: data.userEmail,
        orderId: data.orderId || data.externalId,
        value: data.value || data.amount,
        currency: data.currency || 'BRL',
        productName: data.productName || data.planName,
        sourceUrl: data.sourceUrl
      });
      break;

    case 'Subscribe':
      await facebookConversionsService.trackSubscribe({
        eventId,
        userEmail: data.userEmail,
        subscriptionId: data.subscriptionId || data.externalId,
        planName: data.planName,
        value: data.value,
        currency: data.currency || 'BRL',
        sourceUrl: data.sourceUrl
      });
      break;

    case 'EmailCreated':
      await facebookConversionsService.trackEmailCreated({
        eventId,
        userEmail: data.userEmail,
        projectId: data.projectId || data.externalId,
        templateType: data.templateType,
        aiGenerated: data.aiGenerated,
        sourceUrl: data.sourceUrl
      });
      break;

    case 'StartTrial':
      await facebookConversionsService.trackTrialStart({
        eventId,
        userEmail: data.userEmail,
        userId: data.externalId,
        trialType: data.trialType,
        sourceUrl: data.sourceUrl
      });
      break;

    case 'Lead':
      await facebookConversionsService.trackLead({
        eventId,
        userEmail: data.userEmail,
        leadType: data.leadType,
        sourceUrl: data.sourceUrl
      });
      break;

    default:
      await facebookConversionsService.sendEvent({
        eventName,
        eventId,
        userEmail: data.userEmail,
        externalId: data.externalId,
        sourceUrl: data.sourceUrl,
        customData: data
      });
  }
}

/**
 * Predefined middleware for common events
 */
export const trackingMiddleware = {
  /**
   * Track user registration
   */
  registration: autoTrack({
    eventName: 'CompleteRegistration',
    dataExtractor: (req, res, responseData) => ({
      ...extractDefaultData(req, res, responseData),
      method: req.body.provider || req.body.method || 'email'
    }),
    condition: (_req, res) => res.statusCode === 201 // Only track successful registrations
  }),

  /**
   * Track purchases/payments
   */
  purchase: autoTrack({
    eventName: 'Purchase',
    dataExtractor: (req, res, responseData) => ({
      ...extractDefaultData(req, res, responseData),
      orderId: responseData?.id || responseData?.orderId || req.body.orderId,
      value: responseData?.amount || req.body.amount,
      currency: responseData?.currency || req.body.currency || 'BRL',
      productName: responseData?.product_name || req.body.productName
    })
  }),

  /**
   * Track subscriptions
   */
  subscription: autoTrack({
    eventName: 'Subscribe',
    dataExtractor: (req, res, responseData) => ({
      ...extractDefaultData(req, res, responseData),
      subscriptionId: responseData?.subscription_id || responseData?.id,
      planName: responseData?.plan_name || req.body.planName,
      value: responseData?.amount || req.body.amount,
      currency: responseData?.currency || req.body.currency || 'BRL'
    })
  }),

  /**
   * Track email creation
   */
  emailCreated: autoTrack({
    eventName: 'EmailCreated',
    dataExtractor: (req, res, responseData) => ({
      ...extractDefaultData(req, res, responseData),
      projectId: responseData?.id || responseData?.projectId || req.body.projectId,
      templateType: req.body.template_type || req.body.templateType,
      aiGenerated: req.body.ai_generated || req.body.aiGenerated || false
    })
  }),

  /**
   * Track trial start
   */
  trialStart: autoTrack({
    eventName: 'StartTrial',
    dataExtractor: (req, res, responseData) => ({
      ...extractDefaultData(req, res, responseData),
      trialType: req.body.trial_type || req.body.trialType || 'free_trial'
    })
  }),

  /**
   * Track leads
   */
  lead: autoTrack({
    eventName: 'Lead',
    dataExtractor: (req, res, responseData) => ({
      ...extractDefaultData(req, res, responseData),
      leadType: req.body.lead_type || req.body.leadType || 'contact_form'
    })
  })
};