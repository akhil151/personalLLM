'use client';

export class WakeWordService {
  private recognition: SpeechRecognition | null = null;
  private isListeningForWakeWord = false;
  private wakeWords: string[] = ['tim'];
  private onWakeWordDetected: (() => void) | null = null;
  private onError: ((error: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.toLowerCase();
            const isFinal = event.results[i].isFinal;
            
            if (isFinal || this.wakeWords.some(word => transcript.includes(word))) {
              const detectedWakeWord = this.wakeWords.find(word => transcript.includes(word));
              if (detectedWakeWord) {
                this.stopWakeWordListening();
                this.onWakeWordDetected?.();
              }
            }
          }
        };

        this.recognition.onerror = (event: any) => {
          console.error('[WakeWordService] Error:', event.error);
          if (event.error !== 'no-speech') {
            let errorMsg = event.error;
            if (event.error === 'not-allowed') {
              errorMsg = 'Microphone permission denied. Please allow microphone access in your browser settings.';
            }
            this.onError?.(errorMsg);
          }
        };

        this.recognition.onend = () => {
          if (this.isListeningForWakeWord) {
            try {
              this.recognition?.start();
            } catch (e) {
              console.error('Failed to restart wake word listening:', e);
            }
          }
        };
      }
    }
  }

  setWakeWords(words: string[]) {
    this.wakeWords = words.map(w => w.toLowerCase());
  }

  startWakeWordListening(onWakeWordDetected: () => void, onError?: (error: string) => void) {
    console.log('[WakeWordService] Starting wake word listening');
    this.onWakeWordDetected = onWakeWordDetected;
    this.onError = onError || null;
    this.isListeningForWakeWord = true;
    try {
      this.recognition?.start();
    } catch (e) {
      console.error('Failed to start wake word listening:', e);
    }
  }

  stopWakeWordListening() {
    console.log('[WakeWordService] Stopping wake word listening');
    this.isListeningForWakeWord = false;
    try {
      this.recognition?.stop();
    } catch (e) {
      console.error('Failed to stop wake word listening:', e);
    }
  }

  isWakeWordListening(): boolean {
    return this.isListeningForWakeWord;
  }
}

export const wakeWordService = new WakeWordService();
