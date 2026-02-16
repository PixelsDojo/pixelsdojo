// Catch all crashes and log them loudly
process.on('uncaughtException', (err) => {
  console.error('CRASH! Uncaught Exception:');
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRASH! Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

console.log('Starting server.js - logging enabled');

// Required imports
const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const db = require('./database.js');
const chatRoutes = require('./routes/chat');

// Security imports
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const validator = require('validator');

// Discord bot
const discordBot = require('./discord-bot');

const app = express();

// Auto-create persistent folders
const uploadDirs = [
  '/app/data/images/npcs',
  '/app/data/images/profiles',
  '/app/data/images/pages'
];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created persistent upload folder: ${dir}`);
  }
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destFolder = '/app/data/images/npcs/';
    if (file.fieldname === 'profile_image') destFolder = '/app/data/images/profiles/';
    if (file.fieldname === 'screenshots')     destFolder = '/app/data/images/pages/';
    cb(null, destFolder);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Middleware
// Security: Helmet for HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://widgets.coingecko.com"],
      scriptSrcAttr: ["'unsafe-inline'"],  // ADDED: Allow inline event handlers (onclick, etc)
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'", "https://widgets.coingecko.com", "https://api.coingecko.com", "https://cdn.jsdelivr.net"],  // ADDED: jsdelivr
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Security: XSS Protection
app.use(xss());

// Security: Cookie Parser (needed for CSRF)
app.use(cookieParser());

// Security: Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window (increased for normal browsing)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip static files
  skip: (req) => {
    return req.path.startsWith('/images/') || 
           req.path.startsWith('/css/') || 
           req.path.startsWith('/js/') ||
           req.path.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|css|js)$/);
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts (increased from 5)
  message: 'Too many login/registration attempts, please try again later.',
  skipSuccessfulRequests: true
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute (increased from 30)
  message: 'Too many API requests, please slow down.'
});

app.use('/api/', apiLimiter);
app.use(generalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/images/npcs',     express.static('/app/data/images/npcs'));
app.use('/images/profiles', express.static('/app/data/images/profiles'));
app.use('/images/pages',    express.static('/app/data/images/pages'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'pixels-dojo-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // TEMPORARILY DISABLED - set to 'auto' after confirming HTTPS works
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // CSRF protection
  }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Analytics: Track page views
app.use((req, res, next) => {
  // Only track actual page views (not API calls, static files, etc.)
  if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/images/') && !req.path.match(/\.(css|js|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf)$/)) {
    
    // Generate or get visitor ID from cookie
    let visitorId = req.cookies.visitor_id;
    if (!visitorId) {
      visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      res.cookie('visitor_id', visitorId, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true }); // 1 year
    }

    // Track the visit
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';
    const referrer = req.get('referrer') || '';
    const pagePath = req.path;

    db.run(
      `INSERT INTO analytics (visitor_id, page_path, referrer, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)`,
      [visitorId, pagePath, referrer, userAgent, ipAddress],
      (err) => {
        if (err) console.error('Analytics tracking error:', err.message);
      }
    );

    // Update daily stats
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    db.run(
      `INSERT INTO analytics_daily (date, unique_visitors, page_views) VALUES (?, 1, 1)
       ON CONFLICT(date) DO UPDATE SET page_views = page_views + 1`,
      [today],
      (err) => {
        if (err) console.error('Daily stats error:', err.message);
      }
    );
  }
  
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Admin protection middleware
function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(403).send('Access denied - admin only');
  }
  next();
}

// Right after your existing requireAdmin middleware

function requireAdminOrOwner(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Please log in' });
  }

  const pageId = req.params.id;
  if (!pageId || isNaN(pageId)) {
    return res.status(400).json({ error: 'Invalid page ID' });
  }

  db.get(
    `SELECT author_id FROM pages WHERE id = ?`,
    [pageId],
    (err, row) => {
      if (err) {
        console.error('Ownership check DB error:', err);
        return res.status(500).json({ error: 'Server error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Page not found' });
      }

      const isAdmin = !!req.session.user.is_admin;
      const isOwner = row.author_id === req.session.user.id;  // strict === assuming numeric IDs

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'You can only edit or delete your own pages' });
      }

      next();
    }
  );
}
// Homepage – enhanced with categories, upvoted, viewed, etc.
app.get('/', (req, res) => {
  // Recent posts (top 6)
  db.all(`
    SELECT p.*, u.display_name as author_display_name
    FROM pages p 
    LEFT JOIN users u ON p.author_id = u.id
    ORDER BY p.created_at DESC 
    LIMIT 6
  `, [], (err, recentPages) => {
    if (err) {
      console.error('Recent pages error:', err);
      recentPages = [];
    }

    // Most upvoted (assuming you have an 'upvotes' column – add if missing)
    db.get(`
      SELECT p.*, u.display_name as author_display_name
      FROM pages p 
      LEFT JOIN users u ON p.author_id = u.id
      ORDER BY p.upvotes DESC 
      LIMIT 1
    `, [], (err, mostUpvoted) => {
      if (err || !mostUpvoted) mostUpvoted = null;

      // Most viewed (assuming 'views' column – add if missing)
      db.get(`
        SELECT p.*, u.display_name as author_display_name
        FROM pages p 
        LEFT JOIN users u ON p.author_id = u.id
        ORDER BY p.views DESC 
        LIMIT 1
      `, [], (err, mostViewed) => {
        if (err || !mostViewed) mostViewed = null;

        // Category teasers – 3–4 posts per category for snippets
        const categories = ['startup', 'earn', 'mastery'];
        const categoryData = {};

        let completed = 0;
        categories.forEach(cat => {
          db.all(`
            SELECT p.*, u.display_name as author_display_name
            FROM pages p 
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.category = ?
            ORDER BY p.created_at DESC 
            LIMIT 4
          `, [cat], (err, posts) => {
            if (err) {
              console.error(`Category ${cat} error:`, err);
              categoryData[cat] = [];
            } else {
              categoryData[cat] = posts;
            }

            completed++;
            if (completed === categories.length) {
              res.render('index', {
                user: req.session.user || null,
                recentPages,
                mostUpvoted,
                mostViewed,
                categoryData,  // { startup: [...], earn: [...], mastery: [...] }
              });
            }
          });
        });
      });
    });
  });
});

// ─── NPCs ───────────────────────────────────────────────────────────────

// Public list of NPCs – default alphabetical by name
app.get('/npcs', (req, res) => {
  const sort = req.query.sort || 'name';  // default to alphabetical

  let orderBy = 'name ASC';

  // Valid sort options (safe against injection)
  if (sort === 'name-desc') {
    orderBy = 'name DESC';
  } else if (sort === 'location') {
    orderBy = 'location ASC';
  } else if (sort === 'location-desc') {
    orderBy = 'location DESC';
  } else if (sort === 'order') {  // allow manual order if needed
    orderBy = 'display_order ASC, name ASC';
  }

  const query = `SELECT * FROM npcs ORDER BY ${orderBy}`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('NPC list error:', err);
      return res.status(500).send('Database error');
    }

    res.render('npcs', {
      npcs: rows,
      user: req.session.user || null,
      currentSort: sort
    });
  });
});

// ========== NPCs & MAP COMBINED PAGE (NEW) ==========
app.get('/npcs-map', (req, res) => {
  const sort = req.query.sort || 'display_order';
  
  let orderBy = 'display_order ASC, id ASC';
  switch(sort) {
    case 'name':
      orderBy = 'name ASC';
      break;
    case 'name-desc':
      orderBy = 'name DESC';
      break;
    case 'location':
      orderBy = 'location ASC, name ASC';
      break;
    case 'location-desc':
      orderBy = 'location DESC, name ASC';
      break;
  }
  
  // Get NPCs
  db.all(`SELECT * FROM npcs ORDER BY ${orderBy}`, [], (err, npcs) => {
    if (err) {
      console.error('Error fetching NPCs:', err);
      return res.status(500).send('Database error');
    }
    
    // Get map guide post (static post with slug 'terravilla-map-guide')
    db.get(`
      SELECT pages.*, users.display_name as author_display_name
      FROM pages 
      LEFT JOIN users ON pages.author_id = users.id
      WHERE pages.slug = 'terravilla-map-guide'
      LIMIT 1
    `, [], (err2, mapGuide) => {
      if (err2) {
        console.error('Error fetching map guide:', err2);
      }
      
      res.render('npcs-map', { 
        npcs: npcs || [],
        mapGuide: mapGuide || null,
        currentSort: sort,
        user: req.session.user || null
      });
    });
  });
});

// ========== EVENTS PAGE (NEW) ==========
app.get('/events', (req, res) => {
  const query = `
    SELECT 
      pages.*,
      users.display_name as author_display_name
    FROM pages 
    LEFT JOIN users ON pages.author_id = users.id
    WHERE pages.category = 'events'
    ORDER BY pages.expires_on DESC, pages.created_at DESC
  `;
  
  db.all(query, [], (err, events) => {
    if (err) {
      console.error('Error fetching events:', err);
      return res.status(500).send('Database error');
    }
    
    res.render('events', { 
      events: events || [],
      user: req.session.user || null
    });
  });
});

// ========== AMAs PAGE (NEW) ==========
app.get('/amas', (req, res) => {
  const query = `
    SELECT 
      pages.*,
      users.display_name as author_display_name
    FROM pages 
    LEFT JOIN users ON pages.author_id = users.id
    WHERE pages.category = 'amas'
    ORDER BY pages.created_at DESC
  `;
  
  db.all(query, [], (err, amas) => {
    if (err) {
      console.error('Error fetching AMAs:', err);
      return res.status(500).send('Database error');
    }
    
    res.render('amas', { 
      amas: amas || [],
      category: 'amas',
      user: req.session.user || null
    });
  });
});

// Admin: Create new NPC
app.post('/admin/npcs', requireAdmin, upload.single('image'), (req, res) => {
  const { name, location, description, display_order } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'NPC name is required' });
  }

  let imagePath = null;
  if (req.file) {
    imagePath = `/images/npcs/${req.file.filename}`;
  }

  const order = parseInt(display_order) || 999;

  db.run(
    `INSERT INTO npcs (name, location, description, image_path, display_order, created_at)
VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [name.trim(), location?.trim() || null, description?.trim() || null, imagePath, order],
    function (err) {
      if (err) {
        console.error('NPC create error:', err.message);
        return res.status(500).json({ error: 'Failed to create NPC' });
      }
      res.json({ success: true, id: this.lastID });
      // Alternative: res.redirect('/admin');
    }
  );
});

