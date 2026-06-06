'use client';

import { useState, useEffect } from 'react';

export function JarvisPersonalBriefing() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersonalBriefing();
  }, []);

  const fetchPersonalBriefing = async () => {
    try {
      const res = await fetch('/api/jarvis/personal-briefing');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch personal briefing:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 animate-pulse bg-zinc-50 dark:bg-zinc-800/50 rounded-xl h-64" />;
  if (!data) return null;

  const { context, recommendations, behavior, profile } = data;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center uppercase tracking-wider">
          <span className="mr-2">👤</span> Personal Intelligence
        </h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* USER PROFILE SECTION */}
          <div className="space-y-4">
            <div>
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Current Focus</h3>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{context.current_focus}</p>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Learning Journey</h3>
              <div className="flex flex-wrap gap-1">
                {context.learning?.map((goal: string, i: number) => (
                  <span key={i} className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30">
                    {goal}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Career Objective</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">"{context.career_goal}"</p>
            </div>
          </div>

          {/* RECOMMENDATIONS SECTION */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Personalized Recommendations</h3>
            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/20">
              <div className="mb-3">
                <label className="text-[9px] font-bold text-indigo-400 uppercase block mb-1">Next Learning Topic</label>
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{recommendations?.next_learning_topic}</p>
              </div>
              <div className="mb-3">
                <label className="text-[9px] font-bold text-indigo-400 uppercase block mb-1">Career Analysis</label>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{recommendations?.skill_gap_analysis}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {recommendations?.suggested_actions?.map((action: string, i: number) => (
                  <span key={i} className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center">
                    <span className="mr-1">→</span> {action}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* BEHAVIORAL INSIGHTS SECTION */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Behavioral Insights</h3>
            <div className="space-y-3">
              {behavior?.map((b: any, i: number) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  <div>
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{b.pattern_value.label}</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{b.pattern_value.description || 'Pattern detected from your activity history.'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
