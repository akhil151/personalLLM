'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useVoice } from '@/hooks/useVoice';
import { VoicePushToTalk } from '@/components/voice/VoicePushToTalk';
import { createClient } from '@/lib/supabase';
import { Mic, StopCircle, Volume2, VolumeX, MessageSquare } from 'lucide-react';

export default function VoicePage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const supabase = createClient();
  
  // Initialize conversation and user
  useEffect(() => {
    async function initConversation() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      
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
          .insert({ user_id: user.id, title: 'Voice Conversation' })
          .select('id')
          .single();
        if (newConv) setConversationId(newConv.id);
      }
    }
    initConversation();
  }, [supabase]);

  const { 
    isListening, 
    isSpeaking, 
    error,
    startListening, 
    stopListening, 
    speak, 
    stopSpeaking, 
    emitRequestSent,
    emitResponseReceived
  } = useVoice({ userId, conversationId });

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
          emitResponseReceived(text);
          speak(text, () => setIsVoiceActive(false));
        }
      }
    },
  });

  const handleVoiceResult = (text: string) => {
    if (!conversationId) return;
    setIsVoiceActive(true);
    emitRequestSent(text);
    sendMessage({ text });
  };

  const handleVoiceStart = () => {
    stopSpeaking();
    startListening(handleVoiceResult);
  };

  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Tim Voice Assistant
          </h1>
          <p className="text-zinc-400">
            Talk to your AI assistant naturally
          </p>
        </div>

        {/* Status Display */}
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-3xl p-8 border border-zinc-700 shadow-xl">
          <div className="flex flex-col items-center space-y-6">
            {/* Error Message */}
            {error && (
              <div className="w-full p-4 bg-red-900/30 border border-red-500 rounded-xl text-center">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
            {/* Status Text */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-zinc-200">
                {isListening ? 'Listening...' : 
                 isSpeaking ? 'Speaking...' : 
                 isLoading ? 'Thinking...' : 'Ready'}
              </h2>
              <p className="text-zinc-400">
                {isListening ? 'Speak now...' : 
                 isSpeaking ? 'Tap to stop' : 
                 'Click the mic to start'}
              </p>
            </div>

            {/* Visual Indicator */}
            <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening ? 'bg-red-500/20 animate-ping' : 
              isSpeaking ? 'bg-blue-500/20 animate-pulse' : 
              isLoading ? 'bg-amber-500/20' : 'bg-zinc-700/30'
            }`}>
              <button
                onClick={isListening ? stopListening : handleVoiceStart}
                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 ${
                  isListening ? 'bg-red-500 scale-110' : 
                  isSpeaking ? 'bg-blue-500' : 
                  isLoading ? 'bg-amber-500' : 'bg-zinc-600 hover:bg-zinc-500'
                }`}
              >
                {isListening ? <Mic size={48} className="text-white" /> :
                 isSpeaking ? <Volume2 size={48} className="text-white" /> :
                 <MessageSquare size={48} className="text-zinc-300" />}
              </button>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="p-3 bg-zinc-700 hover:bg-zinc-600 rounded-full transition-colors"
                >
                  <StopCircle size={24} className="text-zinc-200" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Conversation History */}
        <div className="bg-zinc-800/30 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/50">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Conversation</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No messages yet — start talking!</p>
            ) : (
              messages.map((m: any) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    m.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-zinc-700 text-zinc-100'
                  }`}>
                    {m.parts.map((part: any, i: number) => (
                      part.type === 'text' ? (
                        <p key={i} className="text-sm leading-relaxed">{part.text}</p>
                      ) : null
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
