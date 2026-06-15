'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface Goal {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  progress_percentage?: number;
  created_at: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  async function fetchGoals() {
    try {
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: supabaseError } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id);
      
      if (supabaseError) {
        setError(supabaseError.message);
      } else {
        setGoals(data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch goals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, any> = {
      active: { variant: 'info', label: 'Active' },
      completed: { variant: 'success', label: 'Completed' },
      paused: { variant: 'warning', label: 'Paused' },
      blocked: { variant: 'danger', label: 'Blocked' },
    };
    return statusMap[status] || { variant: 'default', label: status };
  };

  const getHealthColor = (progress: number = 0) => {
    if (progress >= 70) return 'success';
    if (progress >= 40) return 'warning';
    return 'danger';
  };

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <h1 className="text-3xl font-bold text-rose-400 mb-4">Error Loading Goals</h1>
          <p className="text-zinc-400">{error}</p>
          <Button 
            className="mt-6"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchGoals();
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
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Goals</h1>
            <p className="text-zinc-400 mt-1">Track your objectives and milestones</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Goals List */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : goals.length > 0 ? (
              goals.map((goal) => {
                const status = getStatusBadge(goal.status);
                const health = getHealthColor(goal.progress_percentage ?? 0);
                return (
                  <Card
                    key={goal.id}
                    className={`cursor-pointer transition-all hover:border-zinc-600 ${
                      selectedGoal?.id === goal.id ? 'border-indigo-500' : ''
                    }`}
                    onClick={() => setSelectedGoal(goal)}
                  >
                    <CardContent className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">{goal.title}</h3>
                          {goal.description && (
                            <p className="text-zinc-400 text-sm mt-1">{goal.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <Badge variant={health}>
                            {(goal.progress_percentage ?? 0)}% Complete
                          </Badge>
                        </div>
                      </div>
                      <Progress value={goal.progress_percentage ?? 0} />
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Created {new Date(goal.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-zinc-500">
                  <p className="text-lg">No goals yet</p>
                  <p className="text-sm mt-1">Start by creating your first goal in Jarvis Chat</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Selected Goal Details */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <h2 className="text-lg font-semibold text-white">Goal Details</h2>
              </CardHeader>
              <CardContent>
                {selectedGoal ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-zinc-500 text-sm">Title</p>
                      <p className="text-zinc-200 font-medium">{selectedGoal.title}</p>
                    </div>
                    {selectedGoal.description && (
                      <div>
                        <p className="text-zinc-500 text-sm">Description</p>
                        <p className="text-zinc-400">{selectedGoal.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-zinc-500 text-sm">Progress</p>
                      <div className="mt-2">
                        <Progress value={selectedGoal.progress_percentage ?? 0} />
                        <p className="text-sm text-zinc-400 mt-1">
                          {selectedGoal.progress_percentage ?? 0}% complete
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-zinc-800">
                      <p className="text-zinc-500 text-xs mb-2">Linked Projects</p>
                      <div className="text-zinc-400 text-sm">
                        Coming soon...
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-zinc-500">
                    Select a goal to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
