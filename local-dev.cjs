const { spawn } = require('node:child_process');
const path = require('node:path');

const processes = [];

function start(label, args) {
  const child = spawn(process.execPath, args, {
    cwd: __dirname,
    stdio: 'inherit',
  });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`[${label}] exited with code ${code}`);
  });
  processes.push(child);
}

function stop() {
  processes.forEach((child) => child.kill());
  process.exit();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

console.log('Starting KrishiSarth local MQTT broker and dashboard...');
start('broker', ['broker.cjs']);
start('dashboard', [path.join('node_modules', 'vite', 'bin', 'vite.js'), '--host', '0.0.0.0', '--port', '8000']);
