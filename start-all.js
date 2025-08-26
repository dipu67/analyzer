#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Twitter Analyzer Bot in Development Mode...\n');

// Function to spawn a child process with auto-restart
function startProcess(name, scriptPath, color) {
  const process = spawn('node', ['--watch', scriptPath], {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd: __dirname
  });

  // Add colored output for better visibility
  process.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(`${color}[${name}]${'\x1b[0m'} ${line}`);
    });
  });

  process.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.error(`${color}[${name}]${'\x1b[0m'} ${'\x1b[31m'}ERROR: ${line}${'\x1b[0m'}`);
    });
  });

  process.on('close', (code) => {
    if (code !== 0 && code !== null && code !== 130) { // 130 is SIGINT
      console.log(`${color}[${name}]${'\x1b[0m'} Process exited with code ${code}`);
      console.error(`${color}[${name}]${'\x1b[0m'} ${'\x1b[31m'}Process crashed! Restarting in 3 seconds...${'\x1b[0m'}`);
      setTimeout(() => {
        console.log(`${color}[${name}]${'\x1b[0m'} Restarting process...`);
        startProcess(name, scriptPath, color);
      }, 3000);
    }
  });

  process.on('error', (err) => {
    console.error(`${color}[${name}]${'\x1b[0m'} ${'\x1b[31m'}Failed to start process: ${err.message}${'\x1b[0m'}`);
  });

  return process;
}

// Start both processes
console.log('📱 Starting Telegram Bot (with file watching)...');
const botProcess = startProcess('BOT', './telegram-bot/bot.js', '\x1b[36m'); // Cyan

console.log('🌐 Starting Web UI (with file watching)...');
const webProcess = startProcess('WEB', './web-ui/frontend.js', '\x1b[32m'); // Green

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development services...');
  
  if (botProcess && !botProcess.killed) {
    console.log('📱 Stopping Telegram Bot...');
    botProcess.kill('SIGTERM');
  }
  
  if (webProcess && !webProcess.killed) {
    console.log('🌐 Stopping Web UI...');
    webProcess.kill('SIGTERM');
  }
  
  setTimeout(() => {
    console.log('✅ All services stopped. Goodbye!');
    process.exit(0);
  }, 2000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  
  if (botProcess && !botProcess.killed) {
    botProcess.kill('SIGTERM');
  }
  
  if (webProcess && !webProcess.killed) {
    webProcess.kill('SIGTERM');
  }
  
  process.exit(0);
});

console.log('\n✅ Both services are starting up in development mode...');
console.log('📱 Telegram Bot: Running with file watching');
console.log('🌐 Web UI: Running with file watching');
console.log('🔄 Files will auto-reload on changes');
console.log('\nPress Ctrl+C to stop all services\n');
