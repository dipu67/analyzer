import { chromium } from "playwright";
import AIAnalyzer from './ai-analyzer.js'
 const aiAnalyzer = new AIAnalyzer();
/**
 * Default configuration for the Twitter scraper
 */
const DEFAULT_CONFIG = {
  headless: true,
  timeout: 15000,
  waitTimeout: 15000,
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  viewport: { width: 1280, height: 720 },
  blockResources: ["image", "stylesheet", "font", "media"]
};

   
/**
 * Initialize a browser instance with Twitter scraping configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Browser and page instances
 */
async function initializeBrowser(config = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    // Heroku-specific browser configuration
    const browserArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-extensions",
      "--disable-plugins",
      "--disable-default-apps"
    ];

    const launchOptions = {
      headless: finalConfig.headless,
      args: browserArgs,
    };

    // Use Google Chrome installed by Heroku buildpack
    if (process.env.GOOGLE_CHROME_BIN) {
      console.log('🔧 Using Chrome from buildpack:', process.env.GOOGLE_CHROME_BIN);
      launchOptions.executablePath = process.env.GOOGLE_CHROME_BIN;
      launchOptions.channel = undefined; // Don't use Playwright's bundled browser
    } else if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
      console.log('🎭 Using Playwright buildpack browsers:', process.env.PLAYWRIGHT_BROWSERS_PATH);
      // The Playwright buildpack sets up the browser path automatically
      } else if (process.env.NODE_ENV === 'production') {
        console.log('🔧 Heroku environment detected, checking system...');
        
        // Check for system Chrome installations and Playwright
        try {
          const { execSync } = await import('child_process');
          console.log('🔍 Checking for system browsers and Playwright...');
          
          const commands = [
            'which playwright || echo "playwright not found in PATH"',
            '/app/node_modules/.bin/playwright --version || echo "playwright command failed"',
            '/app/node_modules/.bin/playwright install --dry-run chromium || echo "playwright install check failed"',
            'ls -la /app/.cache/ms-playwright/ || echo "no playwright cache directory"',
            'ls -la /app/.cache/ms-playwright/chromium*/chrome-linux/ || echo "no chrome in playwright cache"',
            'which chromium-browser 2>/dev/null || echo "chromium-browser not found"',
            'which google-chrome 2>/dev/null || echo "google-chrome not found"', 
            'which chromium 2>/dev/null || echo "chromium not found"'
          ];
          
          for (const cmd of commands) {
            try {
              const result = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
              console.log(`📋 ${cmd}:`, result.trim());
            } catch (e) {
              console.log(`⚠️ Command failed: ${cmd} - ${e.message}`);
            }
          }
          
          // Try to manually install Playwright browsers
          console.log('🎭 Attempting to install Playwright browsers...');
          try {
            const installResult = execSync('/app/node_modules/.bin/playwright install chromium', { 
              encoding: 'utf8', 
              timeout: 60000 
            });
            console.log('✅ Playwright install result:', installResult);
          } catch (installError) {
            console.log('❌ Playwright install failed:', installError.message);
          }
          
        } catch (e) {
          console.log('⚠️ Could not run system checks:', e.message);
        }
      }

    console.log('🌐 Launching browser with options:', JSON.stringify(launchOptions, null, 2));
    
    try {
      console.log('🎭 Attempting to launch Chromium with Playwright...');
      const browser = await chromium.launch(launchOptions);
      console.log('✅ Browser launched successfully!');
      
      const page = await browser.newPage({
        userAgent: finalConfig.userAgent,
      });
      console.log('✅ New page created successfully!');

      await page.setViewportSize(finalConfig.viewport);

      // Block unnecessary resources to improve performance
      await page.route("**/*", (route) => {
        const resourceType = route.request().resourceType();
        if (finalConfig.blockResources.includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      return { browser, page, config: finalConfig };
      
    } catch (launchError) {
      console.log('❌ Browser launch failed:', launchError.message);
      
      if (launchError.message.includes('Executable doesn\'t exist')) {
        throw new Error('Browser not available: Playwright browsers are not installed. This typically happens on Heroku when browsers are not properly installed during deployment. The scraping functionality is currently unavailable.');
      }
      
      throw launchError;
    }
  
  } catch (error) {
    console.error('❌ Failed to initialize browser:', error.message);
    console.log('🔧 Environment details:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- GOOGLE_CHROME_BIN:', process.env.GOOGLE_CHROME_BIN);
    console.log('- PLAYWRIGHT_BROWSERS_PATH:', process.env.PLAYWRIGHT_BROWSERS_PATH);
    console.log('- Platform:', process.platform);
    console.log('- Error stack:', error.stack);
    
    // Check if Playwright browsers directory exists
    try {
      const fs = await import('fs');
      const path = await import('path');
      const playwrightPath = process.env.PLAYWRIGHT_BROWSERS_PATH || '/app/.cache/ms-playwright';
      console.log('🔍 Checking Playwright browsers at:', playwrightPath);
      
      if (fs.existsSync(playwrightPath)) {
        console.log('📁 Playwright directory exists');
        const contents = fs.readdirSync(playwrightPath);
        console.log('📋 Directory contents:', contents);
      } else {
        console.log('❌ Playwright directory not found');
      }
    } catch (fsError) {
      console.log('⚠️ Could not check filesystem:', fsError.message);
    }
    
    // Provide helpful error message for common Heroku issues
    if (error.message.includes('Executable doesn\'t exist') || error.message.includes('ENOENT')) {
      throw new Error('Browser not available: Playwright browsers not properly installed. The Playwright buildpack may not have completed successfully during deployment.');
    }
    
    throw error;
  }
}

/**
 * Scrape a single tweet from a URL
 * @param {Object} page - Playwright page instance
 * @param {string} url - The Twitter/X URL to scrape
 * @param {Object} config - Configuration object
 * @returns {Object} Tweet data including user info and tweet content
 */
async function scrapeSingleTweet(page, url, config) {
  const navigationPromise = page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: config.timeout,
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            "Navigation timeout - Twitter may be blocking automated access"
          )
        ),
      config.timeout
    );
  });

  await Promise.race([navigationPromise, timeoutPromise]);
  await page.waitForSelector('[data-testid="tweet"]', { 
    timeout: config.waitTimeout 
  });

  const user = await page.evaluate(() => {
    const userElement = document.querySelector('[data-testid="User-Name"]');
    let displayName =
      userElement?.querySelector("span")?.textContent?.trim() || "";
    let username =
      userElement
        ?.querySelector('a[role="link"] > div > span')
        ?.textContent?.replace("@", "") || "";

    return { displayName, username };
  });

  const tweet = await page.evaluate(() => {
    const tweetElement = document.querySelector('[data-testid="tweet"]');
    let text =
      tweetElement
        ?.querySelector('[data-testid="tweetText"]')
        ?.textContent?.trim() || "";
    let timestamp =
      tweetElement?.querySelector("time")?.getAttribute("datetime") || "";
    return { text, timestamp };
  });

  return {
    url,
    user,
    tweet,
    scrapedAt: new Date().toISOString()
  };
}

