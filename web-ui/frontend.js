import express from 'express';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { scrapeTweets, DEFAULT_CONFIG } from '../src/fetchPost.js';
import Database from '../database/database.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TwitterAnalysisServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || process.env.WEB_PORT || 3000;
    this.db = new Database();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  async initialize() {
    await this.db.initialize();
    console.log('🌐 Web UI database connection established');
  }

  setupMiddleware() {
    // Trust proxy for Heroku (required for secure sessions behind load balancer)
    this.app.set('trust proxy', 1);
    
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Session management - optimized for Heroku

    const sessionConfig = {
      secret: process.env.WEB_SESSION_SECRET || 'twitter-analyzer-secret-' + Math.random(),
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: false, // Heroku handles HTTPS at load balancer
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
      }
    };

    // Suppress MemoryStore warning for Heroku (single dyno is fine for this app)
    if (process.env.NODE_ENV === 'production') {
      console.log('� Production session configuration loaded');
    }

    this.app.use(session(sessionConfig));
  }

  setupRoutes() {
    // Login routes
    this.app.get('/login', (req, res) => {
      res.send(this.generateLoginPage());
    });

    this.app.post('/login', async (req, res) => {
      const { password } = req.body;
      const adminPassword = process.env.WEB_ADMIN_PASSWORD || 'admin123';
      
      console.log(`🔐 Login attempt - Password provided: ${password ? 'Yes' : 'No'}, Expected: ${adminPassword}`);
      
      if (password === adminPassword) {
        req.session.authenticated = true;
        console.log('✅ Login successful, session set');
        res.redirect('/dashboard');
      } else {
        console.log('❌ Login failed - invalid password');
        res.send(this.generateLoginPage('Invalid password'));
      }
    });

    // Dashboard
    this.app.get('/dashboard', this.requireAuth.bind(this), async (req, res) => {
      try {
        const analyses = await this.getTwitterAnalysesFromDB(20);
        res.send(this.generateDashboardPage(analyses));
      } catch (error) {
        res.status(500).send('Dashboard error: ' + error.message);
      }
    });

    // Analysis detail view
    this.app.get('/analysis/:id', this.requireAuth.bind(this), async (req, res) => {
      try {
        const analysis = await this.getTwitterAnalysisByIdFromDB(req.params.id);
        if (!analysis) {
          return res.status(404).send('Analysis not found');
        }
        res.send(this.generateAnalysisPage(analysis));
      } catch (error) {
        res.status(500).send('Error loading analysis: ' + error.message);
      }
    });

    // API for Twitter analysis
    this.app.post('/api/analyze-twitter', this.requireAuth.bind(this), async (req, res) => {
      try {
        const { urls } = req.body;
        
        if (!urls || !Array.isArray(urls)) {
          return res.status(400).json({ error: 'URLs array is required' });
        }

        // Validate Twitter URLs
        for (const url of urls) {
          if (!this.isValidURL(url) || !this.isTwitterURL(url)) {
            return res.status(400).json({ error: `Invalid Twitter/X URL: ${url}` });
          }
        }

        // Perform analysis
        try {
          const result = await scrapeTweets(urls, DEFAULT_CONFIG);
          
          if (!result.success) {
            throw new Error(result.error || 'Twitter scraping failed');
          }

          // Save analysis to database
          const analysisData = {
            id: Date.now().toString(),
            url: urls.join(', '), // Store multiple URLs as comma-separated
            type: 'twitter-airdrop',
            status: 'completed',
            metadata: {
              urls: urls,
              totalPosts: result.totalPosts,
              created_at: new Date().toISOString()
            },
            content: {
              fullText: result.fullText,
              success: result.success
            },
            aiAnalysis: result.analysis || {}
          };

          await this.saveTwitterAnalysisToDB(analysisData);
          
          // Return response with analysis data
          const responseData = {
            id: analysisData.id,
            urls: urls,
            type: 'twitter-airdrop',
            fullText: result.fullText,
            analysis: result.analysis,
            totalPosts: result.totalPosts,
            created_at: analysisData.metadata.created_at,
            success: result.success
          };
          
          res.json(responseData);
          
        } catch (scrapingError) {
          // Handle browser/scraping specific errors
          if (scrapingError.message.includes('Browser not available') || 
              scrapingError.message.includes('Playwright browsers are not installed')) {
            
            // Save error analysis to database for tracking
            const errorAnalysisData = {
              id: Date.now().toString(),
              url: urls.join(', '),
              type: 'twitter-airdrop',
              status: 'failed',
              metadata: {
                urls: urls,
                totalPosts: 0,
                created_at: new Date().toISOString(),
                error: 'Browser unavailable on Heroku'
              },
              content: {
                fullText: '',
                success: false,
                error: scrapingError.message
              },
              aiAnalysis: {
                summary_bangla: 'দুঃখিত, বর্তমানে Heroku-তে ব্রাউজার সাপোর্ট উপলব্ধ নেই। Twitter স্ক্র্যাপিং সেবা সাময়িকভাবে বন্ধ আছে।',
                has_airdrop_opportunity: false,
                airdrop_potential: 0,
                confidence_level: 'high',
                error_bangla: 'প্রযুক্তিগত সমস্যার কারণে এই মুহূর্তে Twitter বিশ্লেষণ করা সম্ভব নয়।'
              }
            };

            await this.saveTwitterAnalysisToDB(errorAnalysisData);
            
            res.status(503).json({ 
              error: 'Twitter scraping service temporarily unavailable on Heroku. Browser support is not currently installed.',
              error_bangla: 'Heroku-তে Twitter স্ক্র্যাপিং সেবা সাময়িকভাবে অনুপলব্ধ। ব্রাউজার সাপোর্ট বর্তমানে ইনস্টল করা নেই।',
              id: errorAnalysisData.id,
              success: false
            });
          } else {
            throw scrapingError;
          }
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get all analyses
    this.app.get('/api/analyses', this.requireAuth.bind(this), async (req, res) => {
      try {
        const analyses = await this.getTwitterAnalysesFromDB(50);
        res.json(analyses);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Delete analysis
    this.app.delete('/api/analysis/:id', this.requireAuth.bind(this), async (req, res) => {
      try {
        const { id } = req.params;
        const success = await this.deleteTwitterAnalysisFromDB(id);
        
        if (success) {
          res.json({ success: true, message: 'Analysis deleted successfully' });
        } else {
          res.status(404).json({ error: 'Analysis not found' });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Logout
    this.app.post('/logout', (req, res) => {
      req.session.destroy();
      res.redirect('/login');
    });

    // Home redirect
    this.app.get('/', (req, res) => {
      if (req.session.authenticated) {
        res.redirect('/dashboard');
      } else {
        res.redirect('/login');
      }
    });
  }

  requireAuth(req, res, next) {
    if (req.session.authenticated) {
      return next();
    }
    res.redirect('/login');
  }

  // Database storage methods
  async saveTwitterAnalysisToDB(analysisData) {
    try {
      await this.db.saveAnalysis(analysisData);
      console.log(`📊 Analysis saved to database: ${analysisData.id}`);
    } catch (error) {
      console.error('Error saving analysis to database:', error);
      throw error;
    }
  }

  async getTwitterAnalysesFromDB(limit = 20) {
    try {
      const analyses = await this.db.getRecentAnalyses(null, limit);
      
      // Transform database format to frontend format
      return analyses.map(analysis => ({
        id: analysis.id,
        urls: analysis.metadata?.urls || [analysis.url],
        type: analysis.type,
        fullText: analysis.content?.fullText || '',
        analysis: analysis.ai_analysis || {},
        totalPosts: analysis.metadata?.totalPosts || 0,
        created_at: analysis.metadata?.created_at || analysis.created_at,
        success: analysis.content?.success || false
      }));
    } catch (error) {
      console.error('Error fetching analyses from database:', error);
      return [];
    }
  }

  async getTwitterAnalysisByIdFromDB(id) {
    try {
      const analysis = await this.db.getAnalysis(id);
      if (!analysis) return null;
      
      // Transform database format to frontend format
      return {
        id: analysis.id,
        urls: analysis.metadata?.urls || [analysis.url],
        type: analysis.type,
        fullText: analysis.content?.fullText || '',
        analysis: analysis.ai_analysis || {},
        totalPosts: analysis.metadata?.totalPosts || 0,
        created_at: analysis.metadata?.created_at || analysis.created_at,
        success: analysis.content?.success || false
      };
    } catch (error) {
      console.error('Error fetching analysis by ID from database:', error);
      return null;
    }
  }

  async deleteTwitterAnalysisFromDB(id) {
    try {
      // Check if analysis exists
      const analysis = await this.db.getAnalysis(id);
      if (!analysis) return false;
      
      // Delete from database
      await this.db.run('DELETE FROM url_analyses WHERE id = ?', [id]);
      console.log(`🗑️ Analysis deleted from database: ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting analysis from database:', error);
      throw error;
    }
  }

  // Validation methods
  isValidURL(string) {
    try {
      new URL(string);
      return true;
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

  // HTML Generation
  generateLoginPage(error = '') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Twitter Airdrop Analyzer - Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 min-h-screen flex items-center justify-center">
    <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">🐦 Twitter Airdrop Analyzer</h1>
            <p class="text-gray-600">বাংলা এয়ারড্রপ বিশ্লেষণ</p>
        </div>
        
        ${error ? `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">${error}</div>` : ''}
        
        <form method="POST" action="/login" class="space-y-6">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input 
                    type="password" 
                    name="password" 
                    required 
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter admin password"
                />
            </div>
            
            <button 
                type="submit" 
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
            >
                🔓 Access Dashboard
            </button>
        </form>
        
        <div class="mt-8 text-center text-sm text-gray-500">
            <p>Twitter/X থেকে এয়ারড্রপ সম্ভাবনা বিশ্লেষণ</p>
        </div>
    </div>
</body>
</html>`;
  }

  generateDashboardPage(analyses) {
    // Calculate statistics
    const totalAnalyses = analyses.length;
    const opportunityAnalyses = analyses.filter(a => a.analysis?.has_airdrop_opportunity).length;
    const totalTweets = analyses.reduce((sum, a) => sum + (a.totalPosts || 0), 0);
    
    const analysesHTML = analyses.map(analysis => {
      const date = new Date(analysis.created_at).toLocaleDateString('bn-BD');
      const airdropScore = analysis.analysis?.airdrop_potential || 0;
      const scoreColor = airdropScore >= 7 ? 'green' : airdropScore >= 4 ? 'yellow' : 'red';
      
      return `
        <div class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200 analysis-card" data-id="${analysis.id}">
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center space-x-3">
              <input type="checkbox" class="analysis-checkbox" data-id="${analysis.id}" onchange="updateBulkDeleteButton()">
              <h3 class="font-semibold text-lg">📊 এয়ারড্রপ বিশ্লেষণ</h3>
            </div>
            <span class="px-2 py-1 text-xs rounded-full bg-${scoreColor}-100 text-${scoreColor}-800">
              স্কোর: ${airdropScore}/10
            </span>
          </div>
          
          <p class="text-gray-600 text-sm mb-3">${analysis.totalPosts} টি টুইট • ${date}</p>
          
          ${analysis.analysis?.summary_bangla ? `
            <p class="text-gray-700 text-sm mb-3">${analysis.analysis.summary_bangla.substring(0, 100)}...</p>
          ` : ''}
          
          <div class="flex justify-between items-center">
            <span class="px-2 py-1 text-xs rounded ${analysis.analysis?.has_airdrop_opportunity ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}">
              ${analysis.analysis?.has_airdrop_opportunity ? '✅ সুযোগ আছে' : '❌ সুযোগ নেই'}
            </span>
            <div class="flex items-center space-x-2">
              <a href="/analysis/${analysis.id}" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                বিস্তারিত দেখুন →
              </a>
              <button onclick="deleteAnalysis('${analysis.id}')" class="text-red-600 hover:text-red-800 text-sm font-medium ml-2" title="Delete Analysis">
                🗑️
              </button>
            </div>
          </div>
        </div>`;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Twitter Airdrop Analyzer - Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen" dir="ltr">
    <!-- Navigation -->
    <nav class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center space-x-4">
                    <h1 class="text-xl font-bold text-gray-900">🐦 Twitter Airdrop Analyzer</h1>
                    <span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Dashboard</span>
                </div>
                
                <div class="flex items-center space-x-4">
                    <button onclick="showNewAnalysisModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                        ➕ নতুন বিশ্লেষণ
                    </button>
                    <form method="POST" action="/logout" class="inline">
                        <button type="submit" class="text-gray-600 hover:text-gray-900 text-sm">
                            🚪 Logout
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-2 bg-blue-100 rounded-lg">
                        <span class="text-2xl">📊</span>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-medium text-gray-900">মোট বিশ্লেষণ</h3>
                        <p class="text-2xl font-bold text-blue-600">${totalAnalyses}</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-2 bg-green-100 rounded-lg">
                        <span class="text-2xl">🎯</span>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-medium text-gray-900">এয়ারড্রপ সুযোগ</h3>
                        <p class="text-2xl font-bold text-green-600">${opportunityAnalyses}</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="p-2 bg-purple-100 rounded-lg">
                        <span class="text-2xl">🌐</span>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-medium text-gray-900">মোট টুইট</h3>
                        <p class="text-2xl font-bold text-purple-600">${totalTweets}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Recent Analyses -->
        <div class="mb-8">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold text-gray-900">সাম্প্রতিক বিশ্লেষণসমূহ</h2>
                <div class="flex items-center space-x-3">
                    <button onclick="toggleSelectAll()" id="selectAllBtn" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
                        ☑️ সব নির্বাচন
                    </button>
                    <button onclick="deleteSelected()" id="deleteSelectedBtn" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm hidden">
                        🗑️ নির্বাচিত মুছুন
                    </button>
                    <button onclick="location.reload()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                        🔄 রিফ্রেশ
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${analysesHTML || '<div class="col-span-full text-center text-gray-500 py-8">এখনো কোনো বিশ্লেষণ নেই</div>'}
            </div>
        </div>
    </div>

    <!-- New Analysis Modal -->
    <div id="newAnalysisModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center">
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 class="text-lg font-bold mb-4">🔍 নতুন Twitter বিশ্লেষণ</h3>
            <form onsubmit="analyzeTwitter(event)">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Twitter URLs (প্রতি লাইনে একটি)</label>
                    <textarea 
                        id="urlsInput" 
                        required 
                        rows="6"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="https://x.com/username/status/123
https://x.com/username/status/456"
                    ></textarea>
                </div>
                <div class="flex justify-end space-x-3">
                    <button type="button" onclick="hideNewAnalysisModal()" class="px-4 py-2 text-gray-600 hover:text-gray-900">
                        বাতিল
                    </button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                        🚀 বিশ্লেষণ করুন
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function showNewAnalysisModal() {
            document.getElementById('newAnalysisModal').classList.remove('hidden');
            document.getElementById('newAnalysisModal').classList.add('flex');
        }
        
        function hideNewAnalysisModal() {
            document.getElementById('newAnalysisModal').classList.add('hidden');
            document.getElementById('newAnalysisModal').classList.remove('flex');
        }
        
        async function analyzeTwitter(event) {
            event.preventDefault();
            const urlsText = document.getElementById('urlsInput').value;
            const urls = urlsText.split('\\n').map(url => url.trim()).filter(url => url.length > 0);
            
            if (urls.length === 0) {
                alert('অন্তত একটি URL প্রদান করুন');
                return;
            }
            
            // Show loading state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '⏳ বিশ্লেষণ করা হচ্ছে...';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch('/api/analyze-twitter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    // Redirect to analysis page
                    window.location.href = '/analysis/' + result.id;
                } else {
                    alert('বিশ্লেষণ ব্যর্থ: ' + result.error);
                }
            } catch (error) {
                alert('নেটওয়ার্ক ত্রুটি: ' + error.message);
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
        
        async function deleteAnalysis(analysisId) {
            if (!confirm('আপনি কি এই বিশ্লেষণটি মুছে ফেলতে চান? এটি পুনরুদ্ধার করা যাবে না।')) {
                return;
            }
            
            try {
                const response = await fetch('/api/analysis/' + analysisId, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    // Reload page to show updated list
                    location.reload();
                } else {
                    alert('মুছে ফেলা ব্যর্থ: ' + result.error);
                }
            } catch (error) {
                alert('নেটওয়ার্ক ত্রুটি: ' + error.message);
            }
        }
        
        function updateBulkDeleteButton() {
            const checkboxes = document.querySelectorAll('.analysis-checkbox:checked');
            const deleteBtn = document.getElementById('deleteSelectedBtn');
            
            if (checkboxes.length > 0) {
                deleteBtn.classList.remove('hidden');
                deleteBtn.innerHTML = '🗑️ ' + checkboxes.length + 'টি মুছুন';
            } else {
                deleteBtn.classList.add('hidden');
            }
        }
        
        function toggleSelectAll() {
            const checkboxes = document.querySelectorAll('.analysis-checkbox');
            const selectAllBtn = document.getElementById('selectAllBtn');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            
            checkboxes.forEach(cb => {
                cb.checked = !allChecked;
            });
            
            selectAllBtn.innerHTML = allChecked ? '☑️ সব নির্বাচন' : '⬜ সব বাতিল';
            updateBulkDeleteButton();
        }
        
        async function deleteSelected() {
            const checkboxes = document.querySelectorAll('.analysis-checkbox:checked');
            const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
            
            if (ids.length === 0) {
                alert('কোনো বিশ্লেষণ নির্বাচিত নয়');
                return;
            }
            
            if (!confirm(ids.length + 'টি বিশ্লেষণ মুছে ফেলা হবে। আপনি কি নিশ্চিত?')) {
                return;
            }
            
            // Show loading state
            const deleteBtn = document.getElementById('deleteSelectedBtn');
            const originalText = deleteBtn.innerHTML;
            deleteBtn.innerHTML = '⏳ মুছে ফেলা হচ্ছে...';
            deleteBtn.disabled = true;
            
            try {
                // Delete each analysis
                for (const id of ids) {
                    await fetch('/api/analysis/' + id, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                // Reload page to show updated list
                location.reload();
            } catch (error) {
                alert('মুছে ফেলায় ত্রুটি: ' + error.message);
                deleteBtn.innerHTML = originalText;
                deleteBtn.disabled = false;
            }
        }
    </script>
</body>
</html>`;
  }

  generateAnalysisPage(analysis) {
    const airdropScore = analysis.analysis?.airdrop_potential || 0;
    const hasOpportunity = analysis.analysis?.has_airdrop_opportunity || false;
    
    return `
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>এয়ারড্রপ বিশ্লেষণ - ${analysis.id}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen" dir="ltr">
    <!-- Navigation -->
    <nav class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center space-x-4">
                    <a href="/dashboard" class="text-blue-600 hover:text-blue-800">← Dashboard</a>
                    <h1 class="text-xl font-bold text-gray-900">বিশ্লেষণের বিস্তারিত</h1>
                </div>
                <div class="flex items-center space-x-4">
                    <button onclick="deleteCurrentAnalysis('${analysis.id}')" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">
                        🗑️ মুছে ফেলুন
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Analysis Header -->
        <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 mb-2">
                        🎯 এয়ারড্রপ বিশ্লেষণ রিপোর্ট
                    </h1>
                    <p class="text-gray-600">${analysis.totalPosts} টি টুইট বিশ্লেষণ করা হয়েছে</p>
                </div>
                <div class="text-right">
                    <span class="px-3 py-1 rounded-full text-sm ${hasOpportunity ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${hasOpportunity ? '✅ সুযোগ আছে' : '❌ সুযোগ নেই'}
                    </span>
                    <p class="text-gray-500 text-sm mt-2">
                        ${new Date(analysis.created_at).toLocaleString('bn-BD')}
                    </p>
                </div>
            </div>
            
            <div class="flex items-center space-x-4 mb-4">
                <div class="flex items-center">
                    <span class="text-2xl mr-2">${airdropScore >= 7 ? '🟢' : airdropScore >= 4 ? '🟡' : '🔴'}</span>
                    <span class="font-medium">এয়ারড্রপ স্কোর: ${airdropScore}/10</span>
                </div>
                <div class="flex items-center">
                    <span class="text-2xl mr-2">🎯</span>
                    <span>বিশ্বাস স্তর: ${analysis.analysis?.confidence_level === 'high' ? 'উচ্চ' : analysis.analysis?.confidence_level === 'medium' ? 'মাঝারি' : 'নিম্ন'}</span>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Left Column -->
            <div class="space-y-6">
                <!-- Summary -->
                ${analysis.analysis?.summary_bangla ? `
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        📝 সারসংক্ষেপ
                    </h2>
                    <p class="text-gray-700 leading-relaxed">${analysis.analysis.summary_bangla}</p>
                </div>` : ''}
                
                <!-- Key Points -->
                ${analysis.analysis?.key_points_bangla ? `
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        🔑 মূল বিষয়সমূহ
                    </h2>
                    <ul class="space-y-2">
                        ${analysis.analysis.key_points_bangla.map(point => `<li class="flex items-start"><span class="text-blue-500 mr-2">•</span><span>${point}</span></li>`).join('')}
                    </ul>
                </div>` : ''}

                <!-- Action Steps -->
                ${analysis.analysis?.action_steps_bangla ? `
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-lg font-bold text-gray-900 mb-4">📋 করণীয়</h2>
                    <ol class="space-y-2">
                        ${analysis.analysis.action_steps_bangla.map((step, index) => `<li class="flex items-start"><span class="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">${index + 1}</span><span>${step}</span></li>`).join('')}
                    </ol>
                </div>` : ''}
            </div>

            <!-- Right Column -->
            <div class="space-y-6">
                <!-- Projects Mentioned -->
                ${analysis.analysis?.projects_mentioned?.length > 0 ? `
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        🏗️ উল্লিখিত প্রজেক্ট
                    </h2>
                    <div class="flex flex-wrap gap-2">
                        ${analysis.analysis.projects_mentioned.map(project => `
                            <span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">${project}</span>
                        `).join('')}
                    </div>
                </div>` : ''}
                
                <!-- Source URLs -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        🔗 সোর্স URL সমূহ
                    </h2>
                    <div class="space-y-2">
                        ${analysis.urls.map((url, index) => `
                            <div class="flex items-center p-2 bg-gray-50 rounded">
                                <span class="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">${index + 1}</span>
                                <a href="${url}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm break-all">${url}</a>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Raw Content -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        📄 মূল কন্টেন্ট
                    </h2>
                    <div class="bg-gray-50 rounded p-4 text-sm text-gray-700 max-h-60 overflow-y-auto">
                        <pre class="whitespace-pre-wrap">${analysis.fullText}</pre>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function deleteCurrentAnalysis(analysisId) {
            if (!confirm('আপনি কি এই বিশ্লেষণটি মুছে ফেলতে চান? এটি পুনরুদ্ধার করা যাবে না।')) {
                return;
            }
            
            try {
                const response = await fetch('/api/analysis/' + analysisId, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    // Redirect to dashboard after successful deletion
                    window.location.href = '/dashboard';
                } else {
                    alert('মুছে ফেলা ব্যর্থ: ' + result.error);
                }
            } catch (error) {
                alert('নেটওয়ার্ক ত্রুটি: ' + error.message);
            }
        }
    </script>
</body>
</html>`;
  }

  async start() {
    await this.initialize();
    
    // Bind to all interfaces in production (Heroku requirement)
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    
    this.app.listen(this.port, host, () => {
      console.log(`🌐 Twitter Airdrop Analyzer running on http://${host}:${this.port}`);
      console.log(`🔐 Admin password: ${process.env.WEB_ADMIN_PASSWORD || 'admin123'}`);
      console.log(`📊 Using database for analysis storage`);
      
      if (process.env.NODE_ENV === 'production') {
        console.log('🚀 Production mode: Ready to handle requests');
      }
    });
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new TwitterAnalysisServer();
  server.start().catch(console.error);
}

export default TwitterAnalysisServer;
