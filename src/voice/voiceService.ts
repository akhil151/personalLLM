
import WebSocket from 'ws';
import { eventBus } from '@/events/eventBus';

export interface VoiceProvider {
  name: string;
  createSession(userId: string, conversationId: string): Promise<any>;
  sendAudio(userId: string, base64Audio: string): Promise<void>;
  closeSession(userId: string): Promise<void>;
}

export class OpenAIRealtimeProvider implements VoiceProvider {
  name = 'openai_realtime';
  private connections: Map<string, WebSocket> = new Map();

  async createSession(userId: string, conversationId: string) {
    const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
    const ws = new WebSocket(url, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    ws.on('open', () => {
      console.log(`[VOICE] Connected to OpenAI Realtime for user ${userId}`);
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful AI assistant with voice capabilities.',
          voice: 'alloy',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: { type: 'server_vad' }
        }
      }));
    });

    ws.on('message', (data: WebSocket.Data) => {
      const event = JSON.parse(data.toString());
      if (event.type === 'input_audio_buffer.speech_started') {
        eventBus.publish(conversationId, 'VOICE_INTERRUPTION', { userId });
        ws.send(JSON.stringify({ type: 'response.cancel' }));
      }
    });

    this.connections.set(userId, ws);
    return { status: 'connected' };
  }

  async sendAudio(userId: string, base64Audio: string) {
    const ws = this.connections.get(userId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64Audio }));
    }
  }

  async closeSession(userId: string) {
    const ws = this.connections.get(userId);
    if (ws) {
      ws.close();
      this.connections.delete(userId);
    }
  }
}

class VoiceService {
  private provider: VoiceProvider;

  constructor() {
    // Default to OpenAI, can be swapped later
    this.provider = new OpenAIRealtimeProvider();
  }

  async createSession(userId: string, conversationId: string) {
    return this.provider.createSession(userId, conversationId);
  }

  async sendAudio(userId: string, base64Audio: string) {
    return this.provider.sendAudio(userId, base64Audio);
  }

  async closeSession(userId: string) {
    return this.provider.closeSession(userId);
  }
}

export const voiceService = new VoiceService();
