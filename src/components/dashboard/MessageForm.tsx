'use client';

import { useState } from 'react';
import { messageService } from '@/services/messageService';

interface MessageFormProps {
  onMessageSaved: () => void;
}

export function MessageForm({ onMessageSaved }: MessageFormProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await messageService.saveMessage(content);
      setContent('');
      onMessageSaved(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to save message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8">
      <h2 className="text-lg font-semibold mb-4 dark:text-zinc-50">Send a New Message</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !content.trim()}
          className="w-full bg-zinc-900 text-white py-2 rounded-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isLoading ? 'Saving...' : 'Save Message'}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
