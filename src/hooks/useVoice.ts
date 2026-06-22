import { useState, useCallback } from 'react';
import { browserVoiceService } from '@/services/voice/browserVoiceService';
import { wakeWordService } from '@/services/voice/wakeWordService';

type VoiceHookProps = {
  userId?: string | null;
  conversationId?: string | null;
  workflowId?: string | null;
};

export function useVoice({ userId, conversationId, workflowId }: VoiceHookProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('[useVoice] Current state:', { isListening, isSpeaking, isWakeWordListening, error });

  // Helper function to emit voice events (fire and forget, don't block)
  const emitVoiceEvent = useCallback((eventType: string, payload?: any) => {
    if (!userId) {
      console.warn('[useVoice] Cannot emit event: userId not provided');
      return;
    }

    console.log('[useVoice] Emitting event:', eventType, payload);
    // Fire and forget - don't await the fetch
    fetch('/api/voice/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        payload,
        userId,
        conversationId,
        workflowId,
      }),
    }).catch(err => console.error('[useVoice] Failed to emit event:', err));
  }, [userId, conversationId, workflowId]);

  const startListening = useCallback((onResult?: (text: string) => void) => {
    console.log('[useVoice] startListening called');
    if (!browserVoiceService) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    // Stop wake word listening when we start manual listening
    stopWakeWordListening();
    setError(null);
    setIsListening(true);
    emitVoiceEvent('VOICE_STARTED');
    
    browserVoiceService.startSTT(
      (text) => {
        console.log('[useVoice] Got transcript:', text);
        setIsListening(false);
        emitVoiceEvent('VOICE_TRANSCRIBED', {
          transcript: text,
          transcript_length: text.length,
        });
        emitVoiceEvent('VOICE_STOPPED');
        if (onResult) {
          onResult(text);
        }
      },
      (err) => {
        console.error('[useVoice] STT error:', err);
        setIsListening(false);
        
        let errorMsg = 'Speech recognition error';
        if (err === 'not-allowed') {
          errorMsg = 'Microphone permission denied. Please allow microphone access in your browser settings.';
        } else if (err === 'no-speech') {
          // Don't show error for no speech
          setError(null);
        } else if (typeof err === 'string') {
          errorMsg = err;
        }
        
        if (err !== 'no-speech') {
          setError(errorMsg);
          emitVoiceEvent('VOICE_ERROR', {
            error_type: err === 'not-allowed' ? 'permission_denied' : 'speech_recognition',
            error_message: errorMsg,
            stack: err instanceof Error ? err.stack : undefined,
          });
        }
        emitVoiceEvent('VOICE_STOPPED');
      }
    );
  }, [emitVoiceEvent]);

  const stopListening = useCallback(() => {
    console.log('[useVoice] stopListening called');
    if (!browserVoiceService) return;
    browserVoiceService.stopSTT();
    setIsListening(false);
    emitVoiceEvent('VOICE_STOPPED');
  }, [emitVoiceEvent]);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    console.log('[useVoice] speak called:', text);
    if (!browserVoiceService) return;
    // Stop wake word listening while speaking
    stopWakeWordListening();
    setIsSpeaking(true);
    emitVoiceEvent('VOICE_PLAYBACK_STARTED');
    
    browserVoiceService.speak(text, () => {
      console.log('[useVoice] speak finished');
      setIsSpeaking(false);
      emitVoiceEvent('VOICE_PLAYBACK_COMPLETED');
      if (onEnd) onEnd();
    });
  }, [emitVoiceEvent]);

  const stopSpeaking = useCallback(() => {
    console.log('[useVoice] stopSpeaking called');
    if (!browserVoiceService) return;
    browserVoiceService.stopSpeaking();
    setIsSpeaking(false);
  }, []);

  const emitRequestSent = useCallback((message: string) => {
    emitVoiceEvent('VOICE_REQUEST_SENT', {
      message_length: message.length,
    });
  }, [emitVoiceEvent]);

  const emitResponseReceived = useCallback((response: string) => {
    emitVoiceEvent('VOICE_RESPONSE_RECEIVED', {
      response_length: response.length,
    });
  }, [emitVoiceEvent]);

  const emitError = useCallback((errorType: string, errorMessage: string, stack?: string) => {
    setError(errorMessage);
    emitVoiceEvent('VOICE_ERROR', {
      error_type: errorType,
      error_message: errorMessage,
      stack,
    });
  }, [emitVoiceEvent]);

  // Wake word detection functions
  const startWakeWordListening = useCallback((onWakeWord: () => void) => {
    console.log('[useVoice] startWakeWordListening called');
    setIsWakeWordListening(true);
    wakeWordService.startWakeWordListening(onWakeWord, (error) => {
      console.error('[useVoice] Wake word error:', error);
      setError(error);
    });
  }, []);

  const stopWakeWordListening = useCallback(() => {
    console.log('[useVoice] stopWakeWordListening called');
    setIsWakeWordListening(false);
    wakeWordService.stopWakeWordListening();
  }, []);

  const setWakeWords = useCallback((words: string[]) => {
    wakeWordService.setWakeWords(words);
  }, []);

  return {
    isListening,
    isSpeaking,
    isWakeWordListening,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    emitRequestSent,
    emitResponseReceived,
    emitError,
    startWakeWordListening,
    stopWakeWordListening,
    setWakeWords,
  };
}
