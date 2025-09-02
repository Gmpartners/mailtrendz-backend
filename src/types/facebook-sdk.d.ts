// Facebook SDK Type Declarations
declare module 'facebook-nodejs-business-sdk' {
  export class FacebookAdsApi {
    static init(accessToken: string): void;
  }

  export class ServerEvent {
    setEventName(name: string): ServerEvent;
    setEventTime(time: number): ServerEvent;
    setEventId(id: string): ServerEvent;
    setUserData(userData: any): ServerEvent;
    setCustomData(customData: any): ServerEvent;
    setEventSourceUrl(url: string): ServerEvent;
    setActionSource(source: string): ServerEvent;
  }

  export class EventRequest {
    constructor(accessToken: string, pixelId: string);
    setEvents(events: ServerEvent[]): EventRequest;
    setTestEventCode(code: string): EventRequest;
    execute(): Promise<any>;
  }

  export class UserData {
    setEmail(email: string): UserData;
    setPhone(phone: string): UserData;
    setExternalId(id: string): UserData;
  }

  export class CustomData {
    setValue(value: number): CustomData;
    setCurrency(currency: string): CustomData;
    setContentType(type: string): CustomData;
    setContentIds(ids: string[]): CustomData;
    setContentName(name: string): CustomData;
  }
}