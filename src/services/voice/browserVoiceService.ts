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
    if (!this.recognition) {
      onError('Speech Recognition not supported in this browser.');
      return;
    }

    if (this.isListening) return;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      onError(event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    this.recognition.start();
    this.isListening = true;
  }

  /**
   * Stop listening.
   */
  stopSTT() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Speak text using TTS.
   */
  speak(text: string, onEnd?: () => void) {
    // Cancel any current speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Optional: Select a better voice if available
    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    this.synthesis.speak(utterance);
  }

  /**
   * Stop any current speech.
   */
  stopSpeaking() {
    this.synthesis.cancel();
  }
}

export const browserVoiceService = typeof window !== 'undefined' ? new BrowserVoiceService() : null;