// Admin: Update existing NPC
app.post('/admin/npcs/:id/update', requireAdmin, upload.single('image'), (req, res) => {
  const id = req.params.id;
  const { name, location, description, display_order } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'NPC name is required' });
  }

  let query = `UPDATE npcs SET name = ?, location = ?, description = ?, display_order = ?`;
  let params = [
    name.trim(),
    location?.trim() || null,
    description?.trim() || null,
    parseInt(display_order) || 999
  ];

  if (req.file) {
    const imagePath = `/images/npcs/${req.file.filename}`;
    query += `, image_path = ?`;
    params.push(imagePath);
  }

  query += ` WHERE id = ?`;
  params.push(id);

  db.run(query, params, function (err) {
    if (err) {
      console.error('NPC update error:', err.message);
      return res.status(500).json({ error: 'Failed to update NPC' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'NPC not found' });
    }
    res.json({ success: true });
    // Alternative: res.redirect('/admin');
  });
});

// Admin: Delete NPC (optional – add if you want delete functionality)
app.delete('/admin/npcs/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM npcs WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      console.error('NPC delete error:', err.message);
      return res.status(500).json({ error: 'Delete failed' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'NPC not found' });
    }
    res.json({ success: true });
  });
});

// Contributor: Get own page data as JSON (for edit form/modal)
// Contributor Dashboard – only own pages, only for contributors/admins
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login?redirect=/dashboard');
  }

  if (!req.session.user.is_contributor && !req.session.user.is_admin) {
    return res.status(403).send('Access denied - contributors only');
  }

  const userId = req.session.user.id;

  db.all(
    `SELECT * FROM pages 
     WHERE author_id = ? 
     ORDER BY updated_at DESC`,
    [userId],
    (err, userPages) => {
      if (err) {
        console.error('Dashboard pages error:', err);
        userPages = [];
      }

      res.render('dashboard', {
        user: req.session.user,
        pages: userPages,
        isAdmin: !!req.session.user.is_admin
      });
    }
  );
});

