# Advanced URL Analyzer Bot 🔍

A comprehensive URL analysis system with Telegram bot integration and password-protected web dashboard. Analyze any URL with AI-powered insights, screenshots, trust scoring, and detailed content extraction.

## 🌟 Features

### 📱 Telegram Bot
- **`/check "url"`** - Instant URL analysis with inline results
- **AI-powered summaries** and content analysis  
- **Trust scoring** and sentiment analysis
- **Screenshot capture** for visual verification
- **Interactive buttons** for advanced actions
- **Analysis history** and statistics tracking
- **Multi-platform support**: Twitter, YouTube, News, Blogs, GitHub, Reddit

### 🌐 Advanced Web Dashboard
- **Password-protected** secure access
- **Interactive analysis results** with detailed breakdowns
- **Screenshot gallery** with modal viewing
- **Search and filtering** across all analyses  
- **Real-time statistics** and usage metrics
- **Export capabilities** for data portability
- **Responsive design** optimized for all devices
- **Session management** with secure authentication

### 🧠 AI Analysis Engine
- **Content summarization** using OpenRouter AI
- **Sentiment analysis** (positive/negative/neutral)
- **Topic extraction** and categorization
- **Trust score calculation** based on multiple factors
- **Personalized recommendations** and security warnings
- **Multi-language support** with automatic detection

### 🔒 Security Features
- **Password protection** for web dashboard access
- **Rate limiting** to prevent abuse
- **Session-based authentication** with secure tokens
- **Audit logging** for all user actions
- **HTTPS-ready** configuration for production
- **User access control** with admin privileges

## 🚀 Quick Start

### 1. Automated Setup
```bash
npm run setup
```

The setup script will guide you through:
- ✅ Environment configuration
- ✅ API keys and tokens setup
- ✅ Database initialization  
- ✅ Dependency installation
- ✅ Browser setup (Playwright)

### 2. Manual Setup

1. **Install Dependencies**
   ```bash
   npm install
   npm run install-playwright
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and settings
   ```

3. **Start Services**
   ```bash
   # Telegram Bot
   npm run bot
   
   # Web Dashboard (separate terminal)
   npm run web
   ```

## 📋 Configuration

### Required API Keys

