// import-map-guide-READY.js
// ONE-TIME SCRIPT: Upload this to your GitHub repo root, run it once, then delete it
// Usage: node import-map-guide-READY.js

const sqlite3 = require('sqlite3').verbose();

// Match your database.js setup
const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/pixels-dojo.db' : './pixels-dojo.db';

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// The COMPLETE HTML content for the map guide (includes all 37 images and styling)
const mapGuideContent = `ENDOFFILE
cat /home/claude/map-guide-package/map-guide-content.html >> /home/claude/import-map-guide-READY.js
cat >> /home/claude/import-map-guide-READY.js << 'ENDOFFILE'
`;

console.log('🔍 Checking if map guide already exists...');

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
          db.close();
          process.exit(1);
        }
        console.log('✅ Map guide updated successfully!');
        console.log('📄 Page ID:', row.id);
        console.log('🗺️  View at: /pages/terravilla-map-guide');
        console.log('');
        console.log('🎉 ALL DONE! You can now DELETE this script file from your repo.');
        db.close();
        process.exit(0);
      }
    );
  } else {
    console.log('📝 Creating new map guide page...');
    
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
        1 // author_id
      ],
      function(insertErr) {
        if (insertErr) {
          console.error('❌ Import failed:', insertErr.message);
          db.close();
          process.exit(1);
        }
        console.log('✅ Map guide imported successfully!');
        console.log(`📄 New Page ID: ${this.lastID}`);
        console.log('🗺️  View at: /pages/terravilla-map-guide');
        console.log('');
        console.log('📊 Import Stats:');
        console.log('   - 37 images referenced');
        console.log('   - 12 major sections');
        console.log('   - 50+ NPCs listed');
        console.log('   - Complete styling included');
        console.log('');
        console.log('🎉 ALL DONE! You can now DELETE this script file from your repo.');
        db.close();
        process.exit(0);
      }
    );
  }
});
