import axios from "axios";
import dotenv from "dotenv";
import { application } from "express";

dotenv.config();

export class AIAnalyzer {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
    this.baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

    if (!this.apiKey) {
      console.warn("⚠️ OPENROUTER_API_KEY not found, using local analysis only");
    }
  }

  /**
   * Analyze fullText for airdrop opportunities and provide Bengali summary
   * @param {string} fullText - Combined text from all tweets
   * @returns {Object} Analysis result with airdrop prediction and Bengali summary
   */
  async analyzeForAirdrops(fullText) {
    if (!fullText || fullText.trim().length === 0) {
      return this.createEmptyAnalysis();
    }

    console.log("🔍 Analyzing content for airdrop opportunities...");

    try {
      if (this.apiKey) {
        return await this.aiAirdropAnalysis(fullText);
      } else {
        return this.localAirdropAnalysis(fullText);
      }
    } catch (error) {
      console.log("🔄 Falling back to local analysis...");
      return this.localAirdropAnalysis(fullText);
    }
  }

  async aiAirdropAnalysis(fullText) {
    const prompt = this.createAirdropAnalysisPrompt(fullText);

    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are an expert crypto airdrop analyst. Analyze content for potential airdrop opportunities and provide responses in Bengali language. Return only valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1200,
        
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          'X-Title': 'Twitter Analyzer'  
        },
        timeout: 30000,
      }
    );

    const aiResponse = response.data.choices[0].message.content.trim();

    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      console.error("❌ Failed to parse AI response, using local analysis");
      return this.localAirdropAnalysis(fullText);
    }
  }

  createAirdropAnalysisPrompt(fullText) {
    return `
You are an expert crypto/web3 analyst specializing in identifying airdrop opportunities, new blockchain projects, and early-stage investment opportunities. Analyze the following content comprehensively.

CONTENT TO ANALYZE:
${fullText}

ANALYSIS FRAMEWORK:
First, provide a general summary of what this content is about, then conduct detailed airdrop/opportunity analysis.

DETECTION CATEGORIES:
1. **Blockchain Infrastructure**: Layer 1/Layer 2 projects, new blockchains, scaling solutions
2. **DeFi Protocols**: DEXs, lending protocols, yield farming, liquidity mining, staking
3. **NFT Projects**: Mint opportunities, NFT drops, gaming NFTs, utility NFTs
4. **AI/ML Projects**: AI-based crypto projects, machine learning tokens, AI agents
5. **Gaming/Metaverse**: Play-to-earn, gaming tokens, virtual world projects
6. **TestNet Opportunities**: Alpha/beta testing, testnet rewards, early access programs
7. **Quest Platforms**: Task-based rewards, social media quests, community challenges
8. **Fundraising**: ICO, IDO, IEO, seed rounds, venture funding announcements
9. **Points/Farming Systems**: Point accumulation systems, farming opportunities, reward programs
10. **Cross-chain/Bridge**: Interoperability projects, bridge protocols, multi-chain solutions
11. **Privacy/Security**: Privacy coins, security-focused projects, encryption protocols
12. **Infrastructure**: Oracles, storage solutions, indexing protocols, middleware
13. **Social/Creator Economy**: Creator tokens, social tokens, community platforms
14. **Governance**: DAO launches, governance tokens, voting mechanisms

SCORING CRITERIA (1-10):
- Direct airdrop mention: +3 points
- Testnet/beta access: +2 points
- New project launch: +2 points  
- Early access program: +2 points
- Points/farming system: +2 points
- Quest/task opportunities: +1 point
- Fundraising news: +1 point
- Partnership announcements: +1 point

INSTRUCTIONS:
1. First, provide a brief summary of the content in Bengali
2. Identify the project category and type
3. Rate airdrop potential (1-10) based on scoring criteria
4. List specific actionable opportunities
5. Return ONLY valid JSON in this exact format:

{
  "content_summary_bangla": "এই পোস্টে [বিষয়ের সংক্ষিপ্ত বর্ণনা]",
  "project_category": "Layer 1/Layer 2/DeFi/NFT/AI/Gaming/TestNet/Quest/Fundraising/Points/CrossChain/Privacy/Infrastructure/Social/Governance",
  "airdrop_potential": 8,
  "has_airdrop_opportunity": true,
  "summary_bangla": "এই প্রজেক্টে এয়ারড্রপের উচ্চ সম্ভাবনা রয়েছে কারণ [কারণ]",
  "key_points_bangla": [
    "নতুন Layer 2 সলিউশন লঞ্চ হচ্ছে",
    "টেস্টনেট পার্টিসিপেশনের সুযোগ",
    "আর্লি ইউজার রিওয়ার্ড প্রোগ্রাম"
  ],
  "action_steps_bangla": [
    "প্রজেক্টের টেস্টনেট ব্যবহার করুন",
    "সোশ্যাল মিডিয়া টাস্ক সম্পূর্ণ করুন",
    "কমিউনিটিতে অ্যাক্টিভ থাকুন"
  ],
  "opportunity_type": "TestNet Rewards/Early Access/Quest Program/Farming/NFT Mint/Token Launch",
  "projects_mentioned": ["ProjectName1", "ProjectName2"],
  "risk_level": "low/medium/high",
  "confidence_level": "high",
  "estimated_timeline": "এখনই/১ সপ্তাহ/১ মাস/৩ মাস/অনিশ্চিত",
  "additional_context": "অতিরিক্ত গুরুত্বপূর্ণ তথ্য বা সতর্কতা"
}

IMPORTANT:
- If content is about general market discussion without specific opportunities, set has_airdrop_opportunity to false
- For high-value opportunities (fundraising, major launches), increase airdrop_potential score
- Consider both immediate and future opportunities
- Factor in project legitimacy and risk assessment
- Provide actionable, specific steps rather than generic advice

Return ONLY the JSON object, no additional text.
`;
  }

  localAirdropAnalysis(fullText) {
    const text = fullText.toLowerCase();

    // Enhanced keyword detection for different categories
    const categoryKeywords = {
      layer1_layer2: ['layer 1', 'layer 2', 'l1', 'l2', 'blockchain', 'mainnet', 'scaling', 'rollup', 'sidechain'],
      defi: ['defi', 'dex', 'swap', 'liquidity', 'yield', 'farming', 'staking', 'lending', 'protocol'],
      nft: ['nft', 'mint', 'collection', 'pfp', 'avatar', 'opensea', 'metadata', 'rare'],
      ai_ml: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'neural', 'gpt', 'llm', 'agent'],
      gaming: ['gaming', 'play-to-earn', 'p2e', 'metaverse', 'gamefi', 'rpg', 'mmorpg'],
      testnet: ['testnet', 'alpha', 'beta', 'sandbox', 'devnet', 'preview', 'test network'],
      quest: ['quest', 'task', 'mission', 'challenge', 'bounty', 'galxe', 'zealy', 'crew3'],
      fundraising: ['funding', 'raise', 'seed', 'series a', 'ico', 'ido', 'ieo', 'presale', 'round'],
      points: ['points', 'farming', 'rewards', 'earn', 'accumulate', 'multiplier', 'boost'],
      crosschain: ['bridge', 'cross-chain', 'multichain', 'interoperability', 'wrapped', 'portal'],
      privacy: ['privacy', 'anonymous', 'zero-knowledge', 'zk', 'private', 'encryption'],
      infrastructure: ['oracle', 'rpc', 'api', 'indexer', 'infrastructure', 'node', 'validator']
    };

    // Direct airdrop indicators
    const airdropKeywords = [
      'airdrop', 'drop', 'token distribution', 'free tokens', 'claim',
      'whitelist', 'early access', 'early adopter', 'genesis user',
      'retroactive', 'snapshot', 'eligibility', 'allocation'
    ];

    // Action-oriented keywords
    const actionKeywords = [
      'join', 'participate', 'follow', 'retweet', 'like', 'share',
      'connect wallet', 'mint', 'stake', 'provide liquidity', 'swap',
      'bridge', 'deposit', 'claim', 'register', 'sign up', 'invite',
      'complete tasks', 'verify', 'kyc', 'discord', 'telegram'
    ];

    // Count matches for each category
    let potential = 0;
    let detectedCategory = 'General';
    let opportunityType = '';
    
    // Check for direct airdrop mentions (high value)
    const airdropMatches = airdropKeywords.filter(keyword => text.includes(keyword));
    potential += airdropMatches.length * 3;

    // Check categories
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        potential += matches.length * 2;
        detectedCategory = category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Determine opportunity type based on category
        if (category === 'testnet') opportunityType = 'TestNet Rewards';
        else if (category === 'nft') opportunityType = 'NFT Mint';
        else if (category === 'defi') opportunityType = 'DeFi Farming';
        else if (category === 'quest') opportunityType = 'Quest Program';
        else if (category === 'points') opportunityType = 'Points Farming';
        else if (category === 'fundraising') opportunityType = 'Token Launch';
        else opportunityType = 'Early Access';
      }
    }

    // Check for action keywords
    const actionMatches = actionKeywords.filter(keyword => text.includes(keyword));
    potential += actionMatches.length;

    // Cap at 10
    potential = Math.min(10, potential);

    // Extract project names and mentions
    const projects = this.extractProjectNames(fullText);
    
    // Determine risk level
    const riskLevel = this.assessRiskLevel(text, airdropMatches, projects);
    
    // Create comprehensive Bengali summary
    const hasOpportunity = potential >= 4;
    let summaryBangla = '';
    let contentSummary = '';

    if (hasOpportunity) {
      contentSummary = `এই পোস্টে ${detectedCategory} সম্পর্কিত একটি প্রজেক্টের তথ্য রয়েছে`;
      summaryBangla = `এই প্রজেক্টে এয়ারড্রপের ${potential >= 7 ? 'উচ্চ' : 'মাঝারি'} সম্ভাবনা রয়েছে। ${
        airdropMatches.length > 0 
          ? 'সরাসরি এয়ারড্রপের উল্লেখ পাওয়া গেছে।' 
          : 'আর্লি পার্টিসিপেশনের মাধ্যমে রিওয়ার্ড পাওয়ার সুযোগ আছে।'
      }`;
    } else {
      contentSummary = `এই পোস্টে সাধারণ ক্রিপ্টো/ওয়েব৩ তথ্য রয়েছে`;
      summaryBangla = `এই পোস্টে এয়ারড্রপের সরাসরি সম্ভাবনা কম। তবে ভবিষ্যতে সুযোগ তৈরি হতে পারে।`;
    }

    // Estimate timeline
    const timeline = this.estimateTimeline(text, airdropMatches, actionMatches);

    return {
      content_summary_bangla: contentSummary,
      project_category: detectedCategory,
      airdrop_potential: potential,
      has_airdrop_opportunity: hasOpportunity,
      summary_bangla: summaryBangla,
      key_points_bangla: this.createEnhancedKeyPoints(airdropMatches, actionMatches, detectedCategory),
      action_steps_bangla: this.createDetailedActionSteps(hasOpportunity, actionMatches, detectedCategory),
      opportunity_type: opportunityType || 'General Information',
      projects_mentioned: projects,
      risk_level: riskLevel,
      confidence_level: potential >= 7 ? 'high' : potential >= 4 ? 'medium' : 'low',
      estimated_timeline: timeline,
      additional_context: this.generateAdditionalContext(detectedCategory, riskLevel, potential)
    };
  }

  extractProjectNames(text) {
    // Simple regex to find @mentions and #hashtags that might be project names
    const mentions = text.match(/@[A-Za-z0-9_]+/g) || [];
    const hashtags = text.match(/#[A-Za-z0-9_]+/g) || [];

    return [...mentions, ...hashtags]
      .map((item) => item.substring(1)) // Remove @ and #
      .filter((item) => item.length > 2)
      .slice(0, 5); // Limit to 5 projects
  }

  assessRiskLevel(text, airdropMatches, projects) {
    // High risk indicators
    if (text.includes('guaranteed') || text.includes('100%') || 
        text.includes('quick rich') || text.includes('pump')) {
      return 'high';
    }
    
    // Low risk indicators  
    if (projects.length > 0 && (text.includes('testnet') || text.includes('beta') || 
        text.includes('official') || airdropMatches.length > 0)) {
      return 'low';
    }
    
    return 'medium';
  }

  estimateTimeline(text, airdropMatches, actionMatches) {
    if (text.includes('now') || text.includes('today') || text.includes('live')) {
      return 'এখনই';
    }
    if (text.includes('week') || text.includes('7 days')) {
      return '১ সপ্তাহ';
    }
    if (text.includes('month') || text.includes('30 days')) {
      return '১ মাস';
    }
    if (text.includes('quarter') || text.includes('q1') || text.includes('q2')) {
      return '৩ মাস';
    }
    if (airdropMatches.length > 0 || actionMatches.length > 2) {
      return '১ মাস';
    }
    return 'অনিশ্চিত';
  }

  generateAdditionalContext(category, riskLevel, potential) {
    if (riskLevel === 'high') {
      return 'সতর্কতা: উচ্চ ঝুঁকিপূর্ণ, যাচাই করে এগিয়ে চলুন';
    }
    if (potential >= 8) {
      return 'উচ্চ সম্ভাবনাময় সুযোগ, দ্রুত পদক্ষেপ নিন';
    }
    if (category.includes('TestNet') || category.includes('Quest')) {
      return 'সক্রিয় অংশগ্রহণ প্রয়োজন, নিয়মিত ফলো আপ করুন';
    }
    return 'নিয়মিত আপডেটের জন্য প্রজেক্ট ফলো করুন';
  }

  createEnhancedKeyPoints(airdropMatches, actionMatches, category) {
    const points = [];

    // Category-specific points
    if (category.includes('Layer')) {
      points.push('নতুন ব্লকচেইন নেটওয়ার্ক লঞ্চ হচ্ছে');
    }
    if (category.includes('DeFi')) {
      points.push('DeFi প্রোটোকলে লিকুইডিটি প্রদানের সুযোগ');
    }
    if (category.includes('NFT')) {
      points.push('NFT মিন্টিং বা কালেকশনের সুযোগ');
    }
    if (category.includes('AI')) {
      points.push('AI ভিত্তিক প্রজেক্টে আর্লি এক্সেস');
    }
    if (category.includes('Gaming')) {
      points.push('গেমিং এবং Play-to-Earn সুযোগ');
    }

    // Airdrop-specific points
    if (airdropMatches.includes('testnet')) {
      points.push('টেস্টনেট এক্টিভিটির সুযোগ রয়েছে');
    }
    if (airdropMatches.includes('airdrop')) {
      points.push('এয়ারড্রপের সরাসরি উল্লেখ পাওয়া গেছে');
    }
    if (airdropMatches.includes('early access')) {
      points.push('আর্লি এক্সেস প্রোগ্রাম উপলব্ধ');
    }
    if (actionMatches.includes('farming') || actionMatches.includes('stake')) {
      points.push('ফার্মিং বা স্টেকিং রিওয়ার্ড');
    }
    if (actionMatches.includes('quest') || actionMatches.includes('task')) {
      points.push('কোয়েস্ট বা টাস্ক কমপ্লিট করার সুযোগ');
    }

    if (points.length === 0) {
      points.push('সাধারণ ক্রিপ্টো তথ্য ও আপডেট');
    }

    return points;
  }

  createDetailedActionSteps(hasOpportunity, actionMatches, category) {
    if (!hasOpportunity) {
      return ['আপাতত কোনো নির্দিষ্ট কর্মপ্রণালী প্রয়োজন নেই'];
    }

    const steps = [];

    // Category-specific actions
    if (category.includes('TestNet')) {
      steps.push('টেস্টনেট এ একাউন্ট তৈরি করুন এবং ট্রানজেকশন করুন');
    }
    if (category.includes('NFT')) {
      steps.push('হোয়াইটলিস্টের জন্য রেজিস্ট্রেশন করুন');
    }
    if (category.includes('DeFi')) {
      steps.push('প্রোটোকলে লিকুইডিটি প্রদান করুন');
    }
    if (category.includes('Quest')) {
      steps.push('সকল কোয়েস্ট টাস্ক সম্পূর্ণ করুন');
    }

    // Action-specific steps
    if (actionMatches.includes('follow')) {
      steps.push('সোশ্যাল মিডিয়া চ্যানেল ফলো করুন');
    }
    if (actionMatches.includes('connect wallet')) {
      steps.push('ওয়ালেট কানেক্ট করুন এবং ভেরিফাই করুন');
    }
    if (actionMatches.includes('discord') || actionMatches.includes('telegram')) {
      steps.push('কমিউনিটি চ্যানেলে যোগ দিন এবং সক্রিয় থাকুন');
    }
    if (actionMatches.includes('invite') || actionMatches.includes('referral')) {
      steps.push('রেফারেল প্রোগ্রামে অংশগ্রহণ করুন');
    }

    // Default comprehensive steps
    if (steps.length === 0) {
      steps.push('প্রজেক্টের অফিসিয়াল চ্যানেল চেক করুন');
      steps.push('কমিউনিটিতে সক্রিয় থাকুন');
      steps.push('আপডেটের জন্য নিয়মিত ফলো করুন');
    }

    // Always add monitoring step
    steps.push('প্রজেক্টের রোডম্যাপ এবং টোকেনোমিক্স যাচাই করুন');

    return steps;
  }

  createEmptyAnalysis() {
    return {
      content_summary_bangla: "কোনো কন্টেন্ট বিশ্লেষণ করার জন্য পাওয়া যায়নি।",
      project_category: "Unknown",
      airdrop_potential: 0,
      has_airdrop_opportunity: false,
      summary_bangla: "কোনো কন্টেন্ট বিশ্লেষণ করার জন্য পাওয়া যায়নি।",
      key_points_bangla: ["কন্টেন্ট খালি বা অনুপস্থিত"],
      action_steps_bangla: ["বৈধ টুইটার URL প্রদান করুন"],
      opportunity_type: "None",
      projects_mentioned: [],
      risk_level: "none",
      confidence_level: "none",
      estimated_timeline: "অনিশ্চিত",
      additional_context: "কোনো তথ্য নেই"
    };
  }
}

export default AIAnalyzer;
