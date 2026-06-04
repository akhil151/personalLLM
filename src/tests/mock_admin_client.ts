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

  clear() {
    Object.keys(this.storage).forEach(k => this.storage[k] = []);
  }

  from(table: string) {
    if (!this.storage[table]) this.storage[table] = [];
    
    const self = this;
    const chain: any = {
      _table: table,
      _filters: [] as any[],
      _limit: null as number | null,
      _single: false,
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
        console.log(`[MOCK] Inserting into ${table}:`, newRows[0].id);
        self.storage[table].push(...newRows);
        chain._lastData = newRows;
        return chain;
      },
      update: (values: any) => {
        chain._updateValues = values;
        return chain;
      },
      match: (filters: any) => {
        Object.entries(filters).forEach(([col, val]) => chain._filters.push({ type: 'eq', col, val }));
        return chain;
      },
      eq: (col: string, val: any) => {
        chain._filters.push({ type: 'eq', col, val });
        return chain;
      },
      in: (col: string, vals: any[]) => {
        chain._filters.push({ type: 'in', col, vals });
        return chain;
      },
      lt: (col: string, val: any) => {
        chain._filters.push({ type: 'lt', col, val });
        return chain;
      },
      lte: (col: string, val: any) => {
        chain._filters.push({ type: 'lte', col, val });
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
      single: () => {
        chain._single = true;
        return chain;
      },
      then: async (resolve: any) => {
        let data = [...self.storage[table]];
        
        // If we have lastData (from insert), use it instead of full table scan
        if (chain._lastData) {
          data = chain._lastData;
        } else {
          // Apply filters
          for (const f of chain._filters) {
            if (f.type === 'eq') data = data.filter(i => i[f.col] === f.val);
            if (f.type === 'in') data = data.filter(i => f.vals.includes(i[f.col]));
            if (f.type === 'lt') data = data.filter(i => i[f.col] < f.val);
            if (f.type === 'lte') data = data.filter(i => i[f.col] <= f.val);
            if (f.type === 'or') {
              if (f.query.includes('status.eq.queued')) {
                data = data.filter(i => i.status === 'queued' || i.status === 'retrying');
              } else if (f.query.includes('lease_expires_at.lt')) {
                const now = new Date().toISOString();
                data = data.filter(i => !i.lease_owner || i.lease_owner === 'null' || i.lease_expires_at < now);
              }
            }
          }
        }

        // Apply updates
        if (chain._updateValues) {
          if (chain._filters.length > 0 || chain._lastData) {
            console.log(`[MOCK] Updating ${data.length} rows in ${table} with filters:`, JSON.stringify(chain._filters));
            data.forEach(item => Object.assign(item, chain._updateValues));
            // If single() was called, we return one item
            // Actually, we'll return the array and let single() logic (if we had it) handle it
            // But here we just resolve the data
          }
        }

        if (chain._limit && Array.isArray(data)) {
          data = data.slice(0, chain._limit);
        }

        // Simulate .single() behavior
        if (chain._single) {
          resolve({ data: data.length > 0 ? data[0] : null, error: data.length > 0 ? null : { message: 'Not found', code: 'PGRST116' } });
        } else {
          resolve({ data, error: null });
        }
      }
    };
    return chain;
  }
}

const mockInstance = new MockSupabaseClient();
export const createAdminClient = () => mockInstance;
