'use client';

import React from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface VoicePushToTalkProps {
  isListening: boolean;
  isSpeaking: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function VoicePushToTalk({ 
  isListening, 
  isSpeaking, 
  onStart, 
  onStop, 
  disabled 
}: VoicePushToTalkProps) {
  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        onMouseDown={onStart}
        onMouseUp={onStop}
        onMouseLeave={onStop}
        onTouchStart={onStart}
        onTouchEnd={onStop}
        disabled={disabled}
        className={`p-2 rounded-full transition-all duration-200 ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse scale-110 shadow-lg shadow-red-500/50' 
            : isSpeaking
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={isListening ? 'Listening...' : 'Hold to talk'}
      >
        {isListening ? (
          <Mic size={20} />
        ) : isSpeaking ? (
          <Volume2 size={20} />
        ) : (
          <MicOff size={20} />
        )}
      </button>
      
      {isListening && (
        <span className="text-xs font-bold text-red-500 uppercase animate-pulse">
          Recording...
        </span>
      )}
      {isSpeaking && (
        <span className="text-xs font-bold text-blue-500 uppercase animate-pulse">
          Speaking...
        </span>
      )}
    </div>
  );
}
