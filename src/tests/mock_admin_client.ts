import crypto from 'crypto';

class MockSupabaseClient {
  private storage: Record<string, any[]> = {
    agent_runs: [],
    agent_tasks: [],
    background_jobs: [],
    workflow_snapshots: [],
    execution_steps: [],
    conversations: [],
    agent_memories: [],
    mcp_servers: [],
    voice_sessions: [],
    token_usage: []
  };

  from(table: string) {
    if (!this.storage[table]) this.storage[table] = [];
    
    const chain: any = {
      _table: table,
      _filters: [] as any[],
      _limit: null as number | null,
      _lastData: null as any[] | null,
      _updateValues: null as any,

      select: (query: string = '*') => chain,
      insert: (input: any | any[]) => {
        const rows = Array.isArray(input) ? input : [input];
        const newRows = rows.map(r => ({ 
          id: crypto.randomUUID(), 
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString(),
          next_run_at: new Date(Date.now() - 1000).toISOString(), // Default for jobs
          attempts: 0,
          ...r 
        }));
        this.storage[table].push(...newRows);
        chain._lastData = newRows;
        return chain;
      },
      update: (values: any) => {
        chain._updateValues = values;
        return chain;
      },
      eq: (col: string, val: any) => {
        chain._filters.push({ type: 'eq', col, val });
        return chain;
      },
      lt: (col: string, val: any) => {
        chain._filters.push({ type: 'lt', col, val });
        return chain;
      },
      or: (query: string) => {
        chain._filters.push({ type: 'or', query });
        return chain;
      },
      order: (col: string, opt: any) => chain,
      limit: (n: number) => {
        chain._limit = n;
        return chain;
      },
      single: async () => {
        const { data } = await chain;
        const result = Array.isArray(data) ? data[0] : data;
        return { data: result || null, error: result ? null : { message: 'Not found', code: 'PGRST116' } };
      },
      then: async (resolve: any) => {
        let data = [...this.storage[table]];
        
        // Apply filters
        for (const f of chain._filters) {
          if (f.type === 'eq') data = data.filter(i => i[f.col] === f.val);
          if (f.type === 'lt') data = data.filter(i => i[f.col] < f.val);
          if (f.type === 'or') {
            // Simplified OR for background_jobs
            if (f.query.includes('status.eq.queued')) {
              data = data.filter(i => i.status === 'queued' || i.status === 'retrying');
            }
          }
        }

        // MOCK RLS: If we are not Admin, filter by current user
        if (process.env.MOCK_RLS_USER_ID) {
          data = data.filter(i => !i.user_id || i.user_id === process.env.MOCK_RLS_USER_ID);
        }

        // Apply updates
        if (chain._updateValues) {
          // If we have filters, update those items
          if (chain._filters.length > 0) {
            data.forEach(item => Object.assign(item, chain._updateValues));
            data = data.length > 0 ? data[0] : null; // update usually returns the updated items
          }
        }

        if (chain._limit && Array.isArray(data)) {
          data = data.slice(0, chain._limit);
        }

        resolve({ data, error: null });
      }
    };
    return chain;
  }
}

const mockInstance = new MockSupabaseClient();
export const createAdminClient = () => mockInstance;
