'use client';

import { useState } from 'react';
import { messageService } from '@/services/messageService';

/**
 * The Home component serves as our main entry point for the message test.
 * We use 'use client' because this component handles user interaction and state.
 */
export default function Home() {
  // --- STATE MANAGEMENT ---
  // content: holds the current text in the input box.
  const [content, setContent] = useState('');
  // isLoading: tracks whether a database request is in progress.
  const [isLoading, setIsLoading] = useState(false);
  // message: used to display success or error feedback to the user.
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /**
   * handleSubmit manages the full flow of sending a message.
   * Flow: User Input -> State -> Service -> Supabase -> UI Feedback
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent empty submissions
    if (!content.trim()) return;

    // Start loading state
    setIsLoading(true);
    setMessage(null);

    try {
      // Internal Flow:
      // 1. UI triggers messageService.saveMessage()
      // 2. Service calls Supabase SDK
      // 3. SDK sends HTTPS POST request to Supabase API
      // 4. Supabase inserts into PostgreSQL
      await messageService.saveMessage(content);
      
      // Success feedback
      setMessage({ type: 'success', text: 'Message saved successfully!' });
      setContent(''); // Clear the input
    } catch (error) {
      // Error handling:
      // If the request fails (e.g., network error, DB constraint), we catch it here.
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    } finally {
      // Always stop loading, regardless of success or failure.
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 dark:bg-zinc-950">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-50">
          AI Assistant Platform
        </h1>
        <p className="text-zinc-500 mb-8 dark:text-zinc-400">
          Foundation Setup: Message Saving Test
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="message" 
              className="block text-sm font-medium text-zinc-700 mb-1 dark:text-zinc-300"
            >
              Message Content
            </label>
            <input
              id="message"
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type something..."
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !content.trim()}
            className="w-full bg-zinc-900 text-white py-2 rounded-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-out dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isLoading ? 'Saving...' : 'Send Message'}
          </button>
        </form>

        {/* FEEDBACK UI */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
              : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
          }`}>
            {message.text}
          </div>
        )}
      </div>
      
      <div className="mt-8 text-sm text-zinc-400 text-center max-w-sm">
        <p>This test verifies the connection between the frontend, the Supabase SDK, and your PostgreSQL database.</p>
      </div>
    </div>
  );
}
