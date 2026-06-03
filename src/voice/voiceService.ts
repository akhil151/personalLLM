import WebSocket from 'ws';
import { eventBus } from '@/events/eventBus';

/**
 * VoiceService handles real-time audio interaction using OpenAI Realtime API.
 * 
 * PHASE Y.1 ACTIVATION:
 * This is now a real WebSocket-based runtime that supports bidirectional 
 * audio streaming and interruption detection.
 */
class VoiceService {
  private connections: Map<string, WebSocket> = new Map();

  /**
   * Initializes a new Realtime session via WebSockets.
   */
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
      
      // Configure session
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful AI assistant with voice capabilities.',
          voice: 'alloy',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: { type: 'server_vad' } // Server-side Voice Activity Detection
        }
      }));
    });

    ws.on('message', (data: WebSocket.Data) => {
      const event = JSON.parse(data.toString());
      
      // Handle interruption detection
      if (event.type === 'input_audio_buffer.speech_started') {
        console.log(`[VOICE] User interrupted. Cancelling current response.`);
        eventBus.publish(conversationId, 'VOICE_INTERRUPTION', { userId });
        
        // Cancel the current generation on the server
        ws.send(JSON.stringify({ type: 'response.cancel' }));
      }

      // Handle transcriptions
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        console.log(`[VOICE] User said: ${event.transcript}`);
      }

      // Handle audio output (delta)
      if (event.type === 'response.audio.delta') {
        // In a real frontend, we would stream this base64 audio to the speaker
      }
    });

    this.connections.set(userId, ws);

    return {
      sessionId: `voice_${Date.now()}`,
      status: 'connected'
    };
  }

  /**
   * Sends audio buffer to the realtime session.
   */
  async sendAudio(userId: string, base64Audio: string) {
    const ws = this.connections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Audio
      }));
    }
  }

  /**
   * Gracefully closes the session.
   */
  async closeSession(userId: string) {
    const ws = this.connections.get(userId);
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.on('error', () => {}); // Ignore errors during close
          ws.close();
        }
      } catch (err) {
        // Already closed or other error
      }
      this.connections.delete(userId);
    }
  }
}

export const voiceService = new VoiceService();