1. **OpenRouter API Key** ([Get yours here](https://openrouter.ai))
   ```env
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   ```

2. **Telegram Bot Token** ([Create via BotFather](https://t.me/botfather))
   ```env
   TELEGRAM_BOT_TOKEN=your-bot-token-here
   ```

### Web Dashboard Settings
```env
WEB_PORT=3000
WEB_ADMIN_PASSWORD=your-secure-password
WEB_SESSION_SECRET=your-session-secret
```

### Analysis Settings
```env
SCREENSHOT_ENABLED=true
SCREENSHOT_WIDTH=1280
SCREENSHOT_HEIGHT=720
ANALYSIS_TIMEOUT_MS=30000
```

## 📱 Telegram Bot Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Welcome message and bot introduction | `/start` |
| `/check <url>` | Analyze any URL with AI insights | `/check https://twitter.com/user/status/123` |
| `/help` | Show detailed help and usage examples | `/help` |
| `/stats` | View your analysis history and statistics | `/stats` |
| `/web` | Get secure access link to web dashboard | `/web` |

### Usage Examples

```bash
# Twitter/X Analysis
/check https://twitter.com/elonmusk/status/1234567890

# YouTube Video Analysis  
/check https://www.youtube.com/watch?v=dQw4w9WgXcQ

# News Article Analysis
/check https://www.bbc.com/news/technology-12345678

# GitHub Repository Analysis
/check https://github.com/microsoft/vscode

# Any Website Analysis
/check https://example.com/interesting-article
```

## 🌐 Web Dashboard

Access the web dashboard at `http://localhost:3000` (or your configured port).

### Dashboard Features

#### 📊 Analytics Overview
- **Total analyses** performed
- **Active users** in the last 7 days  
- **Most analyzed domains** with statistics
- **Real-time usage metrics** and trends

#### 🔍 Analysis Management
- **Search and filter** all analyses by URL, content, or date
- **Detailed view** with AI insights, screenshots, and metadata
- **Export functionality** for data backup and analysis
- **Bulk operations** for managing multiple analyses

#### 🔐 Security Features
- **Password-protected** login with session management
- **Secure token-based** access from Telegram
- **Admin controls** for user management and settings
- **Audit logging** for all dashboard activities

### Screenshot Gallery
- **High-quality screenshots** of analyzed pages
- **Modal viewing** with zoom capabilities  
- **Organized storage** with automatic cleanup
- **Direct linking** for sharing and reference

## 🎯 Supported Platforms

| Platform | Features | Analysis Type |
|----------|----------|---------------|
| **Twitter/X** | Tweet threads, author profiles, engagement metrics | Social Media |
| **YouTube** | Video metadata, channel info, descriptions | Video Content |
| **News Sites** | Article content, author, publication date | News/Media |
| **GitHub** | Repository info, README content, statistics | Code Repository |
| **Reddit** | Post content, comments, community analysis | Social Forum |
| **Blogs** | Article content, author info, tags | Blog Content |
| **Generic** | Metadata extraction, content analysis | Any Website |

## 🔧 Advanced Configuration

### Database Settings
```env
DATABASE_PATH=./database/analyzer.db  # SQLite database location
```

### Security Configuration
```env
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      # Max requests per window
JWT_SECRET=your-jwt-secret       # JWT token signing
```

### Logging Configuration
```env
LOG_LEVEL=info                   # info, debug, warn, error
LOG_FILE_PATH=./logs/analyzer.log
```

## 🛠️ Development

### Development Mode
```bash
# Auto-restart on changes
npm run dev-bot    # Telegram bot development
npm run dev-web    # Web UI development
```

### Project Structure
```
├── src/
│   ├── analyzer.js          # Main analysis logic
│   ├── scraper.js           # Web scraping engine  
│   ├── ai-analyzer.js       # AI integration
│   └── url-analyzer.js      # Universal URL analyzer
├── telegram-bot/
│   └── bot.js               # Telegram bot implementation
├── web-ui/
│   ├── server.js            # Express web server
│   └── public/              # Static assets and screenshots
├── database/
│   └── database.js          # SQLite database management
├── scripts/
│   └── setup.js             # Automated setup script
└── utils/
    └── helpers.js           # Utility functions
```

### Testing
```bash
# Test analysis functionality
npm start "https://example.com"

# Test database connection
node -e "import('./database/database.js').then(d => new d.default().initialize())"

# Test Telegram bot (requires token)
npm run bot
```

## 📊 API Endpoints

The web dashboard exposes several API endpoints for programmatic access:

### Analysis APIs
```http
POST /api/analyze          # Create new analysis
GET  /api/analyses         # List all analyses  
GET  /api/analyses/:id     # Get specific analysis
GET  /api/stats            # Get usage statistics
```

### Authentication APIs  
```http
POST /login                # Dashboard login
POST /logout               # Dashboard logout
GET  /dashboard            # Main dashboard (auth required)
```

## 🔒 Security Best Practices

### Production Deployment
1. **Use strong passwords** for web dashboard access
2. **Enable HTTPS** with proper SSL certificates
3. **Set secure session secrets** and JWT tokens
4. **Configure proper rate limiting** based on your usage
5. **Regular database backups** and log monitoring
6. **Firewall configuration** to restrict access

### Environment Security
```env
# Production settings
NODE_ENV=production
WEB_SESSION_SECRET=very-long-and-random-secret
WEB_ADMIN_PASSWORD=complex-password-with-symbols
```

## 🐛 Troubleshooting

### Common Issues

**Bot not responding:**
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check bot is started with `/start` command  
- Ensure network connectivity for API calls

**Web dashboard login fails:**
- Check `WEB_ADMIN_PASSWORD` in `.env` file
- Clear browser cache and cookies
- Verify session secret is configured

**Analysis fails:**
- Check `OPENROUTER_API_KEY` is valid and has credits
- Verify URL is accessible and not blocked
- Check Playwright browser installation

**Screenshots not captured:**
- Ensure `SCREENSHOT_ENABLED=true` in configuration
- Check write permissions for `web-ui/public/screenshots/`
- Verify Playwright Chromium installation

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run bot
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenRouter** for AI analysis capabilities
- **Telegram Bot API** for messaging platform integration
- **Playwright** for reliable web scraping
- **TailwindCSS** for beautiful web UI styling
- **SQLite** for efficient local data storage

---

**Built with ❤️ for comprehensive URL analysis and social media insights**
