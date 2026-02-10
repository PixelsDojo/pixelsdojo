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
const db = require('./database.js');  // Your DB module

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));  // Serves CSS, images, screenshots

// Session for login state
app.use(session({
  secret: 'pixels-dojo-secret-key-change-this-in-production', // ← change this to something random/strong
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set secure: true when you have HTTPS
}));

// Make user available in all EJS templates (fixes navbar)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Set EJS as view engine
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

// Login page
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

// Register page
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register', { error: null, user: null });
});

app.post('/register', (req, res) => {
  const { username, email, password, display_name } = req.body;

  if (!username || !email || !password) {
    return res.render('register', { error: 'All fields required', user: null });
  }

  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, existing) => {
    if (existing) {
      return res.render('register', { error: 'Username or email already taken', user: null });
    }

    const hashedPw = bcrypt.hashSync(password, 10);
    db.run(
      `INSERT INTO users (username, email, password, display_name) VALUES (?, ?, ?, ?)`,
      [username, email, hashedPw, display_name || username],
      function (err) {
        if (err) {
          console.error('Register insert error:', err.message);
          return res.render('register', { error: 'Registration failed - try again', user: null });
        }
        console.log(`New user registered: ${username}`);
        res.redirect('/login');
      }
    );
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Admin dashboard - load NPCs
app.get('/admin', (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(403).send('Access denied - admin only');
  }

  db.all('SELECT * FROM npcs ORDER BY display_order ASC', [], (err, rows) => {
    if (err) {
      console.error('Admin NPCs query error:', err.message);
      return res.status(500).send('Error loading NPCs for admin dashboard');
    }

    console.log(`Admin dashboard loaded with ${rows.length} NPCs`);

    res.render('admin', {
      user: req.session.user,
      npcs: rows
    });
  });
});

// Create new wiki page from admin form
app.post('/admin/pages', (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(403).send('Access denied - admin only');
  }

  const { title, slug, content, category } = req.body;

  if (!title || !slug || !content) {
    return res.status(400).send('Missing required fields: title, slug, content');
  }

  // Clean slug (make it URL-safe)
  const cleanSlug = slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  db.run(
    `INSERT INTO pages (slug, title, content, category, author_id) 
     VALUES (?, ?, ?, ?, ?)`,
    [cleanSlug, title, content, category || null, req.session.user.id],
    (err) => {
      if (err) {
        console.error('Page creation error:', err.message);
        return res.status(500).send('Error saving page: ' + err.message);
      }

      console.log(`New page created: ${title} (${cleanSlug})`);
      res.redirect('/admin');
    }
  );
});

// View a single wiki page (public)
app.get('/pages/:slug', (req, res) => {
  db.get('SELECT * FROM pages WHERE slug = ?', [req.params.slug], (err, page) => {
    if (err || !page) {
      return res.status(404).send('Page not found');
    }
    res.render('page', {
      page: page,
      user: req.session.user || null
    });
  });
});

// Catch-all error handler (shows better 500 messages)
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack);
  res.status(500).send(`Internal Server Error: ${err.message}`);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===== Server is LIVE on port ${PORT} (bound to 0.0.0.0) =====`);
});
