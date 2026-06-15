'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect } from 'react';
import { VoicePushToTalk } from '@/components/voice/VoicePushToTalk';
import { useVoice } from '@/hooks/useVoice';

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages: any[];
}

export function ChatInterface({ conversationId, initialMessages }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [showTrace, setShowTrace] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking } = useVoice();
  
  // useChat in AI SDK 6 uses transport and sendMessage
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { conversationId },
    }),
    messages: initialMessages.map((m: any) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: 'text', text: m.content }],
    })),
    onFinish: (data) => {
      // If voice was active, read the response aloud
      if (isVoiceActive) {
        // AI SDK 6 onFinish structure check
        const lastMessage = data.messages[data.messages.length - 1];
        const parts = lastMessage?.parts || [];
        const text = parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ');
        if (text) {
          speak(text, () => {
            setIsVoiceActive(false);
          });
        }
      }
    }
  });

  // Handle voice result
  const handleVoiceResult = (text: string) => {
    setIsVoiceActive(true);
    sendMessage({ text });
    setSteps([]);
    
    // Log voice session (fire and forget for UI)
    fetch('/api/voice/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, status: 'completed' }),
    }).catch(console.error);
  };

  const handleVoiceStart = () => {
    stopSpeaking();
    startListening(handleVoiceResult);
  };

  // Fetch execution steps periodically if a run is active
  useEffect(() => {
    let interval: any;
    if (status === 'submitted' || status === 'streaming') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/chat/steps?conversationId=${conversationId}`);
          const data = await res.json();
          if (data.steps) setSteps(data.steps);
        } catch (err) {
          console.error('Failed to fetch steps:', err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status, conversationId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === 'ready') {
      sendMessage({ text: input });
      setInput('');
      setSteps([]); // Clear old steps
    }
  };

  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* HEADER */}
      <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${status === 'ready' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {status === 'ready' ? 'Ready' : 'Agent Executing...'}
          </span>
        </div>
        <button 
          onClick={() => setShowTrace(!showTrace)}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          {showTrace ? 'Hide Trace' : 'View Trace'}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* MESSAGE AREA */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-6 transition-all ${showTrace ? 'w-2/3' : 'w-full'}`}>
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start a conversation below!</p>
            </div>
          )}
          
          {messages.map((m: any) => (
            <div 
              key={m.id} 
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                m.role === 'user' 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900' 
                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
              }`}>
                {m.parts.map((part: any, i: number) => (
                  part.type === 'text' ? (
                    <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</p>
                  ) : null
                ))}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TRACE AREA (Part 8: Observability) */}
        {showTrace && (
          <div className="w-1/3 border-l border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 overflow-y-auto p-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Execution Trace</h3>
            <div className="space-y-4">
              {steps.length === 0 && <p className="text-xs text-zinc-400 italic">No activity yet...</p>}
              {steps.map((step, i) => (
                <div key={i} className="border-l-2 border-zinc-200 dark:border-zinc-700 pl-3 py-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">{step.agent_name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      step.step_type === 'thought' ? 'bg-blue-100 text-blue-600' :
                      step.step_type === 'action' ? 'bg-amber-100 text-amber-600' :
                      step.step_type === 'observation' ? 'bg-green-100 text-green-600' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {step.step_type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-3">{step.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex space-x-4 items-center">
          <VoicePushToTalk 
            isListening={isListening}
            isSpeaking={isSpeaking}
            onStart={handleVoiceStart}
            onStop={stopListening}
            disabled={isLoading}
          />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message..."
            className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-zinc-500 outline-none text-zinc-800 dark:text-zinc-200"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
