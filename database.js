const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Use in-memory DB on Render free tier to avoid file crash
const dbPath = process.env.NODE_ENV === 'production' ? ':memory:' : './pixels-dojo.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database open failed:', err.message);
    process.exit(1);
  }
  console.log(`Connected to DB (${dbPath === ':memory:' ? 'in-memory (Render free)' : 'file'})`);
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

  console.log('NPCs and tables seeded OK!');

  // Wiki Pages
  db.run(`CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  title TEXT,
  content TEXT,
  category TEXT,
  difficulty TEXT CHECK(difficulty IN ('Beginner', 'Intermediate', 'Advanced')) DEFAULT 'Beginner',
  screenshots TEXT,                -- JSON string: ["path1.jpg", "path2.png"]
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

  // NPCs
  db.run(`CREATE TABLE IF NOT EXISTS npcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    description TEXT,
    image_path TEXT DEFAULT '/images/npcs/default-npc.png',
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create admin user (Lizzy)
  const adminPassword = bcrypt.hashSync('changeme123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, email, password, display_name, bio, profile_image, is_admin)
    VALUES (?, ?, ?, ?, ?, ?, 1)`,
    ['lizzysims', 'lizzylizzysims@gmail.com', adminPassword, 'Lizzy Sims',
     'Lizzy Sims hailing from Lovely Lalaland, loves her family, her dire-bunny Buck and excellent coffee. An avid reader, artist, designer, carpenter and pixel player, she hopes to tame a crow before the end of the year.',
     '/images/lizzysims_profile_1.png']
  );

  // Seed NPC data
  const npcs = [
    { name: 'Albus', location: 'Hearth Hall quest', order: 1 },
    { name: 'Alina the Witch', location: 'Theatre (hidden)', order: 2 },
    { name: 'Allison', location: 'Neon Zone', order: 3 },
    { name: 'Amy', location: 'Apiary (Animal Care)', order: 4 },
    { name: 'Bart', location: 'Neon Zone', order: 5 },
    { name: 'Ben', location: 'Pet incubator', order: 6 },
    { name: 'Bitsy', location: 'Ministry of Innovation', order: 7 },
    { name: 'Buck', location: "Buck's Galore front counter", order: 8 },
    { name: 'Buffy', location: 'Neon Zone', order: 9 },
    { name: 'Byron', location: 'Bank upstairs (deposit/withdraw)', order: 10 },
    { name: 'Captain McKelpy', location: 'Musty Lobster Ship', order: 11 },
    { name: 'Cod Stewart', location: 'Sushi station', order: 12 },
    { name: 'Cooper', location: 'Chickens (Animal Care)', order: 13 },
    { name: 'Dave', location: 'Bank middle floor (buy coins)', order: 14 },
    { name: 'Derek', location: 'Neon Zone', order: 15 },
    { name: 'Ed', location: 'Silk slugs (Animal Care)', order: 16 },
    { name: 'Elon', location: 'Bank middle floor (buy Pixel)', order: 17 },
    { name: 'Fuy Geiri', location: 'BBQ station', order: 18 },
    { name: 'Gabby Dizon', location: 'Guild Castle', order: 19 },
    { name: 'Gamemaster Flaster', location: 'Neon Zone', order: 20 },
    { name: 'Gianno', location: 'Choose Harvest Union', order: 21 },
    { name: 'Gill', location: 'Windmill', order: 22 },
    { name: 'Glint', location: 'Guild Castle Gardens (FableBourne)', order: 23 },
    { name: 'Goose', location: 'Drunken Goose', order: 24 },
    { name: 'Gurney', location: 'Sauna', order: 25 },
    { name: 'Harbourmaster', location: 'Shipping contracts', order: 26 },
    { name: 'Honor', location: 'Decor shop (farm items)', order: 27 },
    { name: 'Jack', location: 'Woodworking station', order: 28 },
    { name: 'Jerome', location: 'Decor shop (limited items)', order: 29 },
    { name: 'Jill', location: 'Forestry station', order: 30 },
    { name: 'Jolt', location: 'Spore Sport Cave', order: 31 },
    { name: 'Karen', location: 'Old Pixels HQ', order: 32 },
    { name: 'Kathleen', location: 'Old Pixels HQ', order: 33 },
    { name: 'Kiko', location: 'Guild Castle Gardens', order: 34 },
    { name: 'Kirby', location: 'Pet Store front desk', order: 35 },
    { name: 'Lauren', location: 'Bank upstairs (create wallet)', order: 36 },
    { name: 'Lucia', location: 'Hearth Hall (buy offerings/recipes)', order: 37 },
    { name: 'Luke', location: 'Guild Castle', order: 38 },
    { name: 'Manager Artie', location: 'Neon Zone', order: 39 },
    { name: 'Margaret', location: 'Bank reception (buy coins)', order: 40 },
    { name: 'Marina', location: 'Seaside Stash', order: 41 },
    { name: 'Mitchell', location: 'Hearth Hall (union info)', order: 42 },
    { name: 'Neon Leon', location: "Leon's Hold'em", order: 43 },
    { name: 'Peach', location: "Buck's Galore back counter (market)", order: 44 },
    { name: 'Penny', location: 'Pet Store potion table', order: 45 },
    { name: 'Pixelia', location: 'Decor shop (UGCs)', order: 46 },
    { name: 'Player W3', location: 'Guild Castle', order: 47 },
    { name: 'Priya', location: 'Post Office', order: 48 },
    { name: 'Regis', location: 'Bank middle floor (buy Quicksilver)', order: 49 },
    { name: 'Sandy', location: 'Stoneshaping Kiln', order: 50 },
    { name: 'Smith', location: 'Metalworking station', order: 51 },
    { name: 'Tex', location: 'Textile station', order: 52 },
    { name: 'The Giraffe', location: 'Neon Zone', order: 53 },
    { name: 'Winona', location: 'Wine Press', order: 54 }
  ];

  npcs.forEach(npc => {
    db.run(`INSERT OR IGNORE INTO npcs (name, location, display_order) VALUES (?, ?, ?)`,
      [npc.name, npc.location, npc.order]);
  });
});

module.exports = db;

console.log('All tables created without errors');
