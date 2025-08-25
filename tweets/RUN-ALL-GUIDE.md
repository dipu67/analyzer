# 🚀 All-in-One Launcher Guide

## Quick Start Commands

### 🎯 **Single Command to Run Everything:**

```bash
npm run all
```
**OR**
```bash
npm run start-all
```

This will start both:
- 🤖 Telegram Bot
- 🌐 Web Dashboard (http://localhost:3000)

---

## 📋 Prerequisites

Make sure you have:

1. **API Keys configured** (run `npm run setup` if not done):
   ```env
   OPENROUTER_API_KEY=your-key-here
   TELEGRAM_BOT_TOKEN=your-token-here
   ```

2. **Dependencies installed**:
   ```bash
   npm install
   ```

---

## 🎮 Available Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run all` | 🚀 **Start everything** | **Most common - run both services** |
| `npm run start-all` | 🚀 Same as above | Alternative command |
| `npm run dev-all` | 🔄 Development mode with auto-restart | Development/testing |
| `npm run bot` | 🤖 Telegram bot only | Bot-only deployment |
| `npm run web` | 🌐 Web dashboard only | Web-only deployment |
| `npm run setup` | ⚙️ Interactive configuration | First-time setup |

---

## 🖥️ What You'll See

When you run `npm run all`, you'll get:

```
🚀 Starting All-in-One URL Analyzer System

🤖 Starting Telegram Bot...
🌐 Starting Web Dashboard...

✅ All services started successfully!
📊 System Overview:
   • Telegram Bot: Running (Token: ✅)
   • Web Dashboard: http://localhost:3000
   • Admin Password: your-password
   • Database: ./database/analyzer.db
   • AI Model: openai/gpt-oss-20b:free

🎯 Usage:
   • Telegram: Send /check "url" to your bot
   • Web UI: Visit the dashboard URL above
   • Stop: Press Ctrl+C

📊 Real-time Logs:
   [BOT] = Telegram Bot logs
   [WEB] = Web Dashboard logs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[BOT] 🤖 Telegram bot initialized
[BOT] 🚀 Telegram bot is running
[WEB] 🌐 Web UI server initialized
[WEB] 🌐 Web UI server running on http://localhost:3000
```

---

## 📱 Immediate Usage

Once running, you can immediately:

### 🤖 **Telegram Bot**
1. Find your bot on Telegram
2. Send: `/start`
3. Send: `/check "https://twitter.com/user/status/123"`
4. Send: `/web` (get dashboard link)

### 🌐 **Web Dashboard**
1. Open: http://localhost:3000
2. Login with your admin password
3. Click "➕ New Analysis" to analyze URLs
4. View detailed results, screenshots, analytics

---

## 🛑 Stopping Services

- **Press `Ctrl+C`** in the terminal
- Services will shut down gracefully
- Database connections will close properly

---

## 🔧 Production Deployment

For production use:

```bash
# Production mode with clustering
node start-production.js

# Or with PM2 (process manager)
npm install -g pm2
pm2 start start-all.js --name "url-analyzer"
```

---

## 🏥 Health Monitoring

Enable health check endpoint:

```env
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PORT=8080
```

Then visit: `http://localhost:8080/health`

---

## 🐛 Troubleshooting

### "Environment not configured properly"
```bash
npm run setup  # Run interactive setup
```

### "Missing required environment variables"
Check your `.env` file has:
- `OPENROUTER_API_KEY`
- `TELEGRAM_BOT_TOKEN`

### Services not starting
1. Check if ports are available (3000 for web)
2. Verify API keys are valid
3. Check database permissions

### Bot not responding
1. Verify bot token is correct
2. Start bot with `/start` command
3. Check bot has permission to send messages

---

## 💡 Tips

1. **First time?** Run `npm run setup` for guided configuration
2. **Development?** Use `npm run dev-all` for auto-restart
3. **Production?** Use `node start-production.js` with clustering
4. **Monitoring?** Enable health check for uptime monitoring

---

## 🎯 **Ready to Go!**

Just run:
```bash
npm run all
```

And you'll have a complete URL analysis system with Telegram bot and web dashboard running! 🚀
