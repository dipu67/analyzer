#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Twitter Analyzer Bot in Production Mode...\n');

// Check if running on Heroku
const isHeroku = process.env.DYNO !== undefined;

if (isHeroku) {
  console.log('🌟 Detected Heroku environment');
  // On Heroku, we need to start both services in a single process
  // Import and start both services directly
  import('./telegram-bot/bot.js').then(async (botModule) => {
    import('./web-ui/frontend.js').then(async (webModule) => {
      try {
        // Start the bot
        console.log('📱 Starting Telegram Bot...');
        const { AnalyzerBot } = botModule;
        const bot = new AnalyzerBot();
        await bot.initialize();
        bot.launch();
        console.log('✅ Telegram Bot started successfully');

        // Start the web server
        console.log('🌐 Starting Web UI...');
        const { TwitterAnalysisServer } = webModule;
        const server = new TwitterAnalysisServer();
        await server.initialize();
        server.start();
        console.log('✅ Web UI started successfully');

        console.log('\n🎉 All services running on Heroku!');
      } catch (error) {
        console.error('❌ Failed to start services:', error);
        process.exit(1);
      }
    });
  });
} else {
  // Local development - use separate processes
  // Function to spawn a child process
  function startProcess(name, scriptPath, color) {
    const process = spawn('node', [scriptPath], {
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
      console.log(`${color}[${name}]${'\x1b[0m'} Process exited with code ${code}`);
      
      if (code !== 0 && code !== null) {
        console.error(`${color}[${name}]${'\x1b[0m'} ${'\x1b[31m'}Process crashed! Restarting in 5 seconds...${'\x1b[0m'}`);
        setTimeout(() => {
          console.log(`${color}[${name}]${'\x1b[0m'} Restarting process...`);
          startProcess(name, scriptPath, color);
        }, 5000);
      }
    });

    process.on('error', (err) => {
      console.error(`${color}[${name}]${'\x1b[0m'} ${'\x1b[31m'}Failed to start process: ${err.message}${'\x1b[0m'}`);
    });

    return process;
  }

  // Start both processes
  console.log('📱 Starting Telegram Bot...');
  const botProcess = startProcess('BOT', './telegram-bot/bot.js', '\x1b[36m'); // Cyan

  console.log('🌐 Starting Web UI...');
  const webProcess = startProcess('WEB', './web-ui/frontend.js', '\x1b[32m'); // Green

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down services...');
    
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

  console.log('\n✅ Both services are starting up...');
  console.log('📱 Telegram Bot: Running');
  console.log('🌐 Web UI: Running');
  console.log('\nPress Ctrl+C to stop all services\n');
}
