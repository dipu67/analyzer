#!/usr/bin/env node

import { spawn } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

class AllInOneManager {
  constructor() {
    this.processes = new Map();
    this.isShuttingDown = false;
  }

  async start() {
    console.log('🚀 Starting All-in-One URL Analyzer System\n');

    // Check environment
    if (!this.checkEnvironment()) {
      console.log('❌ Environment not configured properly');
      console.log('💡 Run: npm run setup');
      process.exit(1);
    }

    // Start services
    this.startTelegramBot();
    this.startWebUI();

    // Setup graceful shutdown
    this.setupShutdown();

    console.log('\n✅ All services started successfully!');
    console.log('📊 System Overview:');
    console.log(`   • Telegram Bot: Running (Token: ${process.env.TELEGRAM_BOT_TOKEN ? '✅' : '❌'})`);
    console.log(`   • Web Dashboard: http://localhost:${process.env.WEB_PORT || 3000}`);
    console.log(`   • Admin Password: ${process.env.WEB_ADMIN_PASSWORD || 'Not set'}`);
    console.log(`   • Database: ${process.env.DATABASE_PATH || './database/analyzer.db'}`);
    console.log(`   • AI Model: ${process.env.OPENROUTER_MODEL || 'Default'}`);

    console.log('\n🎯 Usage:');
    console.log('   • Telegram: Send /check "url" to your bot');
    console.log('   • Web UI: Visit the dashboard URL above');
    console.log('   • Stop: Press Ctrl+C');

    console.log('\n📊 Real-time Logs:');
    console.log('   [BOT] = Telegram Bot logs');
    console.log('   [WEB] = Web Dashboard logs');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Keep process alive
    process.stdin.resume();
  }

  checkEnvironment() {
    const required = [
      'OPENROUTER_API_KEY',
      'TELEGRAM_BOT_TOKEN'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.log('❌ Missing required environment variables:');
      missing.forEach(key => console.log(`   • ${key}`));
      return false;
    }

    // Check database directory
    const dbPath = process.env.DATABASE_PATH || './database/analyzer.db';
    const dbDir = dbPath.substring(0, dbPath.lastIndexOf('/'));
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`📁 Created database directory: ${dbDir}`);
    }

    return true;
  }

  startTelegramBot() {
    console.log('🤖 Starting Telegram Bot...');
    
    const bot = spawn('node', ['telegram-bot/bot.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    this.processes.set('bot', bot);

    bot.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[BOT] ${output}`);
      }
    });

    bot.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error) {
        console.error(`[BOT] ❌ ${error}`);
      }
    });

    bot.on('close', (code) => {
      if (!this.isShuttingDown) {
        console.log(`[BOT] ❌ Process exited with code ${code}`);
        this.restart('bot');
      }
    });

    bot.on('error', (error) => {
      console.error(`[BOT] ❌ Failed to start: ${error.message}`);
    });
  }

  startWebUI() {
    console.log('🌐 Starting Web Dashboard...');
    
    const web = spawn('node', ['web-ui/frontend.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    this.processes.set('web', web);

    web.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[WEB] ${output}`);
      }
    });

    web.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error) {
        console.error(`[WEB] ❌ ${error}`);
      }
    });

    web.on('close', (code) => {
      if (!this.isShuttingDown) {
        console.log(`[WEB] ❌ Process exited with code ${code}`);
        this.restart('web');
      }
    });

    web.on('error', (error) => {
      console.error(`[WEB] ❌ Failed to start: ${error.message}`);
    });
  }

  restart(serviceName) {
    console.log(`🔄 Restarting ${serviceName}...`);
    
    setTimeout(() => {
      if (serviceName === 'bot') {
        this.startTelegramBot();
      } else if (serviceName === 'web') {
        this.startWebUI();
      }
    }, 2000);
  }

  setupShutdown() {
    const shutdown = () => {
      if (this.isShuttingDown) return;
      
      this.isShuttingDown = true;
      console.log('\n🛑 Shutting down all services...');

      this.processes.forEach((process, name) => {
        console.log(`   • Stopping ${name}...`);
        process.kill('SIGTERM');
      });

      setTimeout(() => {
        console.log('✅ All services stopped. Goodbye!');
        process.exit(0);
      }, 2000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGQUIT', shutdown);
  }
}

// Health check endpoint for monitoring
function startHealthCheck() {
  const http = require('http');
  
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'running',
        services: {
          bot: 'active',
          web: 'active'
        },
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  const port = parseInt(process.env.HEALTH_CHECK_PORT) || 8080;
  server.listen(port, () => {
    console.log(`🏥 Health check endpoint: http://localhost:${port}/health`);
  });
}

// Start the manager
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new AllInOneManager();
  
  // Add health check if enabled
  if (process.env.HEALTH_CHECK_ENABLED === 'true') {
    startHealthCheck();
  }
  
  manager.start().catch(console.error);
}

export default AllInOneManager;
