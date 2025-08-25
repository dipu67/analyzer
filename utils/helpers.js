// Utility functions for the Twitter Analyzer

/**
 * Validates if a given URL is a valid Twitter/X URL
 */
export function isValidTwitterURL(url) {
  const twitterRegex = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\/]+\/status\/\d+/;
  return twitterRegex.test(url);
}

/**
 * Extracts tweet ID from Twitter URL
 */
export function extractTweetId(url) {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extracts username from Twitter URL
 */
export function extractUsername(url) {
  const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status/);
  return match ? match[1] : null;
}

/**
 * Formats follower count for display
 */
export function formatFollowerCount(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

/**
 * Clean and format text by removing excessive whitespace and emojis
 */
export function cleanText(text) {
  return text
    // Remove most emojis but keep some important ones
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc symbols
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport symbols
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flag emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/\s+/g, ' ')                   // Multiple spaces to single
    .trim();
}

/**
 * Truncate text to a specific length with ellipsis
 */
export function truncateText(text, maxLength = 280) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Parse Twitter date string to readable format
 */
export function formatTwitterDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Determine posting tone based on text analysis
 */
export function analyzeTone(text, bio = '') {
  const lowerText = (text + ' ' + bio).toLowerCase();
  
  // Technical/Professional indicators
  if (lowerText.match(/\b(api|code|programming|developer|software|tech|engineering|algorithm|data|ai|ml|blockchain)\b/)) {
    return 'technical';
  }
  
  // Business/Professional indicators
  if (lowerText.match(/\b(strategy|business|growth|revenue|market|investment|finance|startup|ceo|founder)\b/)) {
    return 'professional';
  }
  
  // Humorous indicators
  if (lowerText.match(/\b(lol|haha|funny|joke|meme|comedy|laugh)\b/) || text.includes('😂') || text.includes('🤣')) {
    return 'humorous';
  }
  
  // Educational indicators
  if (lowerText.match(/\b(learn|education|teach|tutorial|guide|how to|tips|advice)\b/)) {
    return 'educational';
  }
  
  // Casual indicators
  if (lowerText.match(/\b(just|like|really|pretty|kinda|sorta|gonna|wanna)\b/)) {
    return 'casual';
  }
  
  return 'neutral';
}

/**
 * Create a summary of analysis results for console output
 */
export function createAnalysisSummary(result) {
  return `
📊 ANALYSIS SUMMARY
==================
🔗 URL: ${result.url || 'N/A'}
👤 Author: @${result.author.username} (${result.author.display_name})
✅ Verified: ${result.author.verified ? 'Yes' : 'No'}
👥 Followers: ${formatFollowerCount(result.author.followers)}
🔄 Following: ${formatFollowerCount(result.author.following)}
🎭 Tone: ${result.author.tone}
🧵 Thread: ${result.is_thread ? 'Yes' : 'No'} (${result.thread_count} tweets)

📝 Summary:
${result.summary}

📄 Bio:
${result.author.bio || 'No bio available'}
`;
}

/**
 * Validate analysis result structure
 */
export function validateAnalysisResult(result) {
  const requiredFields = [
    'post_text',
    'summary',
    'is_thread',
    'thread_count',
    'author'
  ];
  
  const requiredAuthorFields = [
    'username',
    'display_name',
    'bio',
    'followers',
    'following',
    'verified',
    'tone'
  ];
  
  // Check main fields
  for (const field of requiredFields) {
    if (!(field in result)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Check author fields
  for (const field of requiredAuthorFields) {
    if (!(field in result.author)) {
      throw new Error(`Missing required author field: ${field}`);
    }
  }
  
  return true;
}
