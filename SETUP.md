# Twitter Analyzer - Setup Guide

## Quick Start

1. **Install Dependencies**
```bash
npm install
```

2. **Install Playwright Browser**
```bash
npm run install-playwright
# or manually: npx playwright install chromium
```

3. **Setup Environment Variables**
```bash
cp .env.example .env
# Edit .env and add your OpenRouter API key
```

4. **Test the Setup**
```bash
# Basic functionality test
node test/quick-test.js

# Full analysis (replace with real Twitter URL)
npm start "https://twitter.com/username/status/1234567890"
```

## Getting an OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up for an account
3. Navigate to the API Keys section
4. Create a new API key
5. Add it to your `.env` file:
```env
OPENROUTER_API_KEY=your_actual_api_key_here
```

## Usage Examples

### Command Line
```bash
# Analyze a single tweet
npm start "https://twitter.com/elonmusk/status/1234567890"

# Analyze a thread
npm start "https://twitter.com/naval/status/thread_url_here"
```

### Programmatic Usage
```javascript
import { analyzeTwitterPost } from './src/analyzer.js';

const result = await analyzeTwitterPost(tweetUrl);
console.log(result.summary);
```

## Troubleshooting

### Common Issues

1. **"OPENROUTER_API_KEY is required"**
   - Make sure you've created a `.env` file with your API key

2. **Browser launch failed**
   - Run: `npx playwright install chromium`
   - On macOS, you might need to allow the app in System Preferences

3. **Tweet not found or access denied**
   - The tweet might be private, deleted, or require login
   - Some tweets are protected and cannot be scraped

4. **Network timeout**
   - Check your internet connection
   - Twitter might be blocking automated requests temporarily

### Supported URLs
- `https://twitter.com/username/status/123456789`
- `https://x.com/username/status/123456789`
- `https://www.twitter.com/username/status/123456789`

## Features

✅ **Scrape Twitter Posts** - Extract tweet content using headless browser  
✅ **Thread Support** - Automatically detect and read entire threads  
✅ **Profile Analysis** - Extract author bio, followers, verification status  
✅ **AI Summarization** - Generate intelligent summaries using OpenRouter  
✅ **Clean Output** - Remove emojis and format text properly  
✅ **JSON Export** - Structured data output for easy integration  

## Architecture

```
src/
├── analyzer.js      # Main analyzer class and CLI entry point
├── scraper.js       # Playwright-based Twitter scraper
└── ai-analyzer.js   # OpenRouter AI integration

utils/
└── helpers.js       # Utility functions

config/
└── config.js        # Configuration settings

examples/
└── usage-example.js # Example usage patterns
```

## API Reference

### analyzeTwitterPost(url)
Main function that analyzes a Twitter post.

**Parameters:**
- `url` (string): Twitter/X URL to analyze

**Returns:**
```javascript
{
  "post_text": "Combined text from all tweets",
  "summary": "AI-generated summary",
  "is_thread": boolean,
  "thread_count": number,
  "author": {
    "username": "string",
    "display_name": "string", 
    "bio": "string",
    "followers": number,
    "following": number,
    "verified": boolean,
    "tone": "string"
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
