import { Telegraf} from 'telegraf';
import dotenv from 'dotenv';
import Database from '../database/database.js';
import crypto from 'crypto';
import { scrapeTweets, DEFAULT_CONFIG } from '../src/fetchPost.js';

dotenv.config();

export class AnalyzerBot {
  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.db = new Database();
    this.webUIUrl = process.env.WEB_UI_URL || 'http://localhost:3000';
    
    this.setupCommands();
    this.setupMiddleware();
  }

  async initialize() {
    await this.db.initialize();
    console.log('🤖 Telegram bot initialized');
  }

  setupMiddleware() {
    // User authentication and logging
    this.bot.use(async (ctx, next) => {
      const telegramId = ctx.from?.id.toString();
      const username = ctx.from?.username;
      const firstName = ctx.from?.first_name;

      if (telegramId) {
        // Create or get user
        await this.db.createUser(telegramId, username, firstName);
        await this.db.updateUserActivity(telegramId);
        
        // Log action
        await this.db.logAction(
          telegramId,
          'telegram_interaction',
          JSON.stringify({ 
            command: ctx.message?.text || ctx.callbackQuery?.data,
            chat_id: ctx.chat?.id
          })
        );

        ctx.user = await this.db.getUser(telegramId);
      }

      return next();
    });
  }

  setupCommands() {
    // Start command
    this.bot.start(async (ctx) => {
      const welcomeMessage = `
🐦 Welcome to the Twitter/X Scraper Bot!

I can scrape and extract content from Twitter/X posts including:
• Clean text extraction
• Multiple URLs at once
• Thread support
• Fast processing

📝 Available Commands:
/check <url1> <url2> ... - Scrape Twitter/X posts
/help - Show help information
/stats - View your scraping history
/web - Get web dashboard access

🔗 Supported platforms: 
• Twitter/X posts (x.com or twitter.com)
• Multiple URLs in one command

Try it: /check https://x.com/username/status/123456789
      `;

      await ctx.reply(welcomeMessage, {
        reply_markup: {
          inline_keyboard: [[
            { text: '📊 Open Web Dashboard', callback_data: 'web_dashboard' },
            { text: '❓ Help', callback_data: 'help' }
          ]]
        }
      });
    });

    // Check command - main functionality
    this.bot.command('check', async (ctx) => {
      // Get the full message text after /check command
      const messageText = ctx.message.text;
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = messageText.match(urlRegex);

      if (!urls) {
        return ctx.reply(
          '❌ Please provide Twitter/X URLs to analyze.\n\n' +
          '📝 *Usage examples:*\n' +
          '• `/check https://x.com/username/status/123456789`\n' +
          '• `/check url1 url2 url3` (space separated)\n' +
          '• Send multiple URLs on separate lines after /check\n\n' +
          '💡 *Tip:* You can send up to 10 URLs at once!',
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '📖 View Examples', callback_data: 'examples' }
              ]]
            }
          }
        );
      }

      const processingMsg = await ctx.reply(`🔄 Scraping ${urls.length} tweet${urls.length > 1 ? 's' : ''}, please wait...`);

      try {
        // Perform scraping using fetchPost.js
        const result = await scrapeTweets(urls, DEFAULT_CONFIG);
        
        if (!result.success) {
          throw new Error(result.error || 'Scraping failed');
        }

        // Get analysis data
        const analysis = result.analysis || {};
        
        // Create response message with analysis
        let responseText = `✅ *সফলভাবে ${result.totalPosts}টি টুইট স্ক্র্যাপ করা হয়েছে*\n\n`;
        
        // Add airdrop analysis
        if (analysis.has_airdrop_opportunity) {
          responseText += `🎯 *এয়ারড্রপ সম্ভাবনা: ${analysis.airdrop_potential}/10*\n`;
          responseText += `✨ *স্ট্যাটাস: ${analysis.has_airdrop_opportunity ? 'সুযোগ রয়েছে' : 'সুযোগ নেই'}*\n\n`;
        }
        
        // Add Bengali summary
        if (analysis.summary_bangla) {
          responseText += `📝 *সারসংক্ষেপ:*\n${analysis.summary_bangla}\n\n`;
        }
        
        // Add key points
        if (analysis.key_points_bangla && analysis.key_points_bangla.length > 0) {
          responseText += `🔑 *মূল বিষয়সমূহ:*\n`;
          analysis.key_points_bangla.forEach((point, index) => {
            responseText += `${index + 1}. ${point}\n`;
          });
          responseText += '\n';
        }
        
        // Add action steps
        if (analysis.action_steps_bangla && analysis.action_steps_bangla.length > 0) {
          responseText += `📋 *করণীয়:*\n`;
          analysis.action_steps_bangla.forEach((step, index) => {
            responseText += `${index + 1}. ${step}\n`;
          });
          responseText += '\n';
        }
        
        // Add projects mentioned
        if (analysis.projects_mentioned && analysis.projects_mentioned.length > 0) {
          responseText += `🏗️ *উল্লিখিত প্রজেক্ট:* ${analysis.projects_mentioned.join(', ')}\n\n`;
        }
        
        // Add confidence level
        responseText += `🎯 *বিশ্বাস স্তর: ${analysis.confidence_level === 'high' ? 'উচ্চ' : analysis.confidence_level === 'medium' ? 'মাঝারি' : 'নিম্ন'}*\n\n`;
        

        // Truncate response if too long for Telegram
        const truncatedText = this.truncateForTelegram(responseText);
        // Update processing message
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            processingMsg.message_id,
            undefined,
            truncatedText,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔄 Scrape More', callback_data: 'scrape_more' }],
                  [{ text: '📊 Dashboard', callback_data: 'web_dashboard' }]
                ]
              }
            }
          );
        } catch (editError) {
          console.error('Error editing message, sending new one:', editError.message);
          // If editing fails, send a new message instead
          await ctx.reply(truncatedText, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔄 Scrape More', callback_data: 'scrape_more' }],
                [{ text: '📊 Dashboard', callback_data: 'web_dashboard' }]
              ]
            }
          });
        }

      } catch (error) {
        console.error('Scraping error:', error);
        
        // Create clean error message
        const cleanError = this.escapeMarkdown(error.message);
        const errorText = `❌ Scraping failed: ${cleanError}`;
        
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            processingMsg.message_id,
            undefined,
            errorText
          );
        } catch (editError) {
          // If editing fails, send new message
          await ctx.reply(errorText);
        }
      }
    });

    // Help command
    this.bot.help(async (ctx) => {
      const helpText = `
📖 *Help & Commands*

*Main Commands:*
/check <url1> <url2> ... - Scrape Twitter/X posts
/stats - View your scraping statistics  
/web - Access web dashboard

*Supported URLs:*
• Twitter/X posts (x.com or twitter.com)
• Multiple URLs in one command
• Thread scraping support

*Features:*
• Fast Twitter/X content scraping
• Multiple tweet processing
• Clean text extraction
• Raw content preservation

*Examples:*
\`/check https://x.com/elonmusk/status/123\`
\`/check https://twitter.com/user/status/123 https://x.com/user/status/456\`

💡 *Note:* Only Twitter/X URLs are currently supported for scraping.

Need help? Contact the administrator.
      `;

      await ctx.reply(helpText, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 Try Example', callback_data: 'example_url' }],
            [{ text: '📊 Web Dashboard', callback_data: 'web_dashboard' }]
          ]
        }
      });
    });

    // Stats command
    this.bot.command('stats', async (ctx) => {
      try {
        const userId = ctx.user?.id;
        
        let statsText = `📊 *Your Scraping Statistics*\n\n`;
        statsText += `Welcome to Twitter/X scraper bot!\n\n`;
        statsText += `*Available features:*\n`;
        statsText += `• Scrape multiple tweets at once\n`;
        statsText += `• Clean text extraction\n`;
        statsText += `• Thread support\n\n`;
        statsText += `Try: /check <twitter_url> to get started!`;

        await ctx.reply(statsText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 Full Dashboard', callback_data: 'web_dashboard' }]
            ]
          }
        });

      } catch (error) {
        await ctx.reply('❌ Error retrieving statistics');
      }
    });

    // Web dashboard command
    this.bot.command('web', async (ctx) => {
      const sessionToken = crypto.randomUUID();
      
      let message = '🌐 *Web Dashboard Access*\n\n' +
        'Access the advanced web dashboard with:\n\n' +
        '• Detailed analysis results\n' +
        '• Interactive charts and graphs\n' +
        '• Full screenshot gallery\n' +
        '• Export capabilities\n' +
        '• Advanced search and filtering\n\n';

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔄 Generate New Link', callback_data: 'new_web_link' }]
        ]
      };

      // Only show URL button if not localhost
      if (!this.webUIUrl.includes('localhost') && !this.webUIUrl.includes('127.0.0.1')) {
        const webUrl = `${this.webUIUrl}/dashboard?token=${sessionToken}`;
        keyboard.inline_keyboard.unshift([{ text: '🚀 Open Dashboard', url: webUrl }]);
        message += '⚠️ Link expires in 1 hour for security.';
      } else {
        message += `🌐 *Dashboard URL:* ${this.webUIUrl}\n` +
          `🔐 *Admin Password:* Check your .env file\n\n` +
          '💡 *Note:* Direct links not available in development mode (localhost).\n' +
          'Please visit the URL manually in your browser.';
      }
      
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    });

    // Callback query handlers
    this.bot.on('callback_query', async (ctx) => {
      const data = ctx.callbackQuery.data;

      if (data === 'web_dashboard') {
        return this.bot.telegram.answerCallbackQuery(ctx.callbackQuery.id, 'Opening web dashboard...');
      }
      
      if (data === 'help') {
        return ctx.answerCbQuery('Opening help...');
      }

      if (data.startsWith('view_analysis_')) {
        const analysisId = data.replace('view_analysis_', '');
        
        if (!this.webUIUrl.includes('localhost') && !this.webUIUrl.includes('127.0.0.1')) {
          const webUrl = `${this.webUIUrl}/analysis/${analysisId}`;
          
          await ctx.editMessageReplyMarkup({
            inline_keyboard: [
              [{ text: '🔍 View Full Analysis', url: webUrl }],
              [{ text: '💾 Save to Dashboard', callback_data: `save_${analysisId}` }]
            ]
          });
          
          return ctx.answerCbQuery('Analysis link generated');
        } else {
          await ctx.answerCbQuery('Visit the web dashboard manually for full analysis');
          return ctx.reply(
            `🔍 *Analysis Available*\n\n` +
            `Visit: ${this.webUIUrl}/analysis/${analysisId}\n` +
            `💡 Copy and paste this URL in your browser`,
            { parse_mode: 'Markdown' }
          );
        }
      }

      await ctx.answerCbQuery();
    });

    // Error handling
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err);
      ctx.reply('❌ An error occurred. Please try again later.');
    });
  }

  // Helper method to escape Markdown special characters
  escapeMarkdown(text) {
    if (!text) return '';
    return text.toString()
      .replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&') // Escape Markdown special chars
      .replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI escape codes
  }

  // Helper function to truncate text if too long for Telegram
  truncateForTelegram(text, maxLength = 4000) {
    if (!text) return '';
    // Convert to string if not already
    const textStr = typeof text === 'string' ? text : String(text);
    if (textStr.length <= maxLength) return textStr;
    return textStr.substring(0, maxLength - 3) + '...';
  }

  isValidURL(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  isTwitterURL(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      return hostname === 'twitter.com' || 
             hostname === 'www.twitter.com' || 
             hostname === 'x.com' || 
             hostname === 'www.x.com';
    } catch {
      return false;
    }
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  async start() {
    await this.initialize();
    
    // Set bot commands
    await this.bot.telegram.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'check', description: 'Scrape Twitter/X URLs' },
      { command: 'help', description: 'Show help' },
      { command: 'stats', description: 'View your statistics' },
      { command: 'web', description: 'Access web dashboard' }
    ]);

    this.bot.launch();
    console.log('🚀 Telegram bot is running');

    // Graceful shutdown
    process.once('SIGINT', () => this.stop());
    process.once('SIGTERM', () => this.stop());
  }

  async stop() {
    console.log('🛑 Stopping Telegram bot...');
    this.bot.stop();
    await this.db.close();
    console.log('✅ Bot stopped gracefully');
  }
}

// Start bot if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const bot = new AnalyzerBot();
  bot.start().catch(console.error);
}

export default AnalyzerBot;
