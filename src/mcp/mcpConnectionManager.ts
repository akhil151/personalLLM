import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { createAdminClient } from '../lib/supabase-admin';
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

/**
 * MCPConnectionManager handles the lifecycle of MCP connections.
 * 
 * Features:
 * - Connection pooling
 * - Heartbeat (periodically list tools)
 * - Automatic reconnection
 * - Stale session cleanup
 */
export class MCPConnectionManager {
  private static instance: MCPConnectionManager;
  private clients: Map<string, Client> = new Map();
  private heartbeats: Map<string, NodeJS.Timeout> = new Map();
  private readonly HEARTBEAT_INTERVAL = 60000; // 1 minute

  private constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupStaleSessions(), 300000); // 5 minutes
  }

  public static getInstance(): MCPConnectionManager {
    if (!MCPConnectionManager.instance) {
      MCPConnectionManager.instance = new MCPConnectionManager();
    }
    return MCPConnectionManager.instance;
  }

  async getClient(serverName: string): Promise<Client> {
    if (this.clients.has(serverName)) {
      const client = this.clients.get(serverName)!;
      return client;
    }

    return await this.connect(serverName);
  }

  private async connect(serverName: string, retryCount = 0): Promise<Client> {
    const MAX_RETRIES = 3;
    
    try {
      const supabase = createAdminClient();
      const { data: server, error } = await supabase
        .from('mcp_servers')
        .select('*')
        .eq('name', serverName)
        .single();

      if (error || !server) throw new Error(`MCP Server ${serverName} not found in DB`);

      const client = new Client(
        { name: "ai-platform-client", version: "1.0.0" },
        { capabilities: {} }
      );

      let transport;
      if (server.transport_type === 'stdio') {
        transport = new StdioClientTransport({
          command: server.command,
          args: server.args || [],
          env: { ...process.env, ...server.env }
        });
      } else {
        transport = new SSEClientTransport(new URL(server.url));
      }

      await client.connect(transport);
      this.clients.set(serverName, client);
      
      // Setup heartbeat
      this.setupHeartbeat(serverName, client);

      // Handle disconnects
      client.onclose = () => {
        console.warn(`MCP Server ${serverName} disconnected. Attempting reconnect...`);
        this.handleDisconnect(serverName);
      };

      return client;
    } catch (err) {
      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.warn(`Failed to connect to MCP ${serverName}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.connect(serverName, retryCount + 1);
      }
      throw err;
    }
  }

  private setupHeartbeat(serverName: string, client: Client) {
    if (this.heartbeats.has(serverName)) {
      clearInterval(this.heartbeats.get(serverName));
    }

    const interval = setInterval(async () => {
      try {
        // Simple heartbeat: request tools list
        await client.request(
          { method: "tools/list" },
          ListToolsResultSchema
        );
      } catch (err) {
        console.error(`Heartbeat failed for MCP ${serverName}:`, err);
        this.handleDisconnect(serverName);
      }
    }, this.HEARTBEAT_INTERVAL);

    this.heartbeats.set(serverName, interval);
  }

  private handleDisconnect(serverName: string) {
    this.clients.delete(serverName);
    const hb = this.heartbeats.get(serverName);
    if (hb) {
      clearInterval(hb);
      this.heartbeats.delete(serverName);
    }
    
    // Proactive reconnect attempt
    this.connect(serverName).catch(err => {
      console.error(`Proactive reconnect failed for ${serverName}:`, err.message);
    });
  }

  private cleanupStaleSessions() {
    // In a more complex implementation, we'd track last activity time
    // For now, we just ensure no orphaned heartbeats exist without clients
    for (const [serverName, _] of this.heartbeats) {
      if (!this.clients.has(serverName)) {
        clearInterval(this.heartbeats.get(serverName));
        this.heartbeats.delete(serverName);
      }
    }
  }

  async listAllTools() {
    const supabase = createAdminClient();
    const { data: servers } = await supabase
      .from('mcp_servers')
      .select('name')
      .eq('is_active', true);

    if (!servers) return [];

    const allTools = [];
    for (const server of servers) {
      try {
        const client = await this.getClient(server.name);
        const result = await client.request(
          { method: "tools/list" },
          ListToolsResultSchema
        );
        allTools.push(...result.tools.map((t: any) => ({ ...t, server: server.name })));
      } catch (err) {
        console.error(`Failed to list tools for ${server.name}:`, err);
      }
    }
    return allTools;
  }
}

export const mcpConnectionManager = MCPConnectionManager.getInstance();
