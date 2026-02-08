const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './public/images/npcs';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: 'pixels-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/page/:slug', (req, res) => {
  db.get('SELECT p.*, u.display_name, u.profile_image, u.bio FROM pages p LEFT JOIN users u ON p.author_id = u.id WHERE p.slug = ?',
    [req.params.slug], (err, page) => {
      if (err || !page) return res.status(404).send('Page not found');
      
      // Get like/dislike counts
      db.all('SELECT type, COUNT(*) as count FROM likes WHERE page_id = ? GROUP BY type', [page.id], (err, likeCounts) => {
        const likes = likeCounts?.find(l => l.type === 'like')?.count || 0;
        const dislikes = likeCounts?.find(l => l.type === 'dislike')?.count || 0;
        
        // Check user's reaction
        let userReaction = null;
        if (req.session.user) {
          db.get('SELECT type FROM likes WHERE user_id = ? AND page_id = ?', 
            [req.session.user.id, page.id], (err, reaction) => {
              userReaction = reaction?.type;
              res.render('page', { page, likes, dislikes, userReaction });
            });
        } else {
          res.render('page', { page, likes, dislikes, userReaction });
        }
      });
    });
});

// Like/Dislike
app.post('/react/:pageId', (req, res) => {
  if (!req.session.user) return res.json({ success: false, error: 'Not logged in' });
  
  const { type } = req.body; // 'like' or 'dislike'
  db.run('INSERT OR REPLACE INTO likes (user_id, page_id, type) VALUES (?, ?, ?)',
    [req.session.user.id, req.params.pageId, type], (err) => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    });
});

// Submit Question
app.post('/submit-question', (req, res) => {
  const { name, email, question, page_slug } = req.body;
  db.run('INSERT INTO questions (name, email, question, page_slug) VALUES (?, ?, ?, ?)',
    [name, email, question, page_slug], (err) => {
      if (err) return res.json({ success: false });
      
      // Send email (you'll configure this)
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.EMAIL_PASS
        }
      });
      
      transporter.sendMail({
        from: 'Pixels Dojo <noreply@pixelsdojo.com>',
        to: 'lizzylizzysims@gmail.com',
        subject: `New Question: ${question.substring(0, 50)}`,
        html: `<p><strong>From:</strong> ${name} (${email})</p><p><strong>Page:</strong> ${page_slug}</p><p><strong>Question:</strong> ${question}</p>`
      }, () => {});
      
      res.json({ success: true });
    });
});

// NPCs Page (Public)
app.get('/npcs', (req, res) => {
  db.all('SELECT * FROM npcs ORDER BY display_order ASC, name ASC', (err, npcs) => {
    if (err) return res.status(500).send('Error loading NPCs');
    res.render('npcs', { npcs });
  });
});

// Auth routes
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.render('login', { error: 'Invalid credentials' });
    }
    req.session.user = { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin };
    res.redirect('/');
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Admin - NPC Management
app.get('/admin', (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.redirect('/login');
  }
  db.all('SELECT * FROM npcs ORDER BY display_order ASC, name ASC', (err, npcs) => {
    res.render('admin', { npcs });
  });
});

app.post('/admin/npc/add', upload.single('image'), (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.json({ success: false, error: 'Unauthorized' });
  }
  
  const { name, location, description, display_order } = req.body;
  const image_path = req.file ? `/images/npcs/${req.file.filename}` : '/images/npcs/default-npc.png';
  
  db.run('INSERT INTO npcs (name, location, description, image_path, display_order) VALUES (?, ?, ?, ?, ?)',
    [name, location, description, image_path, display_order || 999], (err) => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    });
});

app.post('/admin/npc/edit/:id', upload.single('image'), (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.json({ success: false, error: 'Unauthorized' });
  }
  
  const { name, location, description, display_order } = req.body;
  const image_path = req.file ? `/images/npcs/${req.file.filename}` : null;
  
  if (image_path) {
    db.run('UPDATE npcs SET name = ?, location = ?, description = ?, image_path = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, location, description, image_path, display_order, req.params.id], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
      });
  } else {
    db.run('UPDATE npcs SET name = ?, location = ?, description = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, location, description, display_order, req.params.id], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
      });
  }
});

app.post('/admin/npc/delete/:id', (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.json({ success: false, error: 'Unauthorized' });
  }
  
  db.run('DELETE FROM npcs WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

app.listen(PORT, () => console.log(`🚀 Pixels Dojo running on http://localhost:${PORT}`));
