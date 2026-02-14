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
const sharp = require('sharp');
const db = require('./database.js');
const chatRoutes = require('./routes/chat');

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

// Multer setup (memoryStorage for sharp processing)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only images (jpg, png, gif, webp) allowed'));
  }
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

// Contributor + Admin ownership check for pages
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
      const isOwner = row.author_id === req.session.user.id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'You can only edit or delete your own pages' });
      }

      next();
    }
  );
}

// Homepage
app.get('/', (req, res) => {
  db.all(`
    SELECT p.*, u.display_name as author_display_name
    FROM pages p 
    LEFT JOIN users u ON p.author_id = u.id
    ORDER BY p.created_at DESC 
    LIMIT 6
  `, [], (err, recentPages) => {
    if (err) recentPages = [];

    db.get(`
      SELECT p.*, u.display_name as author_display_name
      FROM pages p 
      LEFT JOIN users u ON p.author_id = u.id
      ORDER BY p.upvotes DESC 
      LIMIT 1
    `, [], (err, mostUpvoted) => {
      if (err || !mostUpvoted) mostUpvoted = null;

      db.get(`
        SELECT p.*, u.display_name as author_display_name
        FROM pages p 
        LEFT JOIN users u ON p.author_id = u.id
        ORDER BY p.views DESC 
        LIMIT 1
      `, [], (err, mostViewed) => {
        if (err || !mostViewed) mostViewed = null;

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
            if (err) categoryData[cat] = [];
            else categoryData[cat] = posts;

            completed++;
            if (completed === categories.length) {
              res.render('index', {
                user: req.session.user || null,
                recentPages,
                mostUpvoted,
                mostViewed,
                categoryData
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
  const sort = req.query.sort || 'name';
  let orderBy = 'name ASC';

  if (sort === 'name-desc') orderBy = 'name DESC';
  else if (sort === 'location') orderBy = 'location ASC';
  else if (sort === 'location-desc') orderBy = 'location DESC';
  else if (sort === 'order') orderBy = 'display_order ASC, name ASC';

  db.all(`SELECT * FROM npcs ORDER BY ${orderBy}`, [], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    res.render('npcs', { npcs: rows, user: req.session.user || null, currentSort: sort });
  });
});

// Admin: Create NPC
app.post('/admin/npcs', requireAdmin, upload.single('image'), (req, res) => {
  const { name, location, description, display_order } = req.body;
  if (!name || name.trim() === '') return res.status(400).json({ error: 'NPC name required' });

  let imagePath = null;
  if (req.file) imagePath = `/images/npcs/${req.file.filename}`;

  const order = parseInt(display_order) || 999;

  db.run(
    `INSERT INTO npcs (name, location, description, image_path, display_order, created_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [name.trim(), location?.trim() || null, description?.trim() || null, imagePath, order],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to create NPC' });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Admin: Update NPC
app.post('/admin/npcs/:id/update', requireAdmin, upload.single('image'), (req, res) => {
  const id = req.params.id;
  const { name, location, description, display_order } = req.body;
  if (!name || name.trim() === '') return res.status(400).json({ error: 'NPC name required' });

  let query = `UPDATE npcs SET name = ?, location = ?, description = ?, display_order = ?`;
  let params = [name.trim(), location?.trim() || null, description?.trim() || null, parseInt(display_order) || 999];

  if (req.file) {
    const imagePath = `/images/npcs/${req.file.filename}`;
    query += `, image_path = ?`;
    params.push(imagePath);
  }

  query += ` WHERE id = ?`;
  params.push(id);

  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update NPC' });
    if (this.changes === 0) return res.status(404).json({ error: 'NPC not found' });
    res.json({ success: true });
  });
});

// Admin: Delete NPC
app.delete('/admin/npcs/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM npcs WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    if (this.changes === 0) return res.status(404).json({ error: 'NPC not found' });
    res.json({ success: true });
  });
});

// Dashboard - only contributors/admins
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login?redirect=/dashboard');

  if (!req.session.user.is_contributor && !req.session.user.is_admin) {
    return res.status(403).send('Access denied - contributors only');
  }

  const userId = req.session.user.id;

  db.all(
    `SELECT * FROM pages WHERE author_id = ? ORDER BY updated_at DESC`,
    [userId],
    (err, userPages) => {
      if (err) userPages = [];
      res.render('dashboard', {
        user: req.session.user,
        pages: userPages,
        isAdmin: !!req.session.user.is_admin
      });
    }
  );
});

// Contributor: Create new page
app.post('/dashboard/pages', (req, res, next) => {
  if (!req.session.user || (!req.session.user.is_contributor && !req.session.user.is_admin)) {
    return res.status(403).json({ error: 'Only contributors can create pages' });
  }
  next();
}, upload.array('screenshots', 15), async (req, res) => {
  const { title, slug, content, category, difficulty, summary, pro_tips } = req.body;
  if (!title || !slug || !content) return res.status(400).json({ error: 'Missing required fields' });

  const cleanSlug = slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  let screenshots = [];
  if (req.files && req.files.length > 0) {
    try {
      screenshots = await Promise.all(
        req.files.map(async (file) => {
          const processed = await sharp(file.buffer)
            .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toBuffer();

          const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.jpg';
          const dest = path.join('/app/data/images/pages', filename);
          await sharp(processed).toFile(dest);

          return `/images/pages/${filename}`;
        })
      );
    } catch (err) {
      console.error('Screenshot processing error on create:', err);
    }
  }

  const screenshotsJson = JSON.stringify(screenshots);

  db.run(
    `INSERT INTO pages (slug, title, content, category, difficulty, screenshots, summary, pro_tips, author_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [cleanSlug, title, content, category || null, difficulty || 'Beginner', screenshotsJson, summary || null, pro_tips || null, req.session.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to create page' });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Contributor: Get own page for edit (JSON)
app.get('/dashboard/pages/:id/edit', requireAdminOrOwner, (req, res) => {
  db.get('SELECT * FROM pages WHERE id = ?', [req.params.id], (err, page) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!page) return res.status(404).json({ error: 'Page not found' });

    try {
      page.screenshots = JSON.parse(page.screenshots || '[]');
    } catch {
      page.screenshots = [];
    }

    res.json(page);
  });
});

// Contributor: Update own page
app.post('/dashboard/pages/:id/update', requireAdminOrOwner, upload.array('screenshots', 15), (req, res) => {
  const id = req.params.id;
  const { title, content, category, difficulty, summary, pro_tips } = req.body;

  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

  db.get('SELECT slug, screenshots FROM pages WHERE id = ?', [id], (err, current) => {
    if (err || !current) return res.status(404).json({ error: 'Page not found' });

    const cleanSlug = current.slug;

    const handleSave = (screenshotsJson) => {
      db.run(
        `UPDATE pages SET title = ?, slug = ?, content = ?, category = ?, difficulty = ?, 
         screenshots = ?, summary = ?, pro_tips = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [title, cleanSlug, content, category || null, difficulty || 'Beginner',
         screenshotsJson, summary || null, pro_tips || null, id],
        function (err) {
          if (err) return res.status(500).json({ error: 'Update failed' });
          if (this.changes === 0) return res.status(404).json({ error: 'Page not found' });
          res.json({ success: true });
        }
      );
    };

    if (req.files && req.files.length > 0) {
      const newPaths = req.files.map(f => '/images/pages/' + f.filename);
      handleSave(JSON.stringify(newPaths));
    } else {
      handleSave(current.screenshots || '[]');
    }
  });
});

// Contributor: Delete own page
app.delete('/dashboard/pages/:id', requireAdminOrOwner, (req, res) => {
  db.run('DELETE FROM pages WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    if (this.changes === 0) return res.status(404).json({ error: 'Page not found' });
    res.json({ success: true });
  });
});

// All Posts
app.get('/all-posts', (req, res) => {
  db.all(`
    SELECT p.*, u.display_name as author_display_name
    FROM pages p
    LEFT JOIN users u ON p.author_id = u.id
    ORDER BY p.created_at DESC
  `, [], (err, allPages) => {
    if (err) allPages = [];
    res.render('all-posts', { pages: allPages, user: req.session.user || null });
  });
});

// Register
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register', { error: null });
});

app.post('/register', (req, res) => {
  const { username, email, password, display_name, bio } = req.body;

  if (!username || !email || !password) {
    return res.render('register', { error: 'Username, email, and password required' });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.render('register', { error: 'Server error' });

    db.run(
      `INSERT INTO users (username, email, password, display_name, bio, profile_image, is_admin, is_contributor)
       VALUES (?, ?, ?, ?, ?, '/images/default-avatar.png', 0, 0)`,
      [username.trim(), email.trim(), hash, display_name?.trim() || null, bio?.trim() || null],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) return res.render('register', { error: 'Username or email taken' });
          return res.render('register', { error: 'Registration failed' });
        }

        req.session.user = {
          id: this.lastID,
          username: username.trim(),
          display_name: display_name?.trim() || username.trim(),
          is_admin: 0,
          is_contributor: 0,
          profile_image: '/images/default-avatar.png'
        };

        res.redirect('/?registered=success');
      }
    );
  });
});

// Login
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) return res.render('login', { error: 'Invalid username or password' });

    bcrypt.compare(password, user.password, (err, match) => {
      if (err || !match) return res.render('login', { error: 'Invalid username or password' });

      req.session.user = {
        id: user.id,
        username: user.username,
        display_name: user.display_name || user.username,
        profile_image: user.profile_image || '/images/default-avatar.png',
        is_admin: !!user.is_admin,
        is_contributor: !!user.is_contributor
      };

      res.redirect('/');
    });
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login?message=logged_out');
  });
});

// Profile view
app.get('/profile', (req, res) => {
  if (!req.session.user) return res.redirect('/login?redirect=/profile');

  db.get(
    `SELECT id, username, email, display_name, bio, profile_image, is_admin, is_contributor 
     FROM users WHERE id = ?`,
    [req.session.user.id],
    (err, fullUser) => {
      if (err || !fullUser) {
        req.session.destroy();
        return res.redirect('/login?error=user_not_found');
      }

      req.session.user = {
        ...req.session.user,
        display_name: fullUser.display_name || fullUser.username,
        bio: fullUser.bio || '',
        profile_image: fullUser.profile_image || '/images/default-avatar.png',
        is_contributor: !!fullUser.is_contributor
      };

      db.all(
        `SELECT * FROM pages WHERE author_id = ? ORDER BY created_at DESC`,
        [req.session.user.id],
        (err, userPages) => {
          if (err) userPages = [];
          res.render('profile', { user: req.session.user, pages: userPages });
        }
      );
    }
  );
});

// Profile edit form
app.get('/profile/edit', (req, res) => {
  if (!req.session.user) return res.redirect('/login?redirect=/profile/edit');

  if (!req.session.user.is_admin && !req.session.user.is_contributor) {
    return res.status(403).send('Access denied - admin or contributor only');
  }

  db.get(
    `SELECT id, username, display_name, bio, profile_image, social_links, tip_address 
     FROM users WHERE id = ?`,
    [req.session.user.id],
    (err, fullUser) => {
      if (err || !fullUser) return res.redirect('/profile?error=load_failed');

      res.render('profile-edit', { user: fullUser, error: null });
    }
  );
});

// Profile edit save
app.post('/profile/edit', upload.single('profile_image'), async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const userId = req.session.user.id;
  const isEligible = req.session.user.is_admin || req.session.user.is_contributor;

  const { display_name, bio, social_links, tip_address } = req.body;

  let profileImagePath = req.session.user.profile_image || '/images/default-avatar.png';

  if (req.file) {
    try {
      const processedBuffer = await sharp(req.file.buffer)
        .resize(400, 400, { fit: 'cover', position: 'center' })
        .
