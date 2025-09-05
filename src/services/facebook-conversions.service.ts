// Facebook Conversions API Service - MailTrendz
// Sistema completo de tracking server-side para deduplicação com frontend

// @ts-ignore - Facebook SDK não tem tipos TypeScript oficiais
const bizSdk = require('facebook-nodejs-business-sdk');
const { FacebookAdsApi, ServerEvent, EventRequest, UserData, CustomData } = bizSdk;
import * as CryptoJS from 'crypto-js';

export interface FacebookEventData {
  eventName: string;
  eventId?: string;
  userEmail?: string;
  userPhone?: string;
  firstName?: string;
  lastName?: string;
  externalId?: string;
  value?: number;
  currency?: string;
  contentType?: string;
  contentIds?: string[];
  contentName?: string;
  sourceUrl?: string;
  customData?: Record<string, any>;
}

export interface TrackingResult {
  success: boolean;
  eventId: string;
  message: string;
  error?: string;
}

class FacebookConversionsService {
  private pixelId: string;
  private accessToken: string;
  private testEventCode?: string;
  private isInitialized: boolean = false;

  constructor() {
    this.pixelId = process.env.FACEBOOK_PIXEL_ID || '';
    this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN || '';
    this.testEventCode = process.env.FACEBOOK_TEST_EVENT_CODE;
    
    this.initialize();
  }

  private initialize(): void {
    if (!this.pixelId || !this.accessToken) {
      console.warn('⚠️  Facebook Conversions API: Missing credentials in .env');
      return;
    }

    try {
      FacebookAdsApi.init(this.accessToken);
      this.isInitialized = true;
      console.log('✅ Facebook Conversions API initialized');
    } catch (error) {
      console.error('❌ Facebook Conversions API initialization failed:', error);
    }
  }

  /**
   * Hash user data for GDPR compliance
   */
  private hashUserData(data: string): string {
    return CryptoJS.SHA256(data.toLowerCase().trim()).toString();
  }

