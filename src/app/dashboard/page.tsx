'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';

interface DashboardData {
  executiveBrief: {
    currentFocus: string;
    highestPriorityGoal: any;
    highestPriorityProject: any;
    nextBestAction: any;
    activeBlockers: any[];
    dailyProgressSummary: any;
  };
  goals: any[];
  projects: any[];
  tasks: any;
  recommendations: any[];
  blockers: any[];
  metrics: {
    activeGoals: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    blockedCount: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/jarvis/dashboard');
        const dashboardData = await res.json();
        if (dashboardData.error) {
          setError(dashboardData.error);
        } else {
          setData(dashboardData);
        }
      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <h1 className="text-3xl font-bold text-rose-400 mb-4">Error Loading Dashboard</h1>
          <p className="text-zinc-400">{error}</p>
          <Button 
            className="mt-6"
            onClick={() => {
              setError(null);
              setLoading(true);
              // Refetch data
              (async () => {
                try {
                  const res = await fetch('/api/jarvis/dashboard');
                  const dashboardData = await res.json();
                  if (dashboardData.error) {
                    setError(dashboardData.error);
                  } else {
                    setData(dashboardData);
                  }
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              })();
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
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Executive Dashboard</h1>
            <p className="text-zinc-400 mt-1">Welcome back. Here's your intelligence summary.</p>
          </div>
        </div>

        {/* Executive Brief Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Executive Brief</h2>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Current Focus</h3>
                    <p className="text-lg text-zinc-200">{data?.executiveBrief?.currentFocus || 'No focus set'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Highest Priority Goal</h3>
                      <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                        <p className="text-zinc-200 font-medium">{data?.executiveBrief?.highestPriorityGoal?.title || 'No active goal'}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Highest Priority Project</h3>
                      <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                        <p className="text-zinc-200 font-medium">{data?.executiveBrief?.highestPriorityProject?.title || 'No active project'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Recommended Action</h3>
                    <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-4">
                      <p className="text-indigo-300">{data?.executiveBrief?.nextBestAction?.nextAction || 'No action recommended'}</p>
                      <p className="text-xs text-indigo-400 mt-1">{data?.executiveBrief?.nextBestAction?.reason}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Active Risks</h3>
                    {data?.executiveBrief?.activeBlockers && data.executiveBrief.activeBlockers.length > 0 ? (
                      <div className="space-y-2">
                        {data.executiveBrief.activeBlockers.map((blocker, i) => (
                          <div key={i} className="bg-rose-900/20 border border-rose-800 rounded-lg p-3">
                            <p className="text-rose-300 text-sm">{typeof blocker === 'string' ? blocker : blocker.description || 'Unknown blocker'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
                        <p className="text-emerald-400 text-sm">No active blockers</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metrics Cards */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-white">Key Metrics</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ))
                ) : (
                  <>
                    <div>
                      <p className="text-zinc-500 text-sm">Active Goals</p>
                      <p className="text-2xl font-bold text-white">{data?.metrics?.activeGoals ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm">Active Projects</p>
                      <p className="text-2xl font-bold text-white">{data?.metrics?.activeProjects ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm">Total Tasks</p>
                      <p className="text-2xl font-bold text-white">{data?.metrics?.totalTasks ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm">Blockers</p>
                      <p className="text-2xl font-bold text-rose-400">{data?.metrics?.blockedCount ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm mb-1">Completion Rate</p>
                      <Progress value={data?.metrics?.totalTasks && data.metrics.totalTasks > 0 ? (data.metrics.completedTasks / data.metrics.totalTasks) * 100 : 0} />
                      <p className="text-sm text-zinc-400 mt-1">
                        {data?.metrics?.completedTasks ?? 0} of {data?.metrics?.totalTasks ?? 0} completed
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recommendations & Risks Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recommendation Feed */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Recommendations</h2>
            </CardHeader>
            <CardContent>
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="space-y-2 mb-4">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))
              ) : data?.recommendations && data.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {data.recommendations.map((rec, i) => (
                  <div key={i} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-zinc-200">{rec.title || rec.description}</h4>
                      <div className="flex gap-2">
                        <Badge variant={rec.urgency === 'High' ? 'danger' : rec.urgency === 'Medium' ? 'warning' : 'success'}>
                          {rec.urgency || 'Medium'}
                        </Badge>
                        <Badge variant="info">{rec.impact || 'Medium'}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400">{rec.reason || rec.description}</p>
                  </div>
                ))}
              </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  No recommendations yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Panel */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Risk Panel</h2>
            </CardHeader>
            <CardContent>
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="space-y-2 mb-4">
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))
              ) : data?.blockers && data.blockers.length > 0 ? (
                <div className="space-y-4">
                  {data.blockers.map((blocker, i) => (
                    <div key={i} className="bg-rose-900/10 border border-rose-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                      <Badge variant="danger">Critical</Badge>
                      </div>
                      <p className="text-rose-300">{typeof blocker === 'string' ? blocker : blocker.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-emerald-400">
                  <p className="text-lg">All Clear</p>
                  <p className="text-sm">No active risks</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
