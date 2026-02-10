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

// ...
// some code above

// Fixing the email environment variable bug
const emailPass = process.env.EMAIL_PASS; // Changed from process.EMAIL_PASS to process.env.EMAIL_PASS

// === Required imports (add these if missing at top of file) ===
const express = require('express');
const path = require('path');
const db = require('./database.js');  // Your DB module

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));  // Serves CSS, images, screenshots

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));  // Assuming you have a /views folder with .ejs files

// Simple test route - homepage
app.get('/', (req, res) => {
  res.render('index', { message: 'Pixels Online Wiki is live!' });  // Change to your real index.ejs
});

// Example NPC route (adjust to your real one)
app.get('/npcs', (req, res) => {
  db.all('SELECT * FROM npcs ORDER BY display_order', [], (err, rows) => {
    if (err) {
      console.error('NPC query error:', err);
      return res.status(500).send('Database error');
    }
    res.render('npcs', { npcs: rows });  // Assumes npcs.ejs exists
  });
});

// Add your other routes here (e.g., admin, login, pages, etc.)
// Example admin login stub
app.get('/admin', (req, res) => {
  res.send('Admin login page - implement auth here');
});

// === Start the server - THIS IS WHAT WAS MISSING ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===== Server is LIVE on port ${PORT} (bound to 0.0.0.0) =====`);
});
