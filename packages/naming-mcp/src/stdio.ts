#!/usr/bin/env node
/**
 * stdio transport entry — this is what Claude Desktop / Cursor / Cline spawn.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './mcp.js';

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Keep the process alive; server lifecycle is driven by the MCP client.
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[shunshi-naming-mcp] fatal:', err);
  process.exit(1);
});
