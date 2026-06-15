'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  estimated_effort?: number;
  due_date?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [milestoneTasks, agentTasks] = await Promise.all([
        supabase.from('milestone_tasks').select('*'),
        supabase.from('agent_tasks').select('*')
      ]);
      
      if (milestoneTasks.error || agentTasks.error) {
        setError(milestoneTasks.error?.message || agentTasks.error?.message || 'Failed to fetch tasks');
        return;
      }
      
      const allTasks = [
        ...(milestoneTasks.data || []),
        ...(agentTasks.data || [])
      ];
      setTasks(allTasks);
    } catch (err: any) {
      console.error('Failed to fetch tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    try {
      const supabase = createClient();
      // Try to update both tables
      await Promise.all([
        supabase.from('milestone_tasks').update({ status: newStatus }).eq('id', taskId),
        supabase.from('agent_tasks').update({ status: newStatus }).eq('id', taskId)
      ]);
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  const getPriorityVariant = (priority: string) => {
    const map: Record<string, any> = {
      high: 'danger',
      medium: 'warning',
      low: 'success'
    };
    return map[priority?.toLowerCase() || 'medium'];
  };

  const getStatusVariant = (status: string) => {
    const map: Record<string, any> = {
      completed: 'success',
      in_progress: 'info',
      blocked: 'danger',
      pending: 'warning'
    };
    return map[status?.toLowerCase() || 'pending'];
  };

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <h1 className="text-3xl font-bold text-rose-400 mb-4">Error Loading Tasks</h1>
          <p className="text-zinc-400">{error}</p>
          <Button 
            className="mt-6"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchTasks();
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
            <h1 className="text-3xl font-bold text-white">Tasks</h1>
            <p className="text-zinc-400 mt-1">Organize and complete your tasks</p>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : tasks.length > 0 ? (
            tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                        <Badge variant={getPriorityVariant(task.priority || '')}>
                          {(task.priority || 'Medium').toUpperCase()}
                        </Badge>
                        <Badge variant={getStatusVariant(task.status)}>
                          {(task.status || 'Pending').toUpperCase()}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-zinc-400 text-sm">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                        {task.estimated_effort && (
                          <span>Effort: {task.estimated_effort}h</span>
                        )}
                        {task.due_date && (
                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {task.status !== 'completed' && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                        >
                          Complete
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'in_progress')}
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-zinc-500">
                <p className="text-lg">No tasks yet</p>
                <p className="text-sm mt-1">Tasks will appear here as Jarvis creates them</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
