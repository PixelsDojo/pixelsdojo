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
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/images/npcs',     express.static('/app/data/images/npcs'));
app.use('/images/profiles', express.static('/app/data/images/profiles'));
app.use('/images/pages',    express.static('/app/data/images/pages'));

app.use(session({
  secret: 'pixels-dojo-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
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

// NPCs list
app.get('/npcs', (req, res) => {
  db.all('SELECT * FROM npcs ORDER BY display_order ASC', [], (err, rows) => {
    if (err) return res.status(500).send('Database error loading NPCs');
    res.render('npcs', { npcs: rows, user: req.session.user || null });
  });
});

// Login
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null, user: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) return res.render('login', { error: 'Invalid username or password', user: null });

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) return res.render('login', { error: 'Server error', user: null });
      if (match) {
        req.session.user = {
          id: user.id,
          username: user.username,
          is_admin: !!user.is_admin
        };
        return res.redirect('/');
      }
      res.render('login', { error: 'Invalid username or password', user: null });
    });
  });
});

// User Profile (GET /profile)
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login?redirect=/profile');
  }

  // Optional: fetch user's contributed pages or other data
  db.all(
    `SELECT * FROM pages WHERE author_id = ? ORDER BY created_at DESC`,
    [req.session.user.id],
    (err, userPages) => {
      if (err) {
        console.error('Error loading user pages:', err);
        userPages = [];
      }

      res.render('profile', {
        user: req.session.user,
        pages: userPages || []
      });
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
    `SELECT * FROM pages WHERE slug = ?`,
    [req.params.slug],
    (err, page) => {
      if (err) {
        console.error('Database error viewing page:', err.message);
        return res.status(500).send('Server error');
      }
      if (!page) {
        return res.status(404).send('Page not found');
      }

      // Optional: parse screenshots if stored as JSON
      try {
        page.screenshots = JSON.parse(page.screenshots || '[]');
      } catch (e) {
        page.screenshots = [];
      }

      res.render('page', { 
        page,
        user: req.session.user || null,
        likes: 0,          // replace with real like count later
        dislikes: 0        // same
      });
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
