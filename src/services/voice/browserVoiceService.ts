/**
 * BrowserVoiceService provides STT and TTS using browser-native Web Speech API.
 * 
 * WHY BROWSER NATIVE?
 * 1. Zero cost: No API fees for STT/TTS.
 * 2. Privacy: Audio processing happens locally in the browser.
 * 3. Low latency: No network roundtrip for audio buffers.
 */

export class BrowserVoiceService {
  private recognition: any;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;

  constructor() {
    this.synthesis = window.speechSynthesis;
    
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    }
  }

  /**
   * Start listening for speech.
   */
  startSTT(onResult: (text: string) => void, onError: (err: any) => void) {
    console.log('[BrowserVoiceService] Starting STT...');
    if (!this.recognition) {
      console.error('[BrowserVoiceService] Speech Recognition not supported');
      onError('Speech Recognition not supported in this browser.');
      return;
    }

    if (this.isListening) {
      console.warn('[BrowserVoiceService] Already listening');
      return;
    }

    this.recognition.onresult = (event: any) => {
      console.log('[BrowserVoiceService] onresult event:', event);
      const transcript = event.results[0][0].transcript;
      console.log('[BrowserVoiceService] Transcript:', transcript);
      onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      console.error('[BrowserVoiceService] onerror event:', event);
      // Don't show "no-speech" error to user, it's normal
      if (event.error !== 'no-speech') {
        onError(event.error);
      }
      this.isListening = false;
    };

    this.recognition.onend = () => {
      console.log('[BrowserVoiceService] onend event');
      this.isListening = false;
    };

    try {
      this.recognition.start();
      this.isListening = true;
      console.log('[BrowserVoiceService] Started listening');
    } catch (e) {
      console.error('[BrowserVoiceService] Failed to start recognition:', e);
      onError(e);
    }
  }

  /**
   * Stop listening.
   */
  stopSTT() {
    console.log('[BrowserVoiceService] Stopping STT...');
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('[BrowserVoiceService] Failed to stop recognition:', e);
      }
      this.isListening = false;
    }
  }

  /**
   * Speak text using TTS.
   */
  speak(text: string, onEnd?: () => void) {
    console.log('[BrowserVoiceService] Speaking:', text);
    // Cancel any current speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Optional: Select a better voice if available
    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => {
      console.log('[BrowserVoiceService] Finished speaking');
      if (onEnd) onEnd();
    };

    this.synthesis.speak(utterance);
  }

  /**
   * Stop any current speech.
   */
  stopSpeaking() {
    console.log('[BrowserVoiceService] Stopping speaking');
    this.synthesis.cancel();
  }
}

export const browserVoiceService = typeof window !== 'undefined' ? new BrowserVoiceService() : null;
