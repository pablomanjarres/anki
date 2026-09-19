import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadGenerationContext } from '../generation/context.ts';
import type { StudyStore } from '../store/index.ts';
import type { ContextLoader } from './common.ts';
import { registerGenerationTools } from './generation.ts';
import { registerReadingTools } from './reading.ts';
import { registerStudyTools } from './study.ts';

export function createAnkiMcpServer(store: StudyStore, dataDir: string, loadContext: ContextLoader = loadGenerationContext): McpServer {
  const server = new McpServer({ name: 'Anki', version: '0.1.0' });
  const services = { store, dataDir, loadContext };
  registerGenerationTools(server, services);
  registerStudyTools(server, services);
  registerReadingTools(server, services);
  return server;
}
