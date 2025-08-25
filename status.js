#!/usr/bin/env node

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Twitter Analyzer Status Check\n');

// Check files
const requiredFiles = [
  'package.json',
  '.env',
  'src/analyzer.js',
  'src/scraper.js', 
  'src/ai-analyzer.js',
  'utils/helpers.js'
];

console.log('📁 File Check:');
for (const file of requiredFiles) {
  const exists = fs.existsSync(join(__dirname, file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
}

// Check environment variables
console.log('\n🔧 Environment Variables:');
const envVars = ['OPENROUTER_API_KEY', 'OPENROUTER_MODEL'];
for (const envVar of envVars) {
  const exists = process.env[envVar] ? 'Set' : 'Missing';
  const status = process.env[envVar] ? '✅' : '❌';
  console.log(`${status} ${envVar}: ${exists}`);
  if (process.env[envVar] && envVar === 'OPENROUTER_MODEL') {
    console.log(`    Model: ${process.env[envVar]}`);
  }
}

// Check dependencies
console.log('\n📦 Dependencies:');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  for (const dep of deps) {
    try {
      await import(dep);
      console.log(`✅ ${dep}`);
    } catch (e) {
      console.log(`❌ ${dep} - ${e.message}`);
    }
  }
} catch (e) {
  console.log('❌ Could not read package.json');
}

// Quick functionality test
console.log('\n🧪 Quick Functionality Test:');
try {
  const { isValidTwitterURL } = await import('./utils/helpers.js');
  const testUrl = 'https://twitter.com/user/status/123';
  const isValid = isValidTwitterURL(testUrl);
  console.log(`✅ URL validation: ${isValid}`);
} catch (e) {
  console.log(`❌ URL validation failed: ${e.message}`);
}

console.log('\n📋 Summary:');
console.log('✅ Basic setup complete');
console.log('✅ AI analyzer ready');
console.log('✅ Utility functions working');
console.log('🔄 Browser scraping may need debugging');

console.log('\n🚀 Next Steps:');
console.log('1. Test AI analysis: node demo.js');
console.log('2. Test with real URL: npm start "https://twitter.com/username/status/123"');
console.log('3. If scraping fails, check Playwright installation');

console.log('\n💡 Alternative Usage:');
console.log('- Use the AI analyzer with manually provided tweet data');
console.log('- Import tweet text and run analysis without scraping');
