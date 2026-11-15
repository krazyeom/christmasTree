import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const state = path.join(root, '.runtime'); mkdirSync(state, { recursive: true });
const env = { ...process.env, PM2_HOME: path.join(state, 'pm2'), NEXT_TELEMETRY_DISABLED: '1' };
const next = path.join(root, 'node_modules/next/dist/bin/next');
const pm2 = path.join(root, 'node_modules/pm2/bin/pm2');
const portFile = path.join(state, 'port');
const command = process.argv[2];
function run(bin, args) { const result = spawnSync(process.execPath, [bin, ...args], { cwd: root, env, stdio: 'inherit' }); if (result.error) throw result.error; if (result.status !== 0) process.exit(result.status || 1); }
async function available(port) { return new Promise(resolve => { const s = createServer(); s.once('error', () => resolve(false)); s.listen(port, '0.0.0.0', () => s.close(() => resolve(true))); }); }
async function choosePort() {
  if (process.env.PORT) { const port = Number(process.env.PORT); if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be between 1024 and 65535.'); if (!(await available(port))) throw new Error(`Port ${port} is in use.`); return port; }
  if (existsSync(portFile)) { const port = Number(readFileSync(portFile, 'utf8')); if (port >= 10000 && port <= 60000 && await available(port)) return port; }
  for (let i = 0; i < 100; i++) { const port = randomInt(10000, 60001); if (await available(port)) return port; }
  throw new Error('No available random port found.');
}
if (command === 'build') { run(next, ['build']); }
else if (command === 'stop') {
  if (!existsSync(path.join(env.PM2_HOME, 'pm2.pid')) && !existsSync(path.join(env.PM2_HOME, 'rpc.sock'))) { console.log('Christmas Tree is already stopped.'); process.exit(0); }
  run(pm2, ['kill']); console.log('Christmas Tree stopped (project-local PM2 daemon).');
} else if (command === 'start' || command === 'dev') {
  if (command === 'start') {
    if (!existsSync('.next/BUILD_ID')) throw new Error('Run npm run build first.');
    run(pm2, ['ping']);
    const result = spawnSync(process.execPath, [pm2, 'jlist'], { env, encoding: 'utf8' });
    const output = result.stdout || ''; const offset = output.indexOf('[{');
    if (offset >= 0) { const processes = JSON.parse(output.slice(offset)); if (processes.some(p => p.name === 'christmas-tree' && p.pm2_env.status === 'online')) { console.log(`Already running: http://localhost:${readFileSync(portFile, 'utf8')}`); process.exit(0); } }
  }
  const port = await choosePort(); writeFileSync(portFile, String(port));
  if (command === 'dev') run(next, ['dev', '--hostname', '0.0.0.0', '--port', String(port)]);
  else {
    env.PORT = String(port); env.NODE_ENV = 'production';
    run(pm2, ['start', next, '--name', 'christmas-tree', '--time', '--', 'start', '--hostname', '0.0.0.0', '--port', String(port)]);
    console.log(`Christmas Tree: http://localhost:${port}`);
  }
} else { throw new Error('Usage: node scripts/runner.mjs <build|start|stop|dev>'); }
