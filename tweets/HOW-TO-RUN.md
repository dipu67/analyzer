# 🎯 **HOW TO RUN ALL IN ONE** 

## ⚡ **Fastest Way - Single Command:**

```bash
npm run all
```

**That's it!** This starts both:
- 🤖 Telegram Bot 
- 🌐 Web Dashboard (http://localhost:3000)

---

## 📋 **Complete Setup & Run Process:**

### **Step 1: Quick Setup** ⚙️
```bash
npm run setup
```
*This will ask for your API keys and configure everything*

### **Step 2: Run Everything** 🚀
```bash
npm run all
```
*Starts both Telegram bot and web dashboard*

### **Step 3: Use It** 📱
- **Telegram:** Send `/check "https://example.com"` to your bot
- **Web UI:** Visit http://localhost:3000 (use your admin password)

---

## 🎮 **All Available Commands:**

| What You Want | Command | Description |
|---------------|---------|-------------|
| **Everything** | `npm run all` | ⭐ **Most common** - Both bot + web |
| **Setup first time** | `npm run setup` | Configure API keys |
| **Development mode** | `npm run dev-all` | Auto-restart on changes |
| **Production mode** | `npm run prod` | Clustered production deployment |
| **Just Telegram bot** | `npm run bot` | Bot only |
| **Just web dashboard** | `npm run web` | Web UI only |

---

## 🔧 **What You Need (API Keys):**

1. **OpenRouter API Key** - Get from https://openrouter.ai
2. **Telegram Bot Token** - Create via @BotFather on Telegram

*Run `npm run setup` and it will guide you through this!*

---

## ✅ **Success Indicators:**

When `npm run all` works, you'll see:
```
✅ All services started successfully!
📊 System Overview:
   • Telegram Bot: Running (Token: ✅)
   • Web Dashboard: http://localhost:3000
   
[WEB] 🌐 Web UI server running on http://localhost:3000
[BOT] 🤖 Telegram bot is running
```

---

## 🎯 **Immediate Testing:**

Once running:

### **Test Telegram Bot:**
1. Find your bot on Telegram
2. Send: `/start`
3. Send: `/check "https://github.com/microsoft/vscode"`

### **Test Web Dashboard:**
1. Open: http://localhost:3000
2. Login with your admin password
3. Click "➕ New Analysis"
4. Enter any URL to analyze

---

## 🛑 **To Stop Everything:**
Just press **Ctrl+C** in the terminal

---

## 🚀 **Summary:**

**Your upgraded system now has:**
- ✅ Universal URL analyzer (Twitter, YouTube, GitHub, any website)
- ✅ Telegram bot with `/check "url"` command  
- ✅ Password-protected web dashboard
- ✅ AI analysis with summaries, trust scores, screenshots
- ✅ Database storage with search and history
- ✅ All-in-one launcher for easy deployment

**To run everything:** `npm run all` 

**That's it!** 🎉
