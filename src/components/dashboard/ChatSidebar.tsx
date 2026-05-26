'use client';

import { dbService } from '@/services/dbService';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SidebarProps {
  currentConversationId?: string;
}

export function ChatSidebar({ currentConversationId }: SidebarProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await dbService.getConversations();
        setConversations(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const createNewChat = async () => {
    try {
      const newChat = await dbService.createConversation('New Chat');
      window.location.href = `/dashboard/chat/${newChat.id}`;
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-64 flex flex-col h-full bg-zinc-50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800">
      <div className="p-4">
        <button
          onClick={createNewChat}
          className="w-full py-3 px-4 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 rounded-xl font-semibold hover:opacity-90 transition-opacity text-sm"
        >
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {isLoading ? (
          <div className="p-4 text-zinc-400 text-xs text-center">Loading chats...</div>
        ) : (
          conversations.map((chat) => (
            <Link
              key={chat.id}
              href={`/dashboard/chat/${chat.id}`}
              className={`block px-4 py-3 rounded-lg text-sm transition-colors ${
                currentConversationId === chat.id
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
              }`}
            >
              <div className="truncate">{chat.title}</div>
              <div className="text-[10px] text-zinc-400 mt-1">
                {new Date(chat.created_at).toLocaleDateString()}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
