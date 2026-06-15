'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';

interface ExecutiveBriefData {
  goal_summary?: string;
  progress_percentage?: number;
  active_projects_count?: number;
  highest_priority?: string;
  priority_reason?: string;
  next_recommended_action?: string;
  blocked_items?: string[];
}

export default function BriefPage() {
  const [brief, setBrief] = useState<ExecutiveBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBrief();
  }, []);

  async function fetchBrief() {
    try {
      setError(null);
      const res = await fetch('/api/jarvis/briefing');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setBrief(data);
    } catch (err: any) {
      console.error('Failed to fetch brief:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <h1 className="text-3xl font-bold text-rose-400 mb-4">Error Loading Briefing</h1>
          <p className="text-zinc-400">{error}</p>
          <Button 
            className="mt-6"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchBrief();
            }}
          >
            Retry
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-white mb-2">{getGreeting()}</h1>
          <p className="text-zinc-400">Here's your daily executive briefing</p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <Card>
              <CardContent className="py-8">
                <Skeleton className="h-8 w-3/4 mx-auto mb-4" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-8">
                <Skeleton className="h-6 w-full mb-4" />
                <Skeleton className="h-6 w-3/4" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Focus */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-white">Today's Focus</h2>
              </CardHeader>
              <CardContent>
                <p className="text-xl text-zinc-200">{brief?.goal_summary || 'No active focus'}</p>
              </CardContent>
            </Card>

            {/* Priority */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-white">Top Priority</h2>
              </CardHeader>
              <CardContent>
                <p className="text-xl text-zinc-200 mb-2">{brief?.highest_priority || 'No priority set'}</p>
                {brief?.priority_reason && (
                  <p className="text-zinc-400">{brief.priority_reason}</p>
                )}
              </CardContent>
            </Card>

            {/* Risk */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-white">Active Risks</h2>
              </CardHeader>
              <CardContent>
                {brief?.blocked_items && brief.blocked_items.length > 0 ? (
                  <div className="space-y-2">
                    {brief.blocked_items.map((item, i) => (
                      <div
                        key={i}
                        className="bg-rose-900/20 border border-rose-800 rounded-lg p-3"
                      >
                        <Badge variant="danger" className="mb-2">Risk</Badge>
                        <p className="text-rose-300">{item}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-emerald-400">
                    <p className="text-lg">No active risks</p>
                    <p className="text-sm">Everything is on track</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommended Action */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-white">Recommended Action</h2>
              </CardHeader>
              <CardContent>
                <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-4">
                  <p className="text-xl text-indigo-300">{brief?.next_recommended_action || 'Continue your current work'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Metrics */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-white">Progress Overview</h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-white">{brief?.progress_percentage || 0}%</p>
                    <p className="text-zinc-400 text-sm">Overall Progress</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-white">{brief?.active_projects_count || 0}</p>
                    <p className="text-zinc-400 text-sm">Active Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
