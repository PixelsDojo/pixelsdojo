// import-map-guide.js
// ONE-TIME SCRIPT: Run this once to import the map guide, then delete this file
// Usage: node import-map-guide.js

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Match your database.js setup
const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/pixels-dojo.db' : './pixels-dojo.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// The full HTML content for the map guide
const mapGuideContent = `<!-- TerraVilla Complete Map Guide -->
<!-- PASTE THE CONTENT FROM map-guide-content.html HERE -->
<!-- You'll replace this comment with the actual HTML -->

<div class="page-content">
  <h1>🗺️ Complete TerraVilla Map Guide</h1>
  <p>Your comprehensive guide to every location, NPC, and secret in TerraVilla and surrounds.</p>
  
  <!-- The rest of the HTML goes here -->
</div>
`;

// Check if page already exists
db.get('SELECT id FROM pages WHERE slug = ?', ['terravilla-map-guide'], (err, row) => {
  if (err) {
    console.error('❌ Error checking for existing page:', err.message);
    db.close();
    process.exit(1);
  }
  
  if (row) {
    console.log('⚠️  Map guide already exists! Updating instead...');
    
    db.run(`UPDATE pages 
            SET content = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE slug = ?`,
      [mapGuideContent, 'terravilla-map-guide'],
      function(updateErr) {
        if (updateErr) {
          console.error('❌ Update failed:', updateErr.message);
          process.exit(1);
        }
        console.log('✅ Map guide updated successfully!');
        console.log('🗺️  View at: /pages/terravilla-map-guide');
        db.close();
        process.exit(0);
      }
    );
  } else {
    // Insert new page
    db.run(`INSERT INTO pages (
      slug,
      title,
      content,
      category,
      difficulty,
      summary,
      author_id,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        'terravilla-map-guide',
        'Complete TerraVilla Map Guide',
        mapGuideContent,
        'orientation',
        'Beginner',
        'Your comprehensive guide to every location, NPC, and secret in TerraVilla and surrounds. Navigate the world of Pixels like a pro!',
        1 // author_id - adjust if needed
      ],
      function(insertErr) {
        if (insertErr) {
          console.error('❌ Import failed:', insertErr.message);
          process.exit(1);
        }
        console.log('✅ Map guide imported successfully!');
        console.log(`📄 Page ID: ${this.lastID}`);
        console.log('🗺️  View at: /pages/terravilla-map-guide');
        db.close();
        process.exit(0);
      }
    );
  }
});
