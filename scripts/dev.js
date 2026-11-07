import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const commands = [
  ['API', ['server/index.js']],
  ['Vite', ['node_modules/vite/bin/vite.js']],
];
const children = [];
let shuttingDown = false;

for (const [name, args] of commands) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(`${name} failed to start: ${error.message}`);
    shutdown(1);
  });
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) shutdown(code || 1);
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) if (!child.killed) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 500).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
