'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { createAdminClient } from '@/lib/supabase-admin';

interface ObservabilityData {
  agentRuns: any[];
  providerStats: any;
  errors: any[];
}

export default function ObservabilityPage() {
  const [data, setData] = useState<ObservabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchObservabilityData();
  }, []);

  async function fetchObservabilityData() {
    try {
      setError(null);
      // This is a placeholder - in a real implementation you'd fetch from your observability tables
      setData({
        agentRuns: [],
        providerStats: {
          ollama: { calls: 0, errors: 0 },
          groq: { calls: 0, errors: 0, failovers: 0 }
        },
        errors: []
      });
    } catch (err: any) {
      console.error('Failed to fetch observability data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <h1 className="text-3xl font-bold text-rose-400 mb-4">Error Loading Observability Data</h1>
          <p className="text-zinc-400">{error}</p>
          <Button 
            className="mt-6"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchObservabilityData();
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
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Observability</h1>
          <p className="text-zinc-400 mt-1">Monitor system health and performance</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-zinc-500 text-sm mb-2">Agent Runs</p>
              <p className="text-3xl font-bold text-white">
                {loading ? <Skeleton className="h-8 w-16 mx-auto inline-block" /> : 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-zinc-500 text-sm mb-2">Ollama Calls</p>
              <p className="text-3xl font-bold text-white">
                {loading ? <Skeleton className="h-8 w-16 mx-auto inline-block" /> : 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-zinc-500 text-sm mb-2">Groq Failovers</p>
              <p className="text-3xl font-bold text-amber-400">
                {loading ? <Skeleton className="h-8 w-16 mx-auto inline-block" /> : 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-zinc-500 text-sm mb-2">Errors</p>
              <p className="text-3xl font-bold text-rose-400">
                {loading ? <Skeleton className="h-8 w-16 mx-auto inline-block" /> : 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Provider Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Ollama Metrics</h2>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="space-y-2 text-zinc-400">
                  <p>Status: <Badge variant="success">Online</Badge></p>
                  <p>Calls: {data?.providerStats?.ollama?.calls || 0}</p>
                  <p>Errors: {data?.providerStats?.ollama?.errors || 0}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Groq Metrics</h2>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="space-y-2 text-zinc-400">
                  <p>Status: <Badge variant="success">Online</Badge></p>
                  <p>Calls: {data?.providerStats?.groq?.calls || 0}</p>
                  <p>Errors: {data?.providerStats?.groq?.errors || 0}</p>
                  <p>Failovers: {data?.providerStats?.groq?.failovers || 0}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Recent Errors</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="space-y-2 mb-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))
            ) : (data?.errors && data.errors.length > 0) ? (
              <div className="space-y-3">
                {data.errors.map((error, i) => (
                  <div key={i} className="bg-rose-900/20 border border-rose-800 rounded-lg p-4">
                    <p className="text-rose-300">{error.message}</p>
                    <p className="text-zinc-500 text-xs mt-1">{new Date(error.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-emerald-400">
                <p className="text-lg">No recent errors</p>
                <p className="text-sm">System is running smoothly</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
