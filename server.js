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
app.post('/register', (req, res) => {
  const { username, email, password, display_name, bio } = req.body;

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
      `INSERT INTO users (username, email, password, display_name, bio, profile_image, is_admin, is_contributor)
       VALUES (?, ?, ?, ?, ?, '/images/default-avatar.png', 0, 0)`,
      [username.trim(), email.trim(), hash, display_name.trim(), bio ? bio.trim() : ''],
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
    `SELECT id, username, email, display_name, bio, profile_image, is_admin, is_contributor 
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
app.get('/profile/edit', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login?redirect=/profile/edit');
  }

  db.get(
    `SELECT id, username, email, display_name, bio, profile_image 
     FROM users WHERE id = ?`,
    [req.session.user.id],
    (err, fullUser) => {
      if (err || !fullUser) {
        console.error('Edit profile fetch error:', err);
        return res.redirect('/profile?error=load_failed');
      }

      // Update session (optional but keeps everything in sync)
      req.session.user = {
        ...req.session.user,
        display_name: fullUser.display_name,
        bio: fullUser.bio,
        profile_image: fullUser.profile_image
      };

      res.render('profile-edit', {
        user: fullUser,   // pass fresh full user
        error: null
      });
    }
  );
});

// Update profile (POST /profile/edit) – already mostly good, minor safety improvements
app.post('/profile/edit', upload.single('profile_image'), (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { display_name, bio } = req.body;
  const userId = req.session.user.id;

  // Build dynamic update
  let updateQuery = `UPDATE users SET display_name = ?`;
  let params = [display_name || req.session.user.display_name || req.session.user.username];

  updateQuery += `, bio = ?`;
  params.push(bio || '');

  if (req.file) {
    const imagePath = `/images/profiles/${req.file.filename}`;
    updateQuery += `, profile_image = ?`;
    params.push(imagePath);
  }

  updateQuery += ` WHERE id = ?`;
  params.push(userId);

  console.log('Profile update attempt:', { display_name, bio, hasFile: !!req.file, userId });

  db.run(updateQuery, params, function (err) {
    if (err) {
      console.error('Profile update DB error:', err.message);
      return res.render('profile-edit', {
        user: req.session.user,
        error: 'Failed to save changes. Please try again.'
      });
    }

    // Update session immediately so changes show without re-login
    req.session.user.display_name = display_name || req.session.user.display_name;
    req.session.user.bio = bio || req.session.user.bio || '';

    if (req.file) {
      req.session.user.profile_image = `/images/profiles/${req.file.filename}`;
    }

    res.redirect('/profile?success=1');
  });
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
          u.profile_image AS author_profile_image,
          u.bio AS author_bio
   FROM pages p
   LEFT JOIN users u ON p.author_id = u.id
   WHERE p.slug = ?`,
  [req.params.slug],
  (err, page) => {
    // ← keep everything BELOW this line the same as it is now (if err, if (!page), res.render etc.)
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

app.get('/category/:cat', (req, res) => {
  const cat = req.params.cat;
  db.all(
    `SELECT * FROM pages WHERE category = ? ORDER BY created_at DESC`,
    [cat],
    (err, pages) => {
      if (err) pages = [];
      res.render('category', { category: cat, pages, user: req.session.user });
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
