import { createAdminClient } from '@/lib/supabase-admin';
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { mcpConnectionManager } from './mcpConnectionManager';

/**
 * MCPService manages the Model Context Protocol (MCP) clients.
 * 
 * PHASE Y.1 ACTIVATION:
 * This is now a real client manager that maintains live connections
 * to MCP servers (stdio/sse).
 * 
 * PHASE Y.4 ENHANCEMENT:
 * Delegated connection lifecycle to mcpConnectionManager.
 */
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
          await mcpConnectionManager.getClient(server.name);
          console.log(`MCP Server ${server.name} initialized.`);
        } catch (err) {
          console.error(`Failed to initialize MCP Server ${server.name}:`, err);
        }
      }
    }
  },

  async listTools() {
    return await mcpConnectionManager.listAllTools();
  },

  async callTool(serverName: string, toolName: string, args: any) {
    const client = await mcpConnectionManager.getClient(serverName);
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
