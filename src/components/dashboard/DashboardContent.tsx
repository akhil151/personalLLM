'use client';

import { useState } from 'react';
import { MessageForm } from './MessageForm';
import { MessageList } from './MessageList';
import { JarvisDashboard } from './JarvisDashboard';

export function DashboardContent() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleMessageSaved = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <JarvisDashboard />
      <MessageForm onMessageSaved={handleMessageSaved} />
      <MessageList refreshTrigger={refreshTrigger} />
    </div>
  );
}
