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
const db = require('./database.js');  // Your DB module

const app = express();

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/images/npcs/'),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB max
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session for login state
app.use(session({
  secret: 'pixels-dojo-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Make user available in all EJS templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Set EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Homepage
app.get('/', (req, res) => {
  res.render('index', { 
    message: 'Pixels Online Wiki is live!',
    user: req.session.user || null 
  });
});

// NPCs page
app.get('/npcs', (req, res) => {
  db.all('SELECT * FROM npcs ORDER BY display_order ASC', [], (err, rows) => {
    if (err) {
      console.error('NPC query error:', err.message);
      return res.status(500).send('Database error loading NPCs');
    }
    console.log(`Rendered NPCs page with ${rows.length} entries`);
    res.render('npcs', { 
      npcs: rows,
      user: req.session.user || null 
    });
  });
});

// Login routes (unchanged)
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null, user: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.render('login', { error: 'Invalid username or password', user: null });
    }

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        console.error('bcrypt compare error:', err);
        return res.render('login', { error: 'Server error', user: null });
      }

      if (match) {
        req.session.user = {
          id: user.id,
          username: user.username,
          is_admin: !!user.is_admin
        };
        console.log(`User logged in: ${user.username}`);
        return res.redirect('/');
      } else {
        res.render('login', { error: 'Invalid username or password', user: null });
      }
    });
  });
});

// Register, logout, etc. (unchanged - keeping your code)

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');  // clear session cookie
    res.redirect('/');
  });
});

// Profile page
app.get('/profile', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('profile', { user: req.session.user });
});

// Delete account (basic - add confirmation later)
app.post('/profile/delete', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  db.run('DELETE FROM users WHERE id = ?', [req.session.user.id], (err) => {
    if (err) {
      console.error('Delete user error:', err);
      return res.status(500).send('Error deleting account');
    }
    req.session.destroy(() => res.redirect('/'));
  });
});

// Admin dashboard
app.get('/admin', (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(403).send('Access denied - admin only');
  }

  db.all('SELECT * FROM npcs ORDER BY display_order ASC', [], (err, npcRows) => {
    if (err) return res.status(500).send('Error loading NPCs');

    db.all('SELECT * FROM pages ORDER BY created_at DESC', [], (err, pageRows) => {
      if (err) return res.status(500).send('Error loading pages');

      console.log(`Admin dashboard: ${npcRows.length} NPCs, ${pageRows.length} pages`);

      res.render('admin', {
        user: req.session.user,
        npcs: npcRows,
        pages: pageRows
      });
    });
  });
});

// Create new page (unchanged - good)
app.post('/admin/pages', (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) return res.status(403).send('Admin only');

  const { title, slug, content, category } = req.body;

  if (!title || !slug || !content) return res.status(400).send('Missing fields');

  const cleanSlug = slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  db.run(
    `INSERT INTO pages (slug, title, content, category, author_id) VALUES (?, ?, ?, ?, ?)`,
    [cleanSlug, title, content, category || null, req.session.user.id],
    (err) => {
      if (err) {
        console.error('Page creation error:', err.message);
        return res.status(500).send('Error saving page: ' + err.message);
      }
      console.log(`New page: ${title} (${cleanSlug})`);
      res.redirect('/admin');
    }
  );
});

// View page (unchanged for now)
// View a single wiki page (public)
app.get('/pages/:slug', (req, res) => {
  db.get('SELECT * FROM pages WHERE slug = ?', [req.params.slug], (err, page) => {
    if (err || !page) {
      return res.status(404).send('Page not found');
    }

    let likes = 0;
    let userReaction = null;

    db.get('SELECT COUNT(*) as count FROM likes WHERE page_id = ? AND type = "like"', [page.id], (err, row) => {
      if (!err && row) likes = row.count || 0;

      if (req.session.user) {
        db.get('SELECT type FROM likes WHERE page_id = ? AND user_id = ?', [page.id, req.session.user.id], (err, reaction) => {
          if (!err && reaction) userReaction = reaction.type;
          renderPage();
        });
      } else {
        renderPage();
      }
    });

    function renderPage() {
      res.render('page', {
        page: page,
        user: req.session.user || null,
        likes: likes,
        userReaction: userReaction || null  // safe default
      });
    }
  });
});

// FIXED: Update NPC with image upload
app.post('/admin/npcs/:id', upload.single('image'), (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(403).send('Admin only');
  }

  const id = req.params.id;
  const { name, location, description, display_order, current_image_path } = req.body;

  let imagePath = current_image_path || '/images/npcs/default-npc.png';

  if (req.file) {
    imagePath = '/images/npcs/' + req.file.filename;
    console.log(`New image uploaded for NPC ${id}: ${req.file.filename}`);
  }

  db.run(
    `UPDATE npcs SET name = ?, location = ?, description = ?, image_path = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, location, description || null, imagePath, parseInt(display_order) || 999, id],
    (err) => {
      if (err) {
        console.error('NPC update error:', err.message);
        return res.status(500).send('Error saving NPC: ' + err.message);
      }
      console.log(`NPC ${id} updated successfully`);
      res.redirect('/admin');
    }
  );
});

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack);
  res.status(500).send(`Internal Server Error: ${err.message}`);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===== Server is LIVE on port ${PORT} =====`);
});
