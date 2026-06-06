'use client';

import { useState, useEffect } from 'react';

export function JarvisBriefingCard() {
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBriefing();
  }, []);

  const fetchBriefing = async () => {
    try {
      const res = await fetch('/api/jarvis/briefing');
      const data = await res.json();
      setBriefing(data);
    } catch (err) {
      console.error('Failed to fetch Jarvis briefing:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 animate-pulse bg-zinc-50 dark:bg-zinc-800/50 rounded-xl h-48" />;
  if (!briefing) return null;

  const { project, goal, recommendations } = briefing;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-zinc-900 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1">Jarvis Proactive Briefing</h3>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{project?.name || 'No Active Project'}</h2>
        </div>
        <div className="bg-white dark:bg-zinc-800 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{project?.progress || 0}% Complete</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* STATUS SECTION */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Active Goal</label>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{goal?.title || 'Set a new goal to begin'}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Goal Progress</label>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all duration-500" 
                style={{ width: `${goal?.progress || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* RECOMMENDATIONS SECTION */}
        <div className="bg-white/50 dark:bg-zinc-800/50 rounded-xl p-4 border border-indigo-50 dark:border-indigo-900/30">
          <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-2">Recommended Next Action</label>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-3">
            ✨ {recommendations?.suggested_next_task}
          </p>
          <div className="flex flex-wrap gap-2">
            {recommendations?.suggested_bug_fix && (
              <span className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded border border-red-100 dark:border-red-900/30">
                Fix: {recommendations.suggested_bug_fix}
              </span>
            )}
            {recommendations?.suggested_learning_topic && (
              <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/30">
                Learn: {recommendations.suggested_learning_topic}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
