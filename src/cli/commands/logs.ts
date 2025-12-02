import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');

/** Get most recent log file */
const getLatestLog = (): string | null => {
  if (!fs.existsSync(LOGS_DIR)) return null;

  const files = fs.readdirSync(LOGS_DIR)
    .filter(f => f.endsWith('.log'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(LOGS_DIR, f)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return files[0]?.name ?? null;
};

/** Format NDJSON log line for display */
const formatLogLine = (line: string): string => {
  try {
    const log = JSON.parse(line);
    const time = new Date(log.time).toLocaleTimeString();
    const level = log.level === 30 ? 'INFO' : log.level === 40 ? 'WARN' : log.level === 50 ? 'ERROR' : 'DEBUG';
    const msg = log.msg || '';
    const extra = Object.entries(log)
      .filter(([k]) => !['time', 'level', 'msg', 'name', 'pid', 'hostname'].includes(k))
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');
    return `${time} [${level}] ${msg} ${extra}`.trim();
  } catch {
    return line;
  }
};

export const logsCommand = new Command('logs')
  .description('View log files')
  .option('-n, --lines <number>', 'Number of lines to show', '50')
  .option('-f, --file <name>', 'Specific log file name')
  .option('-l, --list', 'List available log files')
  .option('-r, --raw', 'Show raw NDJSON without formatting')
  .action((options) => {
    if (options.list) {
      if (!fs.existsSync(LOGS_DIR)) {
        console.log('No logs directory found');
        return;
      }
      const files = fs.readdirSync(LOGS_DIR)
        .filter(f => f.endsWith('.log'))
        .sort()
        .reverse();
      console.log(`Log files in ${LOGS_DIR}:\n`);
      files.slice(0, 20).forEach(f => console.log(`  ${f}`));
      if (files.length > 20) console.log(`  ... and ${files.length - 20} more`);
      return;
    }

    const filename = options.file ?? getLatestLog();
    if (!filename) {
      console.log('No log files found');
      return;
    }

    const filepath = path.join(LOGS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      console.error(`Log file not found: ${filename}`);
      return;
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const numLines = parseInt(options.lines, 10);
    const displayLines = lines.slice(-numLines);

    console.log(`\n=== ${filename} (last ${displayLines.length} lines) ===\n`);

    if (options.raw) {
      displayLines.forEach(line => console.log(line));
    } else {
      displayLines.forEach(line => console.log(formatLogLine(line)));
    }
  });
