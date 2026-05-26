'use client';

import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages: any[];
}

export function ChatInterface({ conversationId, initialMessages }: ChatInterfaceProps) {
  // useChat is a powerful hook from the 'ai' library.
  // It handles the streaming state, input state, and submission logic automatically.
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { conversationId },
    initialMessages: initialMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })),
  });

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* MESSAGE AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Start a conversation below!</p>
          </div>
        )}
        
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] p-4 rounded-2xl ${
              m.role === 'user' 
                ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900' 
                : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl animate-pulse">
              <div className="h-4 w-12 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="relative">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me anything..."
            className="w-full px-6 py-4 pr-16 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 outline-none dark:text-zinc-100"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 bottom-2 px-4 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
