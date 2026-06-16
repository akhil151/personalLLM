'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useVoice } from '@/hooks/useVoice';
import { createClient } from '@/lib/supabase';
import { Mic, Volume2, X, Minimize2, Maximize2, Activity } from 'lucide-react';

type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export default function AssistantPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [state, setState] = useState<AssistantState>('idle');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const supabase = createClient();
  const { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking } = useVoice();

  // Initialize conversation
  useEffect(() => {
    async function initConversation() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (conversations && conversations.length > 0) {
        setConversationId(conversations[0].id);
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ user_id: user.id, title: 'Floating Assistant' })
          .select('id')
          .single();
        if (newConv) setConversationId(newConv.id);
      }
    }
    initConversation();
  }, [supabase]);

  const { messages, sendMessage, status } = useChat({
    transport: conversationId ? new DefaultChatTransport({
      api: '/api/chat',
      body: { conversationId },
    }) : undefined,
    id: conversationId ?? undefined,
    onFinish: (data) => {
      if (isVoiceActive) {
        const lastMessage = data.messages[data.messages.length - 1];
        const parts = lastMessage?.parts || [];
        const text = parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ');
        if (text) {
          setState('speaking');
          speak(text, () => {
            setState('idle');
            setIsVoiceActive(false);
          });
        }
      }
    }
  });

  const handleVoiceResult = (text: string) => {
    if (!conversationId) return;
    setIsVoiceActive(true);
    setState('thinking');
    sendMessage({ text });
  };

  const handleVoiceStart = () => {
    stopSpeaking();
    setState('listening');
    startListening(handleVoiceResult);
  };

  const handleVoiceStop = () => {
    stopListening();
    if (status === 'ready') {
      setState('idle');
    }
  };

  // Update state based on status
  useEffect(() => {
    if (isSpeaking) {
      setState('speaking');
    } else if (isListening) {
      setState('listening');
    } else if (status === 'submitted' || status === 'streaming') {
      setState('thinking');
    } else if (status === 'ready') {
      setState('idle');
    }
  }, [isSpeaking, isListening, status]);

  // Drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const statusText = {
    idle: 'Ready',
    listening: 'Listening...',
    thinking: 'Thinking...',
    speaking: 'Speaking...',
    error: 'Error',
  };

  const statusColor = {
    idle: 'bg-zinc-700',
    listening: 'bg-red-500 animate-pulse',
    thinking: 'bg-amber-500',
    speaking: 'bg-blue-500 animate-pulse',
    error: 'bg-red-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
      <div className="text-center text-zinc-400 py-12">
        <h1 className="text-2xl font-bold text-zinc-200 mb-2">Floating Assistant</h1>
        <p>Drag the window anywhere on your screen</p>
      </div>

      {/* Floating Window */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 9999,
        }}
        className={`${isExpanded ? 'w-80' : 'w-48'} bg-zinc-800/95 backdrop-blur-md rounded-2xl border border-zinc-700 shadow-2xl transition-all duration-300`}
      >
        {/* Header (Draggable) */}
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 rounded-t-2xl cursor-grab active:cursor-grabbing border-b border-zinc-700"
        >
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${statusColor[state]}`} />
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              {statusText[state]}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
            >
              {isExpanded ? <Minimize2 size={16} className="text-zinc-400" /> : <Maximize2 size={16} className="text-zinc-400" />}
            </button>
            <button className="p-1 hover:bg-zinc-700 rounded transition-colors">
              <X size={16} className="text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="p-4">
            {/* Main Control */}
            <div className="flex flex-col items-center space-y-4 mb-4">
              <button
                onMouseDown={handleVoiceStart}
                onMouseUp={handleVoiceStop}
                onMouseLeave={handleVoiceStop}
                onTouchStart={handleVoiceStart}
                onTouchEnd={handleVoiceStop}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl ${
                  state === 'listening' 
                    ? 'bg-red-500 text-white scale-110' 
                    : state === 'speaking'
                    ? 'bg-blue-500 text-white'
                    : state === 'thinking'
                    ? 'bg-amber-500 text-white'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                {state === 'listening' ? <Mic size={32} /> :
                 state === 'speaking' ? <Volume2 size={32} /> :
                 state === 'thinking' ? <Activity size={32} className="animate-pulse" /> :
                 <Mic size={32} />}
              </button>
              <p className="text-xs text-zinc-400 text-center">
                {state === 'idle' ? 'Hold to talk' :
                 state === 'listening' ? 'Keep talking...' :
                 state === 'thinking' ? 'Processing...' :
                 'Tap to stop'}
              </p>
            </div>

            {/* Recent Messages */}
            {messages.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {messages.slice(-2).map((m: any) => (
                  <div key={m.id} className={`text-xs ${
                    m.role === 'user' ? 'text-blue-400' : 'text-zinc-300'
                  }`}>
                    {m.parts.map((part: any, i: number) => (
                      part.type === 'text' ? (
                        <span key={i}>{part.text.slice(0, 50)}{part.text.length > 50 ? '...' : ''}</span>
                      ) : null
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsed View */}
        {!isExpanded && (
          <div className="p-3 flex items-center justify-center">
            <button
              onMouseDown={handleVoiceStart}
              onMouseUp={handleVoiceStop}
              onMouseLeave={handleVoiceStop}
              onTouchStart={handleVoiceStart}
              onTouchEnd={handleVoiceStop}
              className={`p-2 rounded-full ${
                state === 'listening' ? 'bg-red-500' :
                state === 'speaking' ? 'bg-blue-500' :
                state === 'thinking' ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              {state === 'listening' ? <Mic size={20} className="text-white" /> :
               state === 'speaking' ? <Volume2 size={20} className="text-white" /> :
               state === 'thinking' ? <Activity size={20} className="text-white animate-pulse" /> :
               <Mic size={20} className="text-zinc-300" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