// Contributor: Create new page (protected by login + contributor check)
app.post('/dashboard/pages', (req, res, next) => {
  if (!req.session.user || (!req.session.user.is_contributor && !req.session.user.is_admin)) {
    return res.status(403).json({ error: 'Only contributors can create pages' });
  }
  next();
}, upload.array('screenshots', 15), (req, res) => {
  const { title, slug, content, category, difficulty, summary, pro_tips } = req.body;
  if (!title || !slug || !content) return res.status(400).json({ error: 'Missing required fields' });

  const cleanSlug = slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Use files from disk storage (no sharp processing needed)
  let screenshots = [];
  if (req.files && req.files.length > 0) {
    screenshots = req.files.map(f => '/images/pages/' + f.filename);
  }
  const screenshotsJson = JSON.stringify(screenshots);

  db.run(
    `INSERT INTO pages (slug, title, content, category, difficulty, screenshots, summary, pro_tips, author_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [cleanSlug, title, content, category || null, difficulty || 'Beginner', screenshotsJson, summary || null, pro_tips || null, req.session.user.id],
    function (err) {
      if (err) {
        console.error('Page creation error:', err.message);
        return res.status(500).json({ error: 'Error saving page: ' + err.message });
      }
      
      // Announce new article to Discord
      try {
        discordBot.announceNewArticle({
          title: title,
          slug: cleanSlug,
          category: category || 'General',
          difficulty: difficulty || 'Beginner',
          summary: summary || null,
          author: req.session.user.display_name || req.session.user.username
        });
      } catch (discordErr) {
        console.error('Discord announcement error:', discordErr);
        // Don't fail the request if Discord fails
      }
      
      res.json({ success: true, message: 'Page created successfully!', pageId: this.lastID });
    }
  );
});

// Contributor: Get own page data for editing (JSON)
app.get('/dashboard/pages/:id/edit', requireAdminOrOwner, (req, res) => {
  db.get('SELECT * FROM pages WHERE id = ?', [req.params.id], (err, page) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!page) return res.status(404).json({ error: 'Page not found' });
    
    try {
      page.screenshots = JSON.parse(page.screenshots || '[]');
    } catch (e) {
      page.screenshots = [];
    }
    res.json(page);
  });
});

// Contributor: Update own page
app.post(
  '/dashboard/pages/:id/update',
  requireAdminOrOwner,
  upload.array('screenshots', 15),
  (req, res) => {
    const id = req.params.id;
    const { title, content, category, difficulty, summary, pro_tips } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Keep original slug (same logic as admin update)
    db.get('SELECT slug, screenshots FROM pages WHERE id = ?', [id], (err, current) => {
      if (err || !current) {
        return res.status(500).json({ error: 'Database error or page not found' });
      }

      const cleanSlug = current.slug;

      const handleSave = (screenshotsJson) => {
        db.run(
          `UPDATE pages 
           SET title = ?, slug = ?, content = ?, category = ?, difficulty = ?, 
               screenshots = ?, summary = ?, pro_tips = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [title, cleanSlug, content, category || null, difficulty || 'Beginner',
           screenshotsJson, summary || null, pro_tips || null, id],
          function (err) {
            if (err) {
              console.error('Contributor update error:', err.message);
              return res.status(500).json({ error: 'Failed to save changes' });
            }
            if (this.changes === 0) {
              return res.status(404).json({ error: 'Page not found' });
            }
            res.json({ success: true, message: 'Page updated' });
          }
        );
      };

      if (req.files && req.files.length > 0) {
        const newPaths = req.files.map(f => '/images/pages/' + f.filename);
        // Optional: you could merge with existing screenshots here instead of replacing
        handleSave(JSON.stringify(newPaths));
      } else {
        // Keep existing screenshots if no new upload
        handleSave(current.screenshots || '[]');
      }
    });
  }
);

// Contributor: Delete own page
app.delete('/dashboard/pages/:id', requireAdminOrOwner, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM pages WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Contributor delete error:', err);
      return res.status(500).json({ error: 'Delete failed' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json({ success: true, message: 'Page deleted' });
  });
});

// ─── All Posts Page ────────────────────────────────────────
// Lists every article in the wiki (paginated later if needed)
app.get('/all-posts', (req, res) => {
  db.all(`
    SELECT p.*, u.display_name as author_display_name
    FROM pages p
    LEFT JOIN users u ON p.author_id = u.id
    ORDER BY p.created_at DESC
  `, [], (err, allPages) => {
    if (err) {
      console.error('All posts query error:', err);
      allPages = [];
    }
    res.render('all-posts', {
      pages: allPages,
      user: req.session.user || null
    });
  });
});

// GET /register - Show registration form
app.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');  // Already logged in? Send home
  }
  res.render('register', { error: null });
});

// POST /register - Handle new user creation
app.post('/register', authLimiter, (req, res) => {
  const { username, email, password, display_name } = req.body;

  // Basic validation
  if (!username || !email || !password || !display_name) {
    return res.render('register', { error: 'All required fields must be filled (username, email, password, display name)' });
  }

  // Hash password
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error('Bcrypt error:', err);
      return res.render('register', { error: 'Server error during registration' });
    }

    // Insert new user (roles default to 0)
    db.run(
      `INSERT INTO users (username, email, password, display_name, is_admin, is_contributor)
       VALUES (?, ?, ?, ?, 0, 0)`,
      [username.trim(), email.trim(), hash, display_name.trim()],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.render('register', { error: 'Username or email already taken' });
          }
          console.error('DB insert error:', err.message);
          return res.render('register', { error: 'Registration failed - try again' });
        }

        // Auto-login after success
        req.session.user = {
          id: this.lastID,
          username,
          display_name,
          profile_image: '/images/default-avatar.png',
          bio: '',
          is_admin: 0,
          is_contributor: 0
        };

        res.redirect('/?registered=success');
      }
    );
  });
});

// Login
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null, user: null });
});

app.post('/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) return res.render('login', { error: 'Invalid username or password', user: null });

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) return res.render('login', { error: 'Server error', user: null });
      if (match) {
        req.session.user = {
          id: user.id,
          username: user.username,
          display_name: user.display_name || user.username,
          profile_image: user.profile_image || '/images/default-avatar.png',
          bio: user.bio || '',
          is_admin: !!user.is_admin,
          is_contributor: !!user.is_contributor
        };
        return res.redirect('/');
      }
      res.render('login', { error: 'Invalid username or password', user: null });
    });
  });
});

// Logout – destroy session and redirect to home/login
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout session destroy error:', err);
      // Optional: still redirect even if error
    }
    res.clearCookie('connect.sid'); // optional but good – clears session cookie
    res.redirect('/login?message=logged_out'); // or '/' for home
  });
});

// User Profile (GET /profile) – fetch full user data every time
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login?redirect=/profile');
  }

  // Fetch the complete user record from the database
  db.get(
    `SELECT id, username, email, display_name, bio, profile_image, social_links, tip_address, is_admin, is_contributor 
     FROM users WHERE id = ?`,
    [req.session.user.id],
    (err, fullUser) => {
      if (err) {
        console.error('Profile fetch error:', err.message);
        return res.status(500).send('Error loading profile data');
      }
      if (!fullUser) {
        // User no longer exists? Destroy session and force re-login
        req.session.destroy();
        return res.redirect('/login?error=user_not_found');
      }

      // Update session with full/current data (so header, navbar, etc. show correct info)
      req.session.user = {
        ...req.session.user,
        display_name: fullUser.display_name || fullUser.username,
        bio: fullUser.bio || '',
        profile_image: fullUser.profile_image || '/images/default-avatar.png',
        email: fullUser.email || '',
        social_links: fullUser.social_links || '',
        tip_address: fullUser.tip_address || '',
        is_contributor: !!fullUser.is_contributor
      };

      // Fetch pages authored by this user (optional)
      db.all(
        `SELECT * FROM pages WHERE author_id = ? ORDER BY created_at DESC`,
        [req.session.user.id],
        (err, userPages) => {
          if (err) {
            console.error('User pages fetch error:', err);
            userPages = [];
          }

          res.render('profile', {
            user: req.session.user,   // now complete
            pages: userPages || []
          });
        }
      );
    }
  );
});

// Edit profile form (GET /profile/edit) – also fetch full user
// GET /profile/edit - show edit form (ALL users can edit basic info)
app.get('/profile/edit', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login?redirect=/profile/edit');
  }

  // Everyone can access profile edit
  db.get(
    `SELECT id, username, email, display_name, bio, profile_image, social_links, tip_address, is_admin, is_contributor 
     FROM users WHERE id = ?`,
    [req.session.user.id],
    (err, fullUser) => {
      if (err || !fullUser) {
        console.error('Profile fetch error:', err);
        return res.redirect('/profile?error=load_failed');
      }

      res.render('profile-edit', {
        user: fullUser,
        error: null
      });
    }
  );
});

