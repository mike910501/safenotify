const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class Database {
  constructor() {
    this.db = null;
    this.initializeDatabase();
  }

  initializeDatabase() {
    // Ensure data directory exists
    const dataDir = path.dirname(process.env.DB_PATH || './data/safenotify.db');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new sqlite3.Database(process.env.DB_PATH || './data/safenotify.db', (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
      }
      console.log('Connected to SQLite database');
      this.createTables();
    });
  }

  createTables() {
    const createTables = `
      -- Campaigns table with encrypted data
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        template_sid TEXT NOT NULL,
        encrypted_csv_data BLOB NOT NULL,
        iv TEXT NOT NULL,
        total_contacts INTEGER NOT NULL,
        status TEXT DEFAULT 'created',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        sent_at DATETIME NULL,
        completed_at DATETIME NULL,
        created_by TEXT DEFAULT 'api',
        metadata TEXT DEFAULT '{}'
      );

      -- Message logs for tracking individual messages
      CREATE TABLE IF NOT EXISTS message_logs (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        message_sid TEXT,
        template_variables TEXT NOT NULL,
        status TEXT DEFAULT 'queued',
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        delivered_at DATETIME NULL,
        error_message TEXT NULL,
        webhook_data TEXT NULL,
        attempts INTEGER DEFAULT 1,
        FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
      );

      -- Audit logs for compliance
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        user_id TEXT DEFAULT 'system',
        ip_address TEXT,
        user_agent TEXT,
        request_data TEXT,
        response_status INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT
      );

      -- Template mappings for dynamic variable mapping
      CREATE TABLE IF NOT EXISTS template_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_sid TEXT NOT NULL,
        template_name TEXT NOT NULL,
        variables TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_campaigns_expires_at ON campaigns(expires_at);
      CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
      CREATE INDEX IF NOT EXISTS idx_message_logs_campaign_id ON message_logs(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_message_logs_status ON message_logs(status);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
    `;

    this.db.exec(createTables, (err) => {
      if (err) {
        console.error('Error creating tables:', err.message);
        process.exit(1);
      }
      console.log('Database tables initialized');
      this.insertDefaultTemplates();
    });
  }

  insertDefaultTemplates() {
    const defaultTemplates = [
      {
        template_sid: process.env.TEMPLATE_APPOINTMENT_CONFIRMATION || 'HX_appointment_confirmation',
        template_name: 'Confirmación de Citas',
        variables: JSON.stringify(['nombre', 'negocio', 'servicio', 'fecha', 'hora', 'ubicacion'])
      },
      {
        template_sid: process.env.TEMPLATE_APPOINTMENT_REMINDER || 'HX_appointment_reminder',
        template_name: 'Recordatorio de Citas',
        variables: JSON.stringify(['nombre', 'negocio', 'servicio', 'fecha', 'hora', 'ubicacion'])
      }
    ];

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO template_mappings (template_sid, template_name, variables)
      VALUES (?, ?, ?)
    `);

    defaultTemplates.forEach(template => {
      stmt.run([template.template_sid, template.template_name, template.variables]);
    });

    stmt.finalize();
  }

  // Encryption utilities
  encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  decrypt(encryptedData, iv) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
        resolve();
      });
    });
  }
}

module.exports = new Database();