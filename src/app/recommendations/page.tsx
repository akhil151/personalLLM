'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useState, useEffect } from 'react';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  reason?: string;
  impact?: string;
  urgency?: string;
  goal_id?: string;
  status?: string;
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  async function fetchRecommendations() {
    try {
      setError(null);
      const res = await fetch('/api/jarvis/dashboard');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setRecommendations(data.recommendations || []);
    } catch (err: any) {
      console.error('Failed to fetch recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getUrgencyVariant = (urgency?: string) => {
    const map: Record<string, any> = {
      High: 'danger',
      Medium: 'warning',
      Low: 'success'
    };
    return map[urgency || 'Medium'];
  };

  const getImpactVariant = (impact?: string) => {
    const map: Record<string, any> = {
      High: 'danger',
      Medium: 'info',
      Low: 'success'
    };
    return map[impact || 'Medium'];
  };

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <h1 className="text-3xl font-bold text-rose-400 mb-4">Error Loading Recommendations</h1>
          <p className="text-zinc-400">{error}</p>
          <Button 
            className="mt-6"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchRecommendations();
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
            <h1 className="text-3xl font-bold text-white">Recommendations</h1>
            <p className="text-zinc-400 mt-1">Jarvis's suggestions to keep you on track</p>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))
          ) : recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <Card key={rec.id || index}>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-white">{rec.title || rec.description}</h3>
                        <Badge variant={getUrgencyVariant(rec.urgency)}>
                          Urgency: {rec.urgency || 'Medium'}
                        </Badge>
                        <Badge variant={getImpactVariant(rec.impact)}>
                          Impact: {rec.impact || 'Medium'}
                        </Badge>
                      </div>
                      <p className="text-zinc-400">{rec.reason || rec.description}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button variant="primary" size="sm">
                        Mark Complete
                      </Button>
                      <Button variant="ghost" size="sm">
                        Save for Later
                      </Button>
                      <Button variant="ghost" size="sm">
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-zinc-500">
                <p className="text-lg">No recommendations</p>
                <p className="text-sm mt-1">Jarvis will surface suggestions as you make progress</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