// POST /profile/edit - save changes (everyone can edit basic info)
app.post('/profile/edit', upload.single('profile_image'), async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const userId = req.session.user.id;
  const isEligible = !!req.session.user.is_admin || !!req.session.user.is_contributor;

  const { username, email, display_name, new_password, bio, social_links, tip_address } = req.body;

  let profileImagePath = req.session.user.profile_image || '/images/default-avatar.png';

  // Process avatar upload (everyone can do this)
  if (req.file) {
    profileImagePath = `/images/profiles/${req.file.filename}`;
  }

  // Everyone can update: username, email, display_name, password, profile_image
  let updateQuery = `UPDATE users SET username = ?, email = ?, display_name = ?, profile_image = ?`;
  let params = [
    username?.trim() || req.session.user.username,
    email?.trim() || req.session.user.email,
    display_name?.trim() || req.session.user.username,
    profileImagePath
  ];

  // Add password if provided
  if (new_password && new_password.trim()) {
    const hashedPassword = await bcrypt.hash(new_password, 10);
    updateQuery += `, password = ?`;
    params.push(hashedPassword);
  }

  // Contributors and admins can also update: bio, social_links, tip_address
  if (isEligible) {
    updateQuery += `, bio = ?, social_links = ?, tip_address = ?`;
    params.push(
      bio?.trim() || '',
      social_links?.trim() || '',
      tip_address?.trim() || ''
    );
  }

  updateQuery += ` WHERE id = ?`;
  params.push(userId);

  db.run(updateQuery, params, function (err) {
    if (err) {
      console.error('Profile update DB error:', err.message);
      return res.render('profile-edit', { 
        user: req.session.user, 
        error: 'Failed to save changes. ' + (err.message.includes('UNIQUE') ? 'Username or email already taken.' : 'Please try again.') 
      });
    }

    // Update session with new values
    req.session.user.username = username?.trim() || req.session.user.username;
    req.session.user.email = email?.trim() || req.session.user.email;
    req.session.user.display_name = display_name?.trim() || req.session.user.username;
    req.session.user.profile_image = profileImagePath;

    if (isEligible) {
      req.session.user.bio = bio?.trim() || '';
      req.session.user.social_links = social_links?.trim() || '';
      req.session.user.tip_address = tip_address?.trim() || '';
    }

    res.redirect('/profile?success=1');
  });
});

// POST /profile/delete - Delete user account
app.post('/profile/delete', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const userId = req.session.user.id;

  // Delete user's pages first (foreign key constraint)
  db.run('DELETE FROM pages WHERE author_id = ?', [userId], (err) => {
    if (err) {
      console.error('Error deleting user pages:', err);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    // Delete user's likes
    db.run('DELETE FROM likes WHERE user_id = ?', [userId], (err) => {
      if (err) {
        console.error('Error deleting user likes:', err);
      }

      // Finally delete the user
      db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
        if (err) {
          console.error('Error deleting user:', err);
          return res.status(500).json({ error: 'Failed to delete account' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Destroy session
        req.session.destroy((err) => {
          if (err) console.error('Session destroy error:', err);
          res.json({ success: true, message: 'Account deleted successfully' });
        });
      });
    });
  });
});

// API: Get user stats (views, likes)
app.get('/api/stats', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const userId = req.session.user.id;

  // Get total views for user's pages
  db.get(
    `SELECT SUM(views) as totalViews FROM pages WHERE author_id = ?`,
    [userId],
    (err, viewsResult) => {
      if (err) {
        console.error('Stats views error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Get total likes for user's pages
      db.get(
        `SELECT SUM(upvotes) as totalLikes FROM pages WHERE author_id = ?`,
        [userId],
        (err, likesResult) => {
          if (err) {
            console.error('Stats likes error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({
            totalViews: viewsResult?.totalViews || 0,
            totalLikes: likesResult?.totalLikes || 0
          });
        }
      );
    }
  );
});

// Contributor Dashboard – only own pages
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login?redirect=/dashboard');
  }

  // Contributors and admins can access, but only see their own pages
  const userId = req.session.user.id;

  db.all(
    `SELECT * FROM pages 
     WHERE author_id = ? 
     ORDER BY updated_at DESC`,
    [userId],
    (err, userPages) => {
      if (err) {
        console.error('Dashboard pages error:', err);
        userPages = [];
      }

      res.render('dashboard', {
        user: req.session.user,
        pages: userPages,
        isAdmin: !!req.session.user.is_admin  // so you can show extra stuff if admin
      });
    }
  );
});

