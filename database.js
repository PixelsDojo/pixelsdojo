const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Use persistent file on Railway (/app/data is our mounted volume)
const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/pixels-dojo.db' : './pixels-dojo.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database open failed:', err.message);
    process.exit(1);
  }
  console.log(`Connected to DB (${dbPath === '/app/data/pixels-dojo.db' ? 'persistent file on Railway' : 'local file'})`);
});

db.serialize(() => {
  // Users
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    display_name TEXT,
    bio TEXT,
    profile_image TEXT DEFAULT '/images/default-avatar.png',
    is_admin BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add contributor role if not present
  db.run(`ALTER TABLE users ADD COLUMN is_contributor BOOLEAN DEFAULT 0;`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding is_contributor column:', err.message);
    } else {
      console.log('is_contributor column ready (already exists or added)');
    }
  });

  // NEW: Add social_links and tip_address columns
  db.run(`ALTER TABLE users ADD COLUMN social_links TEXT;`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding social_links column:', err.message);
    } else {
      console.log('social_links column ready (already exists or added)');
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN tip_address TEXT;`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding tip_address column:', err.message);
    } else {
      console.log('tip_address column ready (already exists or added)');
    }
  });

  // Add missing columns to pages table
  db.run(`ALTER TABLE pages ADD COLUMN views INTEGER DEFAULT 0;`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding views column:', err.message);
    } else {
      console.log('views column ready (already exists or added)');
    }
  });

  db.run(`ALTER TABLE pages ADD COLUMN upvotes INTEGER DEFAULT 0;`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding upvotes column:', err.message);
    } else {
      console.log('upvotes column ready (already exists or added)');
    }
  });

  db.run(`ALTER TABLE pages ADD COLUMN downvotes INTEGER DEFAULT 0;`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding downvotes column:', err.message);
    } else {
      console.log('downvotes column ready (already exists or added)');
    }
  });

  // Wiki Pages
  db.run(`CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE,
    title TEXT,
    content TEXT,
    category TEXT,
    difficulty TEXT CHECK(difficulty IN ('Beginner', 'Intermediate', 'Advanced')) DEFAULT 'Beginner',
    screenshots TEXT,                -- JSON string: ["path1.jpg", "path2.png"]
    summary TEXT,
    pro_tips TEXT,
    author_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(author_id) REFERENCES users(id)
  )`);
  
  // Likes
  db.run(`CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    page_id INTEGER,
    type TEXT CHECK(type IN ('like', 'dislike')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, page_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(page_id) REFERENCES pages(id)
  )`);

  // Questions
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    question TEXT,
    page_slug TEXT,
    answered BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // NPCs table - added UNIQUE on name to prevent duplicates
  db.run(`CREATE TABLE IF NOT EXISTS npcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    location TEXT,
    description TEXT,
    image_path TEXT DEFAULT '/images/npcs/default-npc.png',
    display_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Analytics: Site-wide traffic tracking
  db.run(`CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT,
    page_path TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Analytics: Daily stats summary
  db.run(`CREATE TABLE IF NOT EXISTS analytics_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE,
    unique_visitors INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  console.log('Analytics tables created');

  // Create admin user (Lizzy)
  const adminPassword = bcrypt.hashSync('changeme123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, email, password, display_name, bio, profile_image, is_admin)
    VALUES (?, ?, ?, ?, ?, ?, 1)`,
    ['lizzysims', 'lizzylizzysims@gmail.com', adminPassword, 'Lizzy Sims',
     'Lizzy Sims hailing from Lovely Lalaland, loves her family, her dire-bunny Buck and excellent coffee. An avid reader, artist, designer, carpenter and pixel player, she hopes to tame a crow before the end of the year.',
     '/images/lizzysims_profile_1.png']
  );
});

module.exports = db;
console.log('NPCs and tables seeded OK!');
console.log('All tables created without errors');
