import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { dataDir, dbPath, todayBogota } from '../config.ts';
import { openStudyStore, type StudyStore } from '../store/index.ts';

export function alertForRun(store: StudyStore, now: Date): string | null {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', hour: '2-digit', hourCycle: 'h23' }).format(now));
  if (hour < 8) return null;
  const date = todayBogota(now);
  const run = store.getGenerationRun(`daily:${date}`);
  if (run?.status === 'success' || run?.status === 'zero') return null;
  return run?.status === 'failed'
    ? `Anki's ${date} card generation failed: ${run.error ?? 'unknown error'}. Open ChatGPT's Anki task and retry it.`
    : `Anki has no ${date} generation result after 8:00 a.m. Bogota. Check the ChatGPT task and @Anki connection.`;
}

export function checkAndAlert(now = new Date()): string | null {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  let message: string | null = 'Anki study database is missing';
  if (existsSync(dbPath)) {
    const store = openStudyStore(dbPath);
    try { message = alertForRun(store, now); } finally { store.close(); }
  }
  if (!message) return null;
  const marker = path.join(dataDir, 'last-generation-alert.json');
  const date = todayBogota(now);
  let prior: { date?: string; message?: string } = {};
  try { prior = JSON.parse(readFileSync(marker, 'utf8')); } catch { /* No prior alert. */ }
  if (prior.date === date && prior.message === message) return null;
  const notifier = process.env.ANKI_NOTIFY_BIN ?? path.join(os.homedir(), 'Projects', 'pushover', 'bin', 'notify.sh');
  execFileSync('/bin/bash', [notifier, '-c', 'anki-generation', '-m', message], { timeout: 20_000 });
  writeFileSync(marker, JSON.stringify({ date, message }), { mode: 0o600 });
  return message;
}
