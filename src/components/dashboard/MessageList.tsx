'use client';

import { useEffect, useState, useCallback } from 'react';
import { messageService } from '@/services/messageService';

interface Message {
  id: string;
  content: string;
  created_at: string;
}

export function MessageList({ refreshTrigger }: { refreshTrigger: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await messageService.getUserMessages();
      setMessages(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages, refreshTrigger]);

  if (isLoading && messages.length === 0) {
    return <div className="text-center py-8 text-zinc-500">Loading messages...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800">
        <p className="text-zinc-500">No messages found. Start by sending one above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold dark:text-zinc-50">Your Messages</h2>
      {messages.map((msg) => (
        <div 
          key={msg.id} 
          className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm"
        >
          <p className="text-zinc-800 dark:text-zinc-200">{msg.content}</p>
          <span className="text-xs text-zinc-400 mt-2 block">
            {new Date(msg.created_at).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
