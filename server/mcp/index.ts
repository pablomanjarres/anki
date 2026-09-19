import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { dataDir, dbPath } from '../config.ts';
import { openStudyStore } from '../store/index.ts';
import { createAnkiMcpServer } from './server.ts';

async function main(): Promise<void> {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const store = openStudyStore(dbPath);
  const server = createAnkiMcpServer(store, dataDir);
  await server.connect(new StdioServerTransport());
  process.once('SIGTERM', () => { store.close(); process.exit(0); });
  process.once('SIGINT', () => { store.close(); process.exit(0); });
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
