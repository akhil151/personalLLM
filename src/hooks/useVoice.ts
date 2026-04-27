import { useState, useCallback } from 'react';
import { browserVoiceService } from '@/services/voice/browserVoiceService';

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (!browserVoiceService) return;

    setError(null);
    setIsListening(true);
    
    browserVoiceService.startSTT(
      (text) => {
        setIsListening(false);
        onResult(text);
      },
      (err) => {
        setIsListening(false);
        setError(typeof err === 'string' ? err : 'Speech recognition error');
      }
    );
  }, []);

  const stopListening = useCallback(() => {
    if (!browserVoiceService) return;
    browserVoiceService.stopSTT();
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!browserVoiceService) return;
    setIsSpeaking(true);
    browserVoiceService.speak(text, () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    if (!browserVoiceService) return;
    browserVoiceService.stopSpeaking();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
}
