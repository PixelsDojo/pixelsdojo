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
// app.use(methodOverride('_method'));   // ← uncomment later if you want form-based PUT/DELETE

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

// ─── ADMIN PROTECTION MIDDLEWARE ───
function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(403).send('Access denied - admin only');
  }
  next();
}

// Homepage
app.get('/', (req, res) => {
  db.all(`
    SELECT p.*, u.display_name as author_display_name
    FROM pages p LEFT JOIN users u ON p.author_id = u.id
    ORDER BY created_at DESC LIMIT 5
  `, [], (err, recentPages) => {
    if (err) {
      console.error('Recent pages error:', err);
      recentPages = [];
    }
    res.render('index', { user: req.session.user || null, recentPages: recentPages || [] });
  });
});

// NPCs list
app.get('/npcs', (req, res) => {
  db.all('SELECT * FROM npcs ORDER BY display_order ASC', [], (err, rows) => {
    if (err) return res.status(500).send('Database error loading NPCs');
    res.render('npcs', { npcs: rows, user: req.session.user || null });
  });
});

// ─── Auth routes ─── (login, register, logout, profile) unchanged, keeping as-is

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

// register, logout, profile, profile/edit, profile/update, profile/delete → same as your code, omitted for brevity

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

// Create page (unchanged, but protected)
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

// ─── PAGE EDIT ────────────────────────────────────────────────

// Get page data as JSON (for modal)
app.get('/admin/pages/:id/edit', requireAdmin, (req, res) => {
  db.get('SELECT * FROM pages WHERE id = ?', [req.params.id], (err, page) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!page) return res.status(404).json({ error: 'Page not found' });

    page.screenshots = JSON.parse(page.screenshots || '[]');
    res.json(page);
  });
});

// Update page (using POST + multer — easier with files)
  // Update page (using POST + multer — easier with files)
app.post('/admin/pages/:id/update', requireAdmin, upload.array('screenshots', 15), (req, res) => {
  const id = req.params.id;
  const { title, slug, content, category, difficulty, summary, pro_tips } = req.body;

  if (!title || !slug || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const cleanSlug = slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // ────────────────────────────────
  //   Check for slug conflict
  // ────────────────────────────────
  db.get(
    'SELECT id FROM pages WHERE slug = ? AND id != ?',
    [cleanSlug, id],
    (err, row) => {
      if (err) {
        console.error('Slug check error:', err.message);
        return res.status(500).json({ error: 'Database error during slug check' });
      }

      if (row) {
        // Another page already uses this slug
        return res.status(409).json({
          error: 'This slug is already in use by another page. Please choose a different one.'
        });
      }

      // No conflict → proceed with update
      const save = (screenshotsJson) => {
        db.run(
          `UPDATE pages 
           SET title=?, slug=?, content=?, category=?, difficulty=?, 
               screenshots=?, summary=?, pro_tips=?, updated_at=CURRENT_TIMESTAMP 
           WHERE id=?`,
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
            // Alternative: res.redirect('/admin'); if you prefer redirect instead of JSON response
          }
        );
      };

      if (req.files?.length > 0) {
        // New screenshots uploaded → replace old ones
        const newPaths = req.files.map(f => '/images/pages/' + f.filename);
        save(JSON.stringify(newPaths));
      } else {
        // Keep existing screenshots
        db.get('SELECT screenshots FROM pages WHERE id = ?', [id], (err, row) => {
          if (err || !row) return save('[]');
          save(row.screenshots);
        });
      }
    }
  );
});

  if (req.files?.length > 0) {
    // New files → replace old screenshots
    const newPaths = req.files.map(f => '/images/pages/' + f.filename);
    save(JSON.stringify(newPaths));
  } else {
    // No new files → keep existing
    db.get('SELECT screenshots FROM pages WHERE id = ?', [id], (err, row) => {
      if (err || !row) return save('[]');
      save(row.screenshots);
    });
  }
});

// Delete page (unchanged)
app.delete('/admin/pages/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM pages WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  });
});

// ─── NPC routes (unchanged, but protected) ───
// add requireAdmin to each if not already

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
