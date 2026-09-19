import os from 'node:os';
import path from 'node:path';

export const dataDir = process.env.ANKI_DATA_DIR ?? path.join(os.homedir(), 'Library', 'Application Support', 'Anki');
export const dbPath = process.env.ANKI_DB_PATH ?? path.join(dataDir, 'study.sqlite');
export const port = Number(process.env.ANKI_PORT ?? 3464);
export const todayBogota = (at = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(at);