/**
 * Scrape multiple tweets from an array of URLs
 * @param {Object} page - Playwright page instance
 * @param {string[]} urls - Array of Twitter/X URLs to scrape
 * @param {Object} config - Configuration object
 * @returns {Object[]} Array of tweet data
 */
async function scrapeMultipleTweets(page, urls, config) {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error("URLs must be a non-empty array");
  }

  const allPosts = [];

  for (let i = 0; i < urls.length; i++) {
    try {
      const post = await scrapeSingleTweet(page, urls[i], config);
      allPosts.push(post);
    } catch (error) {
      console.error(`Error scraping URL ${urls[i]}:`, error.message);
      allPosts.push({
        url: urls[i],
        error: error.message,
        scrapedAt: new Date().toISOString()
      });
    }
  }

  return allPosts;
}

/**
 * Get merged text from multiple tweets
 * @param {Object[]} posts - Array of post objects
 * @returns {string} Merged tweet text
 */
function getMergedText(posts) {
  return posts
    .filter(post => post.tweet && post.tweet.text)
    .map(post => post.tweet.text)
    .join("\n\n");
}

/**
 * Close browser instance
 * @param {Object} browser - Playwright browser instance
 */
async function closeBrowser(browser) {
  if (browser) {
    await browser.close();
  }
}

/**
 * Convenience function for quick scraping
 * @param {string[]} urls - Array of Twitter/X URLs to scrape
 * @param {Object} config - Optional configuration
 * @returns {Object} Result containing posts and merged text
 */
async function scrapeTweets(urls, config = {}) {
  let browser = null;
  
  try {
    const { browser: browserInstance, page, config: finalConfig } = await initializeBrowser(config);
    browser = browserInstance;
    
    const posts = await scrapeMultipleTweets(page, urls, finalConfig);
    const fullText = getMergedText(posts);

    const plainText = fullText.trim();
    const analysisResult = await aiAnalyzer.analyzeForAirdrops(plainText);
    return {
      fullText,
      success: true,
      totalPosts: posts.length,
      analysis: analysisResult
    };
  } catch (error) {
    return {
      posts: [],
      mergedText: "",
      success: false,
      error: error.message
    };
  } finally {
    await closeBrowser(browser);
  }
}



// Export all functions and configuration
export { 
  initializeBrowser,
  scrapeSingleTweet,
  scrapeMultipleTweets,
  getMergedText,
  closeBrowser,
  scrapeTweets,
  DEFAULT_CONFIG 
};

// const urls = [
//   "https://x.com/Twiter_score/status/1959190857363685418",
//   "https://x.com/Twiter_score/status/1959190862149091416",
//   "https://x.com/Twiter_score/status/1959190865697767576",
//   "https://x.com/Twiter_score/status/1959190869732663705",
//   "https://x.com/Twiter_score/status/1959190872676843619",
//   "https://x.com/Twiter_score/status/1959190876523221079",
// ];

// // Execute scraping
// const tweets = await scrapeTweets(urls, DEFAULT_CONFIG);
// console.log(tweets.fullText.trim());