// ─── Admin Analytics Dashboard ───
app.get('/admin/analytics', requireAdmin, (req, res) => {
  // Get overall stats
  db.get(
    `SELECT 
      COUNT(DISTINCT visitor_id) as totalUniqueVisitors,
      COUNT(*) as totalPageViews
     FROM analytics`,
    [],
    (err, overallStats) => {
      if (err) {
        console.error('Analytics error:', err);
        return res.status(500).send('Error loading analytics');
      }

      // Get this month's stats
      db.get(
        `SELECT 
          COUNT(DISTINCT visitor_id) as monthlyVisitors,
          COUNT(*) as monthlyPageViews
         FROM analytics 
         WHERE date(created_at) >= date('now', 'start of month')`,
        [],
        (err, monthlyStats) => {
          if (err) {
            console.error('Monthly stats error:', err);
            monthlyStats = { monthlyVisitors: 0, monthlyPageViews: 0 };
          }

          // Get popular pages
          db.all(
            `SELECT page_path, COUNT(*) as views 
             FROM analytics 
             GROUP BY page_path 
             ORDER BY views DESC 
             LIMIT 10`,
            [],
            (err, popularPages) => {
              if (err) {
                console.error('Popular pages error:', err);
                popularPages = [];
              }

              // Get recent activity (last 20 visits)
              db.all(
                `SELECT page_path, created_at 
                 FROM analytics 
                 ORDER BY created_at DESC 
                 LIMIT 20`,
                [],
                (err, recentActivity) => {
                  if (err) {
                    console.error('Recent activity error:', err);
                    recentActivity = [];
                  }

                  // Get daily stats for chart (last 30 days)
                  db.all(
                    `SELECT date, page_views 
                     FROM analytics_daily 
                     ORDER BY date DESC 
                     LIMIT 30`,
                    [],
                    (err, dailyStats) => {
                      if (err) {
                        console.error('Daily stats error:', err);
                        dailyStats = [];
                      }

                      res.render('admin-analytics', {
                        user: req.session.user,
                        overallStats,
                        monthlyStats,
                        popularPages,
                        recentActivity,
                        dailyStats: dailyStats.reverse() // Chronological order for chart
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// ─── Admin dashboard ───
app.get('/admin', requireAdmin, (req, res) => {
  db.all('SELECT * FROM npcs ORDER BY display_order ASC', [], (err, npcRows) => {
    if (err) return res.status(500).send('Error loading NPCs');

    db.all('SELECT * FROM pages ORDER BY created_at DESC', [], (err, pageRows) => {
      if (err) return res.status(500).send('Error loading pages');

      res.render('admin', {
        user: req.session.user,
        npcs: npcRows,
        pages: pageRows
      });
    });
  });
});

// Admin: List and manage users
app.get('/admin/users', requireAdmin, (req, res) => {
  db.all(`
    SELECT id, username, email, display_name, bio, profile_image, is_admin, is_contributor 
    FROM users 
    ORDER BY created_at DESC
  `, (err, users) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).send('Database error');
    }
    res.render('admin-users', { users, user: req.session.user || null });
  });
});

// Toggle contributor status
app.post('/admin/users/:id/toggle-contributor', requireAdmin, (req, res) => {
  const userId = req.params.id;
  db.get('SELECT is_contributor FROM users WHERE id = ?', [userId], (err, row) => {
    if (err || !row) return res.status(404).send('User not found');
    const newStatus = row.is_contributor ? 0 : 1;
    db.run('UPDATE users SET is_contributor = ? WHERE id = ?', [newStatus, userId], (err) => {
      if (err) {
        console.error('Error updating contributor status:', err);
        return res.status(500).send('Update failed');
      }
      res.redirect('/admin/users');
    });
  });
});

// Create new page
app.post('/admin/pages', requireAdmin, upload.array('screenshots', 15), (req, res) => {
  const { title, slug, content, category, difficulty, summary, pro_tips } = req.body;
  if (!title || !slug || !content) return res.status(400).send('Missing required fields');

  const cleanSlug = slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  let screenshots = req.files?.length > 0 ? req.files.map(f => '/images/pages/' + f.filename) : [];
  const screenshotsJson = JSON.stringify(screenshots);

  db.run(
    `INSERT INTO pages (slug, title, content, category, difficulty, screenshots, summary, pro_tips, author_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [cleanSlug, title, content, category || null, difficulty || 'Beginner', screenshotsJson, summary || null, pro_tips || null, req.session.user.id],
    (err) => {
      if (err) return res.status(500).send('Error saving page: ' + err.message);
      res.redirect('/admin');
    }
  );
});

// Get page data as JSON (for modal)
app.get('/admin/pages/:id/edit', requireAdmin, (req, res) => {
  db.get('SELECT * FROM pages WHERE id = ?', [req.params.id], (err, page) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!page) return res.status(404).json({ error: 'Page not found' });

    page.screenshots = JSON.parse(page.screenshots || '[]');
    res.json(page);
  });
});

// Update page – ignore submitted slug, always keep original
app.post('/admin/pages/:id/update', requireAdmin, upload.array('screenshots', 15), (req, res) => {
  const id = req.params.id;
  const { title, content, category, difficulty, summary, pro_tips } = req.body;
  console.log('Submitted slug (should be ignored):', req.body.slug);
  // Note: slug is intentionally NOT destructured – we ignore it

  if (!title || !content) {
    return res.status(400).json({ error: 'Missing required fields: title and content' });
  }

  // Fetch the current (original) slug – we will NOT change it
  db.get('SELECT slug FROM pages WHERE id = ?', [id], (err, current) => {
    if (err) {
      console.error('Fetch original slug error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!current) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const cleanSlug = current.slug; // ← always use original slug

    const save = (screenshotsJson) => {
      db.run(
        `UPDATE pages 
         SET title = ?, slug = ?, content = ?, category = ?, difficulty = ?, 
             screenshots = ?, summary = ?, pro_tips = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [title, cleanSlug, content, category || null, difficulty || 'Beginner',
         screenshotsJson, summary || null, pro_tips || null, id],
        function (err) {
          if (err) {
            console.error('Update failed:', err.message);
            return res.status(500).json({ error: 'Error saving page: ' + err.message });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Page not found' });
          }
          res.json({ success: true });
        }
      );
    };

    if (req.files?.length > 0) {
      const newPaths = req.files.map(f => '/images/pages/' + f.filename);
      save(JSON.stringify(newPaths));
    } else {
      db.get('SELECT screenshots FROM pages WHERE id = ?', [id], (err, row) => {
        if (err || !row) return save('[]');
        save(row.screenshots || '[]');
      });
    }
  });
});

// Public view single page (GET /pages/:slug)
app.get('/pages/:slug', (req, res) => {
  db.get(
    `SELECT p.*,
            u.display_name AS author_display_name,
            u.username AS author_username,
            u.profile_image AS author_profile_image,
            u.bio AS author_bio,
            u.social_links AS author_social_links,
            u.tip_address AS author_tip_address,
            u.created_at AS author_joined_date
     FROM pages p
     LEFT JOIN users u ON p.author_id = u.id
     WHERE p.slug = ?`,
    [req.params.slug],
    (err, page) => {
      if (err) {
        console.error('Database error viewing page:', err.message);
        return res.status(500).send('Server error');
      }

      if (!page) {
        return res.status(404).send('Page not found');
      }

      try {
        page.screenshots = JSON.parse(page.screenshots || '[]');
      } catch (e) {
        page.screenshots = [];
      }

      // Get author's post count
      if (page.author_id) {
        db.get(
          `SELECT COUNT(*) as post_count FROM pages WHERE author_id = ?`,
          [page.author_id],
          (err, countResult) => {
            page.author_post_count = (countResult && countResult.post_count) || 0;
            
            res.render('page', { 
              page,
              user: req.session.user || null,
              likes: 0,
              dislikes: 0
            });
          }
        );
      } else {
        page.author_post_count = 0;
        res.render('page', { 
          page,
          user: req.session.user || null,
          likes: 0,
          dislikes: 0
        });
      }
    }
  );
});

app.get('/category/:cat', (req, res) => {
  const cat = req.params.cat;
  db.all(
    `SELECT p.*, 
            u.display_name as author_display_name,
            u.username as author_username,
            u.profile_image as author_profile_image,
            u.bio as author_bio,
            u.social_links as author_social_links,
            u.tip_address as author_tip_address
     FROM pages p
     LEFT JOIN users u ON p.author_id = u.id
     WHERE p.category = ?
     ORDER BY p.created_at DESC`,
    [cat],
    (err, pages) => {
      if (err) {
        console.error('Category pages error:', err);
        pages = [];
      }
      res.render('category', { category: cat, pages, user: req.session.user || null });
    }
  );
});

// Delete page
app.delete('/admin/pages/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM pages WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  });
});

// Chatbot 
app.use('/chat', chatRoutes);

// Improved error handler – JSON for API calls, HTML for browser pages
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack || err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  const isApiRequest = 
    req.xhr || 
    req.accepts('json') === 'json' || 
    req.path.startsWith('/admin/') || 
    req.path.startsWith('/dashboard/') ||
    req.headers['content-type']?.includes('application/json') ||
    req.originalUrl.includes('/update') || req.originalUrl.includes('/delete');

  if (isApiRequest) {
    res.status(status).json({ error: message });
  } else {
    if (status === 403 || message.toLowerCase().includes('denied') || message.toLowerCase().includes('forbidden')) {
      return res.status(403).render('403', { message });
    }
    res.status(status).render('error', {
      message,
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// ========================================
// ONE-TIME FIX: Update Map Guide Content
// ========================================
// Add this to the BOTTOM of server.js
// Run once, then DELETE this entire section
// ========================================

const fixMapGuide = () => {
  console.log('🔧 Starting Map Guide Fix...');
  
  const correctContent = `<div class="map-guide-container">
    <div class="map-intro">
        <h2>🗺️ Complete TerraVilla Map Guide</h2>
        <p class="last-updated">Last Updated: February 2026</p>
        <p class="intro-text">Your comprehensive guide to every location, NPC, and secret in TerraVilla and surrounds. Navigate the world of Pixels like a pro!</p>
    </div>

    <div class="location-section featured-location">
        <h3 class="location-header">🏠 YOUR SPECK (Your Personal Home)</h3>
        <p class="location-description">What it is: Your personal house where you live and sleep when you start playing.</p>
        <div class="location-details">
            <p class="highlight-info"><strong>Key Features:</strong></p>
            <p>Storage chests for items</p>
            <p>Access to your personal task board (Infinifunnel)</p>
            <p>Bed (sleep for 300 energy!)</p>
            <p>Farmable land</p>
            <p>Trees to cut</p>
            <p>Rocks to mine</p>
            <p>BBQ station</p>
            <p>Cooking station</p>
            <p>Crafting capabilities</p>
            <p>Decorating options</p>
            <p class="highlight-info"><strong>Upgrades: You can make your Speck bigger by upgrading it. You can use more industries on your speck as you upgrade.</strong></p>
            <p>Industry Limit: There's a limit to how many industries you can have active at one time on your Speck. Tip: Use your remover to uplift the industries you arent using and have a chest indoorsd devoted to extra kilns, stoves, woodwoprk and metal working stations and seeds, soil, bbqs and trees oudoors for efficiency</p>
            <p>NFT Land vs. Speck: Even if you buy an NFT land, you'll still have your Speck—everyone gets one when starting.</p>
            <p class="feature-item"><strong>Leaving Your Speck: Walk out the front gate → You'll arrive at TerraVilla Main Fountain</strong></p>
            <img src="/images/map/10000000000004A4000002FF333E784D.jpg" alt="TerraVilla Main Fountain" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 AROUND THE FOUNTAIN</h3>
        <div class="location-details">
            <p class="feature-item"><strong>LEFT SIDE (Below fountain):</strong></p>
            <p>Infiniportal - Portal to different NFT lands</p>
            <img src="/images/map/10000000000001860000014CE06788A3.jpg" alt="Infiniportal" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>RIGHT SIDE (Above fountain):</strong></p>
            <p>Pixel Dungeons Link - Looks like a mine with goblins, connects to PixelDungeons game</p>
            <img src="/images/map/10000000000001B10000010CF6E17F0A.jpg" alt="Pixel Dungeons" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>ABOVE THE FOUNTAIN:</strong></p>
            <p>Billboards displaying:</p>
            <ul style="margin-left: 1.5rem; color: #d0d0ff;">
                <li>TerraVilla map</li>
                <li>Top NFT lands</li>
                <li>Pixel Post (news/updates)</li>
                <li>Events calendar</li>
            </ul>
            <img src="/images/map/10000000000004A3000000CF2D3649A9.jpg" alt="Billboards" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>BELOW THE FOUNTAIN:</strong></p>
            <p>Two purple manned stalls:</p>
            <ul style="margin-left: 1.5rem; color: #d0d0ff;">
                <li>Right stall: Buy NFTs</li>
                <li>Left stall: Buy VIP membership</li>
            </ul>
            <img src="/images/map/1000000000000473000000DC29498C34.jpg" alt="VIP and NFT Stalls" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 RIGHT OF FOUNTAIN</h3>
        <div class="location-details">
            <p class="feature-item"><strong>Buck's Galore:</strong></p>
            <p>Front: Buy seeds and equipment</p>
            <p>Back: The Market - Trade items with other players using coins (requires reputation!)</p>
            <p class="npc-info">👥 <strong>NPCs: Buck at the front counter, Peach at the back Market counter</strong></p>
            <img src="/images/map/10000000000001D5000001C200F50037.jpg" alt="Bucks Galore" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Pet Store:</strong></p>
            <p>Everything related to pets</p>
            <p>Pet food, accessories, etc.</p>
            <p class="npc-info">👥 <strong>NPCs: Kirby (Front desk), Penny (Potion Table), Ben (Pet Incubator)</strong></p>
            <img src="/images/map/1000000000000280000001AE60A730CF.jpg" alt="Pet Store" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 STRAIGHT ABOVE FOUNTAIN</h3>
        <div class="location-details">
            <p class="feature-item"><strong>Hearth Hall:</strong></p>
            <p>Harvest Unions competition for Hearth supremacy</p>
            <p>Compete for $PIXEL rewards</p>
            <p>Choose your faction (Wildgroves, Seedwrights, or Reapers)</p>
            <p class="npc-info">👥 <strong>NPCs: Albus (Hearth Hall Quest), Gianno (Choose Harvest Union), Lucia (Buy Power Offerings and Yield Stone Recipes), Mitchell (Union Info), Wildgroves Booth, Seedwrights Booth, Reapers Booth</strong></p>
            <img src="/images/map/100000000000029900000277699E1B64.jpg" alt="Hearth Hall" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 LEFT OF FOUNTAIN</h3>
        <div class="location-details">
            <p class="feature-item"><strong>Neon Zone (The Arcade):</strong></p>
            <p>Play ranked games to win $PIXEL</p>
            <p>Many Arcade games to choose from (Squish the Fish, Bunny Baiter, Higher-Lower, Da Bomb, Living Labyrinth, Veggie Vexer) and Leon's Hold'em – a basement poker den</p>
            <p>Ranked competitions weekly</p>
            <p class="npc-info">👥 <strong>NPCs: Manager Artie, Allison, Buffy, Bart, Gamemaster Flaster, Derek, Neon Leon, The Giraffe</strong></p>
            
            <p class="feature-item"><strong>The Sauna (Next to Neon Zone):</strong></p>
            <p>Jacuzzi: Available to everyone (faster energy regen)</p>
            <p>Sauna: VIP members only (1000 energy, 2-3 times daily depending on your irl sleep patterns)</p>
            <p class="npc-info">👥 <strong>NPC: Gurney</strong></p>
            <img src="/images/map/10000000000002D8000001DA406303B2.jpg" alt="Neon Zone and Sauna" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 UPPER ROAD - PRODUCTION DISTRICT</h3>
        <div class="location-details">
            <p class="feature-item"><strong>The Windmill:</strong></p>
            <p>Grind various items into processed materials</p>
            <p class="npc-info">👥 <strong>NPC: Gill</strong></p>
            <img src="/images/map/10000000000001270000018327E33A9F.jpg" alt="Windmill" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Theatre:</strong></p>
            <p>Weekly AMAs held here</p>
            <p>Energy parties</p>
            <p class="pro-tip">💡 <em>Secret side door: Alina the Witch's location (hidden NPC!)</em></p>
            <img src="/images/map/100000000000041700000191E196132F.jpg" alt="Theatre" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Stoneshaping Kiln:</strong></p>
            <p>Stone and ore working station</p>
            <p class="npc-info">👥 <strong>NPC: Sandy</strong></p>
            <img src="/images/map/1000000000000209000001A25FCA3F78.jpg" alt="Stoneshaping Kiln" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Two Empty Buildings:</strong></p>
            <p>Barney's Bazaar and The Old Restaurant</p>
            <p>Currently unused</p>
            <p class="pro-tip">💡 <em>Rumor: Pixel Cat Guy opening NFT builder here soon</em></p>
            <img src="/images/map/1000000000000422000001C40AE39103.jpg" alt="Empty Buildings" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Metalworking Station:</strong></p>
            <p>Craft metal items from metal ore</p>
            <p class="npc-info">👥 <strong>NPC: Smith</strong></p>
            <img src="/images/map/10000000000001E30000015442279538.jpg" alt="Metalworking" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Animal Care Section:</strong></p>
            <p>Legacy animals for produce collection:</p>
            <ul style="margin-left: 1.5rem; color: #d0d0ff;">
                <li>Silk Slugs</li>
                <li>Bees (honey, wax)</li>
                <li>Chickens (eggs)</li>
            </ul>
            <p class="npc-info">👥 <strong>NPCs: Ed (Slugs), Amy (Apiary), Cooper (Chickens)</strong></p>
            <img src="/images/map/10000000000003D7000001E1A14BF9DC.jpg" alt="Animal Care" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Composter:</strong></p>
            <p>Make Animal Care products and farming-related products like fertilizer. Will be important for the Animal Care Update.</p>
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 LEFT & RIGHT SIDES</h3>
        <div class="location-details">
            <p class="feature-item"><strong>LEFT SIDE:</strong></p>
            <p>Woodworking Station</p>
            <p>Forestry Station</p>
            <p class="npc-info">👥 <strong>NPCs: Jack (Woodworking), Jill (Forestry)</strong></p>
            <img src="/images/map/10000000000003B30000024DD00DE88D.jpg" alt="Woodworking and Forestry" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>RIGHT SIDE:</strong></p>
            
            <p class="feature-item"><strong>Decor Shop:</strong></p>
            <p>Buy decorative items for your home/land</p>
            <p class="npc-info">👥 <strong>NPCs: Honor (Farm Items), Jerome (Limited-time items), Pixelia (UGCs)</strong></p>
            <img src="/images/map/10000000000001A3000001ACCDD55FAF.jpg" alt="Decor Shop" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>The Bank:</strong></p>
            <p>Financial functions (swap $PIXEL for coins, etc.)</p>
            <p class="pro-tip">💡 <em>Secret entrance: Basement cave (immediately right after entering)</em></p>
            <p class="npc-info">👥 <strong>NPCs:</strong></p>
            <ul style="margin-left: 1.5rem; color: #d0d0ff;">
                <li>Reception: Margret (Buy Coins with Pixel)</li>
                <li>Middle Floor: Regis (Buy Quicksilver), Dave (Buy Coins), Elon (Buy Pixel)</li>
                <li>Upstairs: Lauren (Create a Crypto Wallet), Byron (Deposit and Withdraw Currencies)</li>
            </ul>
            <img src="/images/map/10000000000001A7000001F070EFFD35.jpg" alt="The Bank" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 LOWER STREET (Below Main Fountain)</h3>
        <div class="location-details">
            <p class="feature-item"><strong>The Drunken Goose:</strong></p>
            <p>Local watering hole</p>
            <p class="highlight-info"><strong>Hidden secret: Entrance to underground rave club!</strong></p>
            <p class="npc-info">👥 <strong>NPC: Goose</strong></p>
            <img src="/images/map/10000000000001F50000022968069401.jpg" alt="Drunken Goose" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Winona's Wine Press:</strong></p>
            <p>On the grass - Wine crafting station</p>
            <p class="npc-info">👥 <strong>NPC: Winona</strong></p>
            <img src="/images/map/100000000000020800000179FC7FDA69.jpg" alt="Wine Press" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Ministry of Innovation ⚙️:</strong></p>
            <p>Contains "The Machine" (advanced crafting)</p>
            <p class="npc-info">👥 <strong>NPC: Bitsy</strong></p>
            <img src="/images/map/10000000000001F90000024687774E11.jpg" alt="Ministry of Innovation" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Post Office:</strong></p>
            <p>Daily package from Priya (claim daily rewards!)</p>
            <p class="highlight-info"><strong>Hidden door (back): Old Pixel HQ entrance</strong></p>
            <p class="npc-info">👥 <strong>NPCs: Priya (Post Office), Kathleen and Karen (Pixels HQ)</strong></p>
            <img src="/images/map/1000000000000271000001B169C47429.jpg" alt="Post Office" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Giant Stake Statute:</strong></p>
            <p>Click to access staking app (stake $PIXEL for rewards)</p>
            <p><a href="https://staking.pixels.xyz/" target="_blank" style="color: var(--cyan);">https://staking.pixels.xyz/</a></p>
            <img src="/images/map/10000000000001B5000001D2D985BFF1.jpg" alt="Stake Statue" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Textile Station:</strong></p>
            <p>On the grass - Fabric and textile crafting</p>
            <p class="npc-info">👥 <strong>NPC: Tex</strong></p>
            <img src="/images/map/10000000000001DA00000193996762D9.jpg" alt="Textile Station" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 ROAD TO THE BEACH</h3>
        <div class="location-details">
            <p>Entrance to the Beach: Travel downwards/South between Post Office and Ministry of Innovation</p>
            <img src="/images/map/10000000000002C0000001C1D68A8F12.jpg" alt="Beach Road" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>The Beach:</strong></p>
            <p>Frequent energy parties held here</p>
            <p>Popular gathering spot</p>
            <img src="/images/map/100000000000041C0000025B45DED037.jpg" alt="The Beach" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>The Boardwalk:</strong></p>
            <ul style="margin-left: 1.5rem; color: #d0d0ff;">
                <li>Fishing spot (buy rod at market or Seaside Store)</li>
                <li>BBQ Station (left side) - NPC: Fuy Geiri</li>
                <li>Sushi Station (right side) - NPC: Cod Stewart</li>
                <li>Shipping Contracts - Fill orders for Buoy Bucks + $PIXEL - NPC: Harbourmaster</li>
                <li>Seaside Stash - Spend Buoy Bucks here - NPC: Marina</li>
            </ul>
            <img src="/images/map/100000000000037E0000027F005591A3.jpg" alt="Boardwalk" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>The Musty Lobster Ship ⚓:</strong></p>
            <p>Manned by Captain McKelpy (The Fleet and The Fish Quest)</p>
            <img src="/images/map/10000000000004430000027BC18D50D3.jpg" alt="Musty Lobster Ship" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 THE CARNIVAL</h3>
        <div class="location-details">
            <p class="feature-item"><strong>Location:</strong> Behind Hearth Hall, follow the road</p>
            <p class="feature-item"><strong>Status:</strong> Currently closed, opens for special events (dev-scheduled)</p>
            <p class="feature-item"><strong>Events:</strong> Seasonal celebrations, limited-time activities</p>
            <img src="/images/map/1000000000000630000002FC78BF2A52.jpg" alt="The Carnival" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 RAINBOW ROAD DESTINATIONS</h3>
        <div class="location-details">
            <p class="feature-item"><strong>LEFT PATH:</strong></p>
            <p>Football Field ⚽ - Sports activities, events</p>
            <img src="/images/map/1000000000000456000002934C91E5FC.jpg" alt="Football Field" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>RIGHT PATH:</strong></p>
            
            <p class="feature-item"><strong>Guild Castle:</strong></p>
            <p>Guild information and management</p>
            <p>Access to Spore Sport Caves (below the hall)</p>
            <p class="npc-info">👥 <strong>NPCs: Gabby Dizon, Player W3, Luke, Jolt (Spore Sport Cave)</strong></p>
            
            <p class="feature-item"><strong>Guild Castle Gardens:</strong></p>
            <p class="npc-info">👥 <strong>NPCs: Glint from FableBourne with portal to FableBourne lands, Kiko</strong></p>
            <img src="/images/map/100000000000058200000252C9E7FC01.jpg" alt="Guild Castle" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section main-location">
        <h3 class="location-header">📍 HIDDEN AREAS</h3>
        <div class="location-details">
            <p class="feature-item"><strong>Rave Club under the Drunken Goose:</strong></p>
            <img src="/images/map/1000000000000455000002892211325C.jpg" alt="Rave Club" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Cave under The Bank:</strong></p>
            <img src="/images/map/10000000000003C3000002150D72B611.jpg" alt="Bank Cave" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Spore Sports Cave:</strong></p>
            <img src="/images/map/10000000000004D50000029D2D2D464E.jpg" alt="Spore Sports Cave" class="map-image" loading="lazy">
            
            <p class="feature-item"><strong>Alina's Grotto:</strong></p>
            <img src="/images/map/10000000000001330000012854DCF66E.jpg" alt="Alinas Grotto 1" class="map-image" loading="lazy">
            <img src="/images/map/100000000000027A0000027AFBB0020A.jpg" alt="Alinas Grotto 2" class="map-image" loading="lazy">
        </div>
    </div>

    <div class="location-section" style="background: rgba(237, 255, 132, 0.05); border: 2px solid rgba(237, 255, 132, 0.3);">
        <h3 style="color: var(--yellow);">🗺️ Quick Reference: Fountain Area Layout</h3>
        <div style="font-family: monospace; color: #d0d0ff; line-height: 2;">
            <p style="text-align: center;">[Hearth Hall]</p>
            <p style="text-align: center;">↑</p>
            <p style="text-align: center;">[Billboards Area - Map/Events/News]</p>
            <p style="text-align: center;">↑</p>
            <p style="text-align: center;">[Neon Zone] ← [FOUNTAIN] → [Buck's Galore]</p>
            <p style="text-align: center;">+ Sauna&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ Market</p>
            <p style="text-align: center;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ Pet Store</p>
            <p style="text-align: center;">↓</p>
            <p style="text-align: center;">[Purple Stalls]</p>
            <p style="text-align: center;">VIP (L) | NFT (R)</p>
            <p style="text-align: center;">↓</p>
            <p style="text-align: center;">[Infiniportal] [Pixel Dungeons]</p>
            <br>
            <p><strong>Roads Leading Out:</strong></p>
            <ul style="margin-left: 1.5rem;">
                <li>Behind Hearth Hall → Carnival</li>
                <li>Rainbow Left → Football Field</li>
                <li>Rainbow Right → Guild Hall</li>
                <li>Below Fountain → Beach Road</li>
            </ul>
        </div>
        <p style="text-align: center; color: #999; font-style: italic; margin-top: 2rem;">Last updated February 2026 by Lizzy Sims</p>
    </div>

</div>

<style>
.map-guide-container {
    max-width: 1000px;
    margin: 0 auto;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.map-intro {
    background: linear-gradient(135deg, rgba(237, 255, 132, 0.1), rgba(0, 255, 255, 0.1));
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 2rem;
    border: 2px solid rgba(237, 255, 132, 0.3);
}

.map-intro h2 {
    color: var(--yellow, #edff84);
    margin-bottom: 0.5rem;
    font-size: 2rem;
}

.last-updated {
    color: #999;
    font-size: 0.9rem;
    margin-bottom: 1rem;
}

.intro-text {
    color: #d0d0ff;
    font-size: 1.1rem;
    line-height: 1.6;
}

.location-section {
    background: rgba(20, 20, 40, 0.5);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border-radius: 10px;
    border-left: 4px solid rgba(0, 255, 255, 0.5);
}

.main-location {
    border-left: 4px solid rgba(237, 255, 132, 0.8);
    background: rgba(237, 255, 132, 0.05);
}

.featured-location {
    border-left: 4px solid #ff6b6b;
    background: rgba(255, 107, 107, 0.05);
}

.location-header {
    color: var(--cyan, #00ffff);
    font-size: 1.5rem;
    margin-bottom: 1rem;
    border-bottom: 2px solid rgba(0, 255, 255, 0.2);
    padding-bottom: 0.5rem;
}

.featured-location .location-header {
    color: #ff6b6b;
}

.main-location .location-header {
    color: var(--yellow, #edff84);
}

.location-description {
    color: #b0b0ff;
    font-style: italic;
    margin-bottom: 1rem;
}

.location-details {
    color: #d0d0ff;
    line-height: 1.8;
}

.location-details p {
    margin-bottom: 0.8rem;
}

.npc-info {
    background: rgba(0, 255, 255, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border-left: 3px solid var(--cyan, #00ffff);
    margin: 1rem 0;
}

.feature-item {
    padding-left: 1.5rem;
    position: relative;
}

.feature-item::before {
    content: "▸";
    position: absolute;
    left: 0;
    color: var(--cyan, #00ffff);
}

.highlight-info {
    background: rgba(237, 255, 132, 0.1);
    padding: 0.8rem;
    border-radius: 6px;
    border-left: 3px solid var(--yellow, #edff84);
    margin: 1rem 0;
}

.pro-tip {
    background: rgba(255, 165, 0, 0.1);
    padding: 0.8rem;
    border-radius: 6px;
    border-left: 3px solid #ffa500;
    margin: 1rem 0;
    font-style: italic;
}

.map-image {
    width: 100%;
    max-width: 600px;
    height: auto;
    border-radius: 8px;
    margin: 1.5rem 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(0, 255, 255, 0.2);
}

.map-image:hover {
    transform: scale(1.02);
    transition: transform 0.3s ease;
    border-color: var(--cyan, #00ffff);
}

@media (max-width: 768px) {
    .map-intro {
        padding: 1.5rem;
    }
    
    .map-intro h2 {
        font-size: 1.5rem;
    }
    
    .location-section {
        padding: 1rem;
    }
    
    .map-image {
        max-width: 100%;
    }
}
</style>`;

  const sql = `UPDATE pages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = 'terravilla-map-guide'`;
  
  db.run(sql, [correctContent], function(err) {
    if (err) {
      console.error('❌ Fix failed:', err);
    } else {
      console.log('✅ Map Guide Fixed!');
      console.log('   Updated rows:', this.changes);
      console.log('   Content length:', correctContent.length);
      console.log('');
      console.log('🎉 SUCCESS! Map guide now has ONLY content from your original ODT!');
      console.log('   ❌ Removed: Caleb, Joe, Oswald, Quinn, Niki, etc.');
      console.log('   ✅ Kept: Buck, Peach, Priya, Tex, Captain McKelpy, etc.');
      console.log('');
      console.log('🗑️  NOW DELETE THIS ENTIRE SECTION FROM server.js!');
    }
  });
};

// Run the fix immediately when server starts
setTimeout(() => {
  fixMapGuide();
}, 2000); // Wait 2 seconds for database to be ready

// ========================================
// END OF FIX - DELETE EVERYTHING ABOVE
// ========================================
