import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

export class Database {
  constructor(dbPath = process.env.DATABASE_PATH || './database/analyzer.db') {
    this.dbPath = dbPath;
    this.db = null;
    
    // Ensure database directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err.message);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        username TEXT,
        first_name TEXT,
        is_admin BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // URL analyses table
      `CREATE TABLE IF NOT EXISTS url_analyses (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        user_id INTEGER,
        type TEXT,
        status TEXT,
        metadata TEXT,
        content TEXT,
        ai_analysis TEXT,
        screenshot_path TEXT,
        trust_score INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // Web sessions table
      `CREATE TABLE IF NOT EXISTS web_sessions (
        session_id TEXT PRIMARY KEY,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // Settings table
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Audit log table
      `CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }

    // Create default admin user if not exists
    await this.createDefaultAdmin();
  }

  async createDefaultAdmin() {
    const adminExists = await this.get(
      'SELECT id FROM users WHERE is_admin = 1 LIMIT 1'
    );
    
    if (!adminExists) {
      await this.run(`
        INSERT INTO users (telegram_id, username, first_name, is_admin, is_active)
        VALUES ('admin', 'admin', 'Administrator', 1, 1)
      `);
      console.log('✅ Created default admin user');
    }
  }

  // Helper methods for database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // User management methods
  async createUser(telegramId, username = null, firstName = null) {
    try {
      const result = await this.run(`
        INSERT INTO users (telegram_id, username, first_name)
        VALUES (?, ?, ?)
      `, [telegramId, username, firstName]);
      
      return await this.get('SELECT * FROM users WHERE id = ?', [result.id]);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        // User already exists, return existing user
        return await this.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
      }
      throw error;
    }
  }

  async getUser(telegramId) {
    return await this.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
  }

  async updateUserActivity(telegramId) {
    await this.run(
      'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE telegram_id = ?',
      [telegramId]
    );
  }

  async isUserAuthorized(telegramId) {
    const user = await this.getUser(telegramId);
    return user && user.is_active;
  }

  async isUserAdmin(telegramId) {
    const user = await this.getUser(telegramId);
    return user && user.is_admin;
  }

  // URL analysis methods
  async saveAnalysis(analysis, userId = null) {
    await this.run(`
      INSERT INTO url_analyses (
        id, url, user_id, type, status, metadata, content, 
        ai_analysis, screenshot_path, trust_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      analysis.id,
      analysis.url,
      userId,
      analysis.type || 'unknown',
      analysis.status || 'completed',
      JSON.stringify(analysis.metadata || {}),
      JSON.stringify(analysis.content || {}),
      JSON.stringify(analysis.aiAnalysis || {}),
      analysis.screenshotPath,
      analysis.aiAnalysis?.trustScore || 50
    ]);

    return analysis.id;
  }

  async getAnalysis(id) {
    const row = await this.get('SELECT * FROM url_analyses WHERE id = ?', [id]);
    if (!row) return null;

    return {
      ...row,
      metadata: JSON.parse(row.metadata || '{}'),
      content: JSON.parse(row.content || '{}'),
      ai_analysis: JSON.parse(row.ai_analysis || '{}')
    };
  }

  async getRecentAnalyses(userId = null, limit = 20) {
    let sql = `
      SELECT ua.*, u.username 
      FROM url_analyses ua 
      LEFT JOIN users u ON ua.user_id = u.id
    `;
    let params = [];

    if (userId) {
      sql += ' WHERE ua.user_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY ua.created_at DESC LIMIT ?';
    params.push(limit);

    const rows = await this.all(sql, params);
    
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}'),
      content: JSON.parse(row.content || '{}'),
      ai_analysis: JSON.parse(row.ai_analysis || '{}')
    }));
  }

  async searchAnalyses(query, userId = null) {
    let sql = `
      SELECT * FROM url_analyses 
      WHERE (url LIKE ? OR metadata LIKE ? OR content LIKE ?)
    `;
    let params = [`%${query}%`, `%${query}%`, `%${query}%`];

    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';

    return await this.all(sql, params);
  }

  // Audit logging
  async logAction(userId, action, details = null, ipAddress = null) {
    await this.run(`
      INSERT INTO audit_log (user_id, action, details, ip_address)
      VALUES (?, ?, ?, ?)
    `, [userId, action, details, ipAddress]);
  }

  // Settings management
  async getSetting(key, defaultValue = null) {
    const row = await this.get('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : defaultValue;
  }

  async setSetting(key, value) {
    await this.run(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [key, value]);
  }

  // Statistics
  async getStats() {
    const [totalAnalyses, totalUsers, activeUsers] = await Promise.all([
      this.get('SELECT COUNT(*) as count FROM url_analyses'),
      this.get('SELECT COUNT(*) as count FROM users'),
      this.get(`
        SELECT COUNT(*) as count FROM users 
        WHERE last_active > datetime('now', '-7 days')
      `)
    ]);

    const topDomains = await this.all(`
      SELECT 
        SUBSTR(url, INSTR(url, '://') + 3, 
               CASE 
                 WHEN INSTR(SUBSTR(url, INSTR(url, '://') + 3), '/') > 0 
                 THEN INSTR(SUBSTR(url, INSTR(url, '://') + 3), '/') - 1
                 ELSE LENGTH(SUBSTR(url, INSTR(url, '://') + 3))
               END) as domain,
        COUNT(*) as count
      FROM url_analyses 
      GROUP BY domain 
      ORDER BY count DESC 
      LIMIT 10
    `);

    return {
      totalAnalyses: totalAnalyses.count,
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      topDomains
    };
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) console.error('Database close error:', err.message);
          else console.log('✅ Database connection closed');
          resolve();
        });
      });
    }
  }
}

export default Database;
