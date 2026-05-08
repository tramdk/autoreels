import axios from 'axios';

export interface EventPayload {
  reelId: string;
  [key: string]: any;
}

export type EventType = 
  | 'REEL_REQUESTED' 
  | 'REEL_PROCESSING' 
  | 'REEL_PROGRESS' 
  | 'REEL_COMPLETED' 
  | 'REEL_FAILED' 
  | 'REEL_PUBLISHED';

export class EventBusClient {
  private baseUrl: string;
  private stream: string = 'reels_stream';

  constructor(baseUrl: string = process.env.EVENT_BUS_URL || 'http://localhost:4000') {
    this.baseUrl = baseUrl;
  }

  async publish(event: EventType, payload: EventPayload) {
    try {
      const response = await axios.post(`${this.baseUrl}/publish`, {
        stream: this.stream,
        event,
        payload
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to publish event ${event}:`, error);
      // Don't throw, just log for now to prevent worker crash
    }
  }
}
