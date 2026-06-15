'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  progress_percentage?: number;
  goal_id?: string;
  milestones?: any[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: supabaseError } = await supabase
        .from('user_projects')
        .select('*, milestones:project_milestones(*)')
        .eq('user_id', user.id);
      
      if (supabaseError) {
        setError(supabaseError.message);
      } else {
        setProjects(data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedProjects(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, any> = {
      active: { variant: 'info', label: 'Active' },
      completed: { variant: 'success', label: 'Completed' },
      paused: { variant: 'warning', label: 'Paused' },
      blocked: { variant: 'danger', label: 'Blocked' },
    };
    return statusMap[status] || { variant: 'default', label: status };
  };

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <h1 className="text-3xl font-bold text-rose-400 mb-4">Error Loading Projects</h1>
          <p className="text-zinc-400">{error}</p>
          <Button 
            className="mt-6"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchProjects();
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
            <h1 className="text-3xl font-bold text-white">Projects</h1>
            <p className="text-zinc-400 mt-1">Manage your project timelines and milestones</p>
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))
          ) : projects.length > 0 ? (
            projects.map((project) => {
              const status = getStatusBadge(project.status);
              const isExpanded = expandedProjects.has(project.id);
              return (
                <Card key={project.id}>
                  <CardContent className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{project.title}</h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        {project.description && (
                          <p className="text-zinc-400 text-sm">{project.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => toggleExpand(project.id)}
                        className="shrink-0"
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </Button>
                    </div>

                    <Progress value={project.progress_percentage ?? 0} />

                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-zinc-800">
                        <h4 className="text-sm font-medium text-zinc-300 mb-4">Milestones</h4>
                        {project.milestones && project.milestones.length > 0 ? (
                          <div className="space-y-3">
                            {project.milestones.map((milestone) => (
                              <div
                                key={milestone.id}
                                className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-zinc-200">{milestone.title}</h5>
                                  <Badge variant={milestone.status === 'completed' ? 'success' : 'warning'}>
                                    {milestone.status || 'Pending'}
                                  </Badge>
                                </div>
                                {milestone.description && (
                                  <p className="text-zinc-400 text-sm mb-2">{milestone.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-zinc-500 text-sm">No milestones yet</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-zinc-500">
                <p className="text-lg">No projects yet</p>
                <p className="text-sm mt-1">Start by creating a project in Jarvis Chat</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
