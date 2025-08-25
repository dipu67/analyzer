#!/usr/bin/env node

import dotenv from 'dotenv';

dotenv.config();

async function startProductionServices() {
  console.log('🌐 Starting in Production Mode (Heroku)');
  console.log('🚀 Starting Production Services...\n');
  
  try {
    // Import services
    const { AnalyzerBot } = await import('./telegram-bot/bot.js');
    const { TwitterAnalysisServer } = await import('./web-ui/frontend.js');
    
    // Start web server first
    const webServer = new TwitterAnalysisServer();
    await webServer.start();
    
    // Start telegram bot
    const telegramBot = new AnalyzerBot();
    await telegramBot.start();
    
    console.log('\n✅ Production services started successfully!');
    console.log(`📊 Web Server: Running on port ${process.env.PORT}`);
    console.log(`🤖 Telegram Bot: Running`);
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('📢 SIGTERM received, shutting down gracefully...');
      try {
        await telegramBot.stop();
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });
    
    process.on('SIGINT', async () => {
      console.log('📢 SIGINT received, shutting down gracefully...');
      try {
        await telegramBot.stop();
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start production services:', error);
    process.exit(1);
  }
}

// Start production services
startProductionServices().catch(console.error);
