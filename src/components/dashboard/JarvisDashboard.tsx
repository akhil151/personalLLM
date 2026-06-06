'use client';

import { useState, useEffect } from 'react';
import { JarvisBriefingCard } from './JarvisBriefingCard';
import { JarvisPersonalBriefing } from './JarvisPersonalBriefing';

export function JarvisDashboard() {
  const [state, setState] = useState<any>(null);
  const [reflections, setReflections] = useState<any[]>([]);
  const [command, setCommand] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showReflections, setShowReflections] = useState(false);

  useEffect(() => {
    fetchState();
    fetchReflections();
  }, []);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/jarvis');
      const data = await res.json();
      setState(data);
    } catch (err) {
      console.error('Failed to fetch Jarvis state:', err);
    }
  };

  const fetchReflections = async () => {
    try {
      const res = await fetch('/api/jarvis/reflections');
      const data = await res.json();
      setReflections(data);
    } catch (err) {
      console.error('Failed to fetch reflections:', err);
    }
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      const data = await res.json();
      setResult(data);
      setCommand('');
    } catch (err) {
      console.error('Failed to run Jarvis command:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!state) return <div className="p-4 text-zinc-500">Loading Jarvis...</div>;

  return (
    <div className="space-y-6 mb-8">
      {/* 1. PERSONAL INTELLIGENCE BRIEFING */}
      <JarvisPersonalBriefing />

      {/* 2. PROACTIVE PROJECT BRIEFING */}
      <JarvisBriefingCard />

      {/* 3. COMMAND CENTER */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center uppercase tracking-wider">
            <span className="mr-2">⚡</span> Command Center
          </h2>
          <button 
            onClick={() => setShowReflections(!showReflections)}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            {showReflections ? 'Hide Reflections' : `View Reflections (${reflections.length})`}
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT: QUICK STATS */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Session Summary</label>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed italic">
                  "{state.last_session_summary}"
                </p>
              </div>
              <div className="flex space-x-4">
                <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Open Issues</label>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">2</span>
                </div>
                <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Runs</label>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{reflections.length}</span>
                </div>
              </div>
            </div>

            {/* RIGHT: COMMAND INPUT */}
            <div className="flex flex-col space-y-4">
              <form onSubmit={handleCommand} className="flex flex-col space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Natural Language Commands</label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Ask Jarvis to 'check status'..."
                    className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? '...' : 'Send'}
                  </button>
                </div>
              </form>

              {/* COMMAND RESULT */}
              {result && (
                <div className={`p-4 rounded-xl border ${
                  result.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                }`}>
                  <p className="text-sm font-medium mb-1">{result.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* REFLECTIONS LIST (COLLAPSIBLE) */}
          {showReflections && reflections.length > 0 && (
            <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Execution Reflections</label>
              <div className="space-y-3">
                {reflections.map((r) => (
                  <div key={r.id} className="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Reflection for Run {r.run_id.slice(0, 8)}</span>
                      <span className="text-[10px] text-zinc-400">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed">{r.what_happened}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-green-500 uppercase block mb-1">Success</label>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{r.what_succeeded}</p>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-indigo-500 uppercase block mb-1">Next Action</label>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{r.next_steps}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