  /**
   * Generate unique event ID for deduplication
   */
  public generateEventId(prefix: string = 'event'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send event to Facebook Conversions API
   */
  async sendEvent(eventData: FacebookEventData): Promise<TrackingResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        eventId: eventData.eventId || 'unknown',
        message: 'Facebook Conversions API not initialized',
        error: 'Missing credentials or initialization failed'
      };
    }

    try {
      // Build UserData
      const userData: any = new UserData();
      if (eventData.userEmail) {
        userData.setEmail(this.hashUserData(eventData.userEmail));
      }
      if (eventData.userPhone) {
        userData.setPhone(this.hashUserData(eventData.userPhone));
      }
      if (eventData.firstName) {
        userData.setFirstName(this.hashUserData(eventData.firstName));
      }
      if (eventData.lastName) {
        userData.setLastName(this.hashUserData(eventData.lastName));
      }
      if (eventData.externalId) {
        userData.setExternalId(eventData.externalId);
      }
      
      // ✅ FALLBACK: Garantir pelo menos Country para melhorar match rate
      userData.setCountryCode('br');

      // Build CustomData
      const customData: any = new CustomData();
      if (eventData.value !== undefined && eventData.value !== null) {
        customData.setValue(eventData.value);
      }
      if (eventData.currency) customData.setCurrency(eventData.currency);
      if (eventData.contentType) customData.setContentType(eventData.contentType);
      if (eventData.contentIds) customData.setContentIds(eventData.contentIds);
      if (eventData.contentName) customData.setContentName(eventData.contentName);
      
      // Add custom properties
      if (eventData.customData) {
        for (const [key, value] of Object.entries(eventData.customData)) {
          (customData as any)[key] = value;
        }
      }

      // Build ServerEvent
      const serverEvent: any = new ServerEvent();
      serverEvent.setEventName(eventData.eventName);
      serverEvent.setEventTime(Math.floor(Date.now() / 1000));
      serverEvent.setEventId(eventData.eventId || this.generateEventId());
      serverEvent.setUserData(userData);
      serverEvent.setCustomData(customData);
      serverEvent.setEventSourceUrl(eventData.sourceUrl || 'https://mailtrendz.com');
      serverEvent.setActionSource('website');

      // Create EventRequest
      const eventRequest: any = new EventRequest(this.accessToken, this.pixelId);
      eventRequest.setEvents([serverEvent]);
      
      // Add test event code if in development
      if (this.testEventCode && process.env.NODE_ENV === 'development') {
        eventRequest.setTestEventCode(this.testEventCode);
      }

      // Send to Facebook
      await eventRequest.execute();
      
      console.log(`✅ Facebook Conversion sent: ${eventData.eventName}`, {
        eventId: eventData.eventId,
        pixelId: this.pixelId,
        testMode: !!this.testEventCode
      });

      return {
        success: true,
        eventId: eventData.eventId || 'generated',
        message: `Event ${eventData.eventName} sent successfully`
      };

    } catch (error: any) {
      console.error('❌ Facebook Conversions API error:', error);
      return {
        success: false,
        eventId: eventData.eventId || 'unknown',
        message: 'Failed to send event to Facebook',
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Track user registration
   */
  async trackRegistration(data: {
    eventId?: string;
    userEmail?: string;
    userPhone?: string;
    firstName?: string;
    lastName?: string;
    userId?: string;
    method?: string;
    sourceUrl?: string;
  }): Promise<TrackingResult> {
    return this.sendEvent({
      eventName: 'CompleteRegistration',
      eventId: data.eventId || this.generateEventId('registration'),
      userEmail: data.userEmail,
      userPhone: data.userPhone,
      firstName: data.firstName,
      lastName: data.lastName,
      externalId: data.userId,
      contentType: 'registration',
      sourceUrl: data.sourceUrl,
      customData: {
        registration_method: data.method || 'email'
      }
    });
  }

  /**
   * Track purchase/subscription
   */
  async trackPurchase(data: {
    eventId?: string;
    userEmail?: string;
    userPhone?: string;
    orderId: string;
    value?: number;
    currency?: string;
    productName?: string;
    sourceUrl?: string;
  }): Promise<TrackingResult> {
    return this.sendEvent({
      eventName: 'Purchase',
      eventId: data.eventId || this.generateEventId('purchase'),
      userEmail: data.userEmail,
      userPhone: data.userPhone,
      externalId: data.orderId,
      value: data.value,
      currency: data.currency || 'BRL',
      contentType: 'subscription',
      contentIds: [data.orderId],
      contentName: data.productName,
      sourceUrl: data.sourceUrl,
      customData: {
        order_id: data.orderId,
        product_name: data.productName
      }
    });
  }

  /**
   * Track subscription
   */
  async trackSubscribe(data: {
    eventId?: string;
    userEmail?: string;
    subscriptionId: string;
    planName?: string;
    value?: number;
    currency?: string;
    sourceUrl?: string;
  }): Promise<TrackingResult> {
    return this.sendEvent({
      eventName: 'Subscribe',
      eventId: data.eventId || this.generateEventId('subscribe'),
      userEmail: data.userEmail,
      externalId: data.subscriptionId,
      value: data.value,
      currency: data.currency || 'BRL',
      contentType: 'subscription',
      contentIds: [data.subscriptionId],
      contentName: data.planName,
      sourceUrl: data.sourceUrl,
      customData: {
        subscription_id: data.subscriptionId,
        plan_name: data.planName
      }
    });
  }

  /**
   * Track email creation (MailTrendz specific)
   */
  async trackEmailCreated(data: {
    eventId?: string;
    userEmail?: string;
    projectId: string;
    templateType?: string;
    aiGenerated?: boolean;
    sourceUrl?: string;
  }): Promise<TrackingResult> {
    return this.sendEvent({
      eventName: 'EmailCreated',
      eventId: data.eventId || this.generateEventId('email'),
      userEmail: data.userEmail,
      externalId: data.projectId,
      contentType: 'email',
      contentIds: [data.projectId],
      contentName: data.templateType || 'custom',
      sourceUrl: data.sourceUrl,
      customData: {
        project_id: data.projectId,
        template_type: data.templateType,
        ai_generated: data.aiGenerated || false
      }
    });
  }

  /**
   * Track trial start
   */
  async trackTrialStart(data: {
    eventId?: string;
    userEmail?: string;
    userId?: string;
    trialType?: string;
    sourceUrl?: string;
  }): Promise<TrackingResult> {
    return this.sendEvent({
      eventName: 'StartTrial',
      eventId: data.eventId || this.generateEventId('trial'),
      userEmail: data.userEmail,
      externalId: data.userId,
      contentType: 'trial',
      contentName: data.trialType || 'free_trial',
      sourceUrl: data.sourceUrl,
      customData: {
        trial_type: data.trialType,
        user_id: data.userId
      }
    });
  }

  /**
   * Track lead (quando usuário demonstra interesse)
   */
  async trackLead(data: {
    eventId?: string;
    userEmail?: string;
    leadType?: string;
    sourceUrl?: string;
  }): Promise<TrackingResult> {
    return this.sendEvent({
      eventName: 'Lead',
      eventId: data.eventId || this.generateEventId('lead'),
      userEmail: data.userEmail,
      contentType: 'lead',
      contentName: data.leadType || 'general',
      sourceUrl: data.sourceUrl,
      customData: {
        lead_type: data.leadType
      }
    });
  }
}

// Export singleton instance
export const facebookConversionsService = new FacebookConversionsService();