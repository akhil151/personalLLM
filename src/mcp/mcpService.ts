import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { createAdminClient } from '@/lib/supabase-admin';
import { 
  ListToolsResultSchema, 
  CallToolResultSchema 
} from "@modelcontextprotocol/sdk/types.js";

/**
 * MCPService manages the Model Context Protocol (MCP) clients.
 * 
 * PHASE Y.1 ACTIVATION:
 * This is now a real client manager that maintains live connections
 * to MCP servers (stdio/sse).
 */
class MCPConnectionManager {
  private clients: Map<string, Client> = new Map();

  async getClient(serverName: string): Promise<Client> {
    if (this.clients.has(serverName)) {
      return this.clients.get(serverName)!;
    }

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
    
    // Handle disconnects
    client.onclose = () => {
      console.warn(`MCP Server ${serverName} disconnected.`);
      this.clients.delete(serverName);
    };

    return client;
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
        allTools.push(...result.tools.map(t => ({ ...t, server: server.name })));
      } catch (err) {
        console.error(`Failed to list tools for ${server.name}:`, err);
      }
    }
    return allTools;
  }
}

const manager = new MCPConnectionManager();

export const mcpService = {
  async initializeServers() {
    const supabase = createAdminClient();
    const { data: servers } = await supabase
      .from('mcp_servers')
      .select('name')
      .eq('is_active', true);

    if (servers) {
      for (const server of servers) {
        try {
          await manager.getClient(server.name);
          console.log(`MCP Server ${server.name} initialized.`);
        } catch (err) {
          console.error(`Failed to initialize MCP Server ${server.name}:`, err);
        }
      }
    }
  },

  async listTools() {
    return await manager.listAllTools();
  },

  async callTool(serverName: string, toolName: string, args: any) {
    const client = await manager.getClient(serverName);
    const result = await client.request(
      {
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        }
      },
      CallToolResultSchema
    );

    return result;
  }
};
