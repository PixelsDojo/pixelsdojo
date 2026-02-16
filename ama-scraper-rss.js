// ama-scraper-rss.js
// Scrapes Pixels Post Substack AMAs using RSS feed (bypasses paywall!)
// Fetches AMAs from December 1, 2025 onwards
// UPDATED: Clean formatting - no images, no summaries

const axios = require('axios');
const cheerio = require('cheerio');
const db = require('./database');

// Configuration
const RSS_FEED_URL = 'https://pixelspost.substack.com/feed';
const START_DATE = new Date('2025-12-01'); // December 1, 2025
const CATEGORY = 'amas';
const AUTHOR_ID = 1; // Your admin user ID - CHANGE THIS TO YOUR ID!

console.log('🤖 AMA RSS Scraper Bot Starting...');
console.log(`📅 Fetching AMAs from ${START_DATE.toLocaleDateString()} onwards\n`);

// Main scraper function
async function scrapeAMAs() {
  try {
    console.log('🌐 Fetching RSS feed...');
    console.log(`   URL: ${RSS_FEED_URL}\n`);
    
    // Fetch the RSS feed
    const response = await axios.get(RSS_FEED_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const xml = response.data;
    const $ = cheerio.load(xml, { xmlMode: true });
    
    const amas = [];
    
    // Parse RSS items
    $('item').each((i, element) => {
      try {
        const $item = $(element);
        
        // Extract data from RSS
        const title = $item.find('title').text().trim();
        const url = $item.find('link').text().trim();
        const pubDate = $item.find('pubDate').text().trim();
        const content = $item.find('content\\:encoded, encoded').text().trim();
        
        // Only include if title contains "AMA"
        if (title.toLowerCase().includes('ama')) {
          amas.push({
            title,
            url,
            pubDate,
            content
          });
        }
      } catch (err) {
        console.error('   ⚠️ Error parsing RSS item:', err.message);
      }
    });
    
    console.log(`✅ Found ${amas.length} AMA posts in RSS feed\n`);
    
    // Process each AMA
    let imported = 0;
    let skipped = 0;
    
    for (const ama of amas) {
      const result = await processAMA(ama);
      if (result === 'imported') imported++;
      else if (result === 'skipped') skipped++;
    }
    
    console.log('\n🎉 AMA scraping completed!');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    
  } catch (error) {
    console.error('❌ Error scraping AMAs:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   URL:', RSS_FEED_URL);
    }
    throw error;
  }
}

// Process individual AMA
async function processAMA(ama) {
  try {
    console.log(`📰 Processing: ${ama.title}`);
    
    // Parse date
    const amaDate = new Date(ama.pubDate);
    
    // Check if date is valid
    if (isNaN(amaDate.getTime())) {
      console.log(`   ⚠️ Invalid date: ${ama.pubDate}`);
      return 'error';
    }
    
    // Check if date is after December 1, 2025
    if (amaDate < START_DATE) {
      console.log(`   ⏭️  Skipping (before ${START_DATE.toLocaleDateString()}): ${amaDate.toLocaleDateString()}`);
      return 'skipped';
    }
    
    // Create slug
    const slug = createSlug(ama.title);
    
    // Check if already exists
    const existing = await checkExists(slug);
    if (existing) {
      console.log(`   ⏭️  Already exists: ${slug}`);
      return 'skipped';
    }
    
    // Clean and format content (NO IMAGES!)
    const formattedContent = formatContent(ama.content, ama.url);
    
    // Create wiki article (NO SUMMARY - will be empty)
    await createWikiArticle({
      slug,
      title: ama.title,
      content: formattedContent,
      summary: '', // EMPTY - no snippet on AMAs page!
      url: ama.url,
      date: amaDate
    });
    
    console.log(`   ✅ Imported: ${slug}\n`);
    return 'imported';
    
  } catch (error) {
    console.error(`   ❌ Error processing AMA:`, error.message);
    return 'error';
  }
}

// Format content with proper attribution (NO IMAGES!)
function formatContent(content, url) {
  // Clean up HTML and REMOVE ALL IMAGES
  let cleaned = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
    .replace(/<img[^>]*>/gi, '') // REMOVE ALL IMAGES!
    .replace(/<figure[^>]*>.*?<\/figure>/gi, '') // Remove figures
    .replace(/<picture[^>]*>.*?<\/picture>/gi, ''); // Remove pictures
  
  // Wrap with attribution
  const formatted = `
<div class="ama-content" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  
  <!-- Source Attribution -->
  <div class="ama-source" style="background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.05)); padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; border-left: 4px solid var(--cyan, #00ffff); box-shadow: 0 2px 8px rgba(0, 255, 255, 0.1);">
    <p style="margin: 0; font-size: 1.1rem;">
      <strong style="color: var(--cyan, #00ffff);">📰 Originally Published On:</strong><br>
      <a href="https://pixelspost.substack.com" target="_blank" rel="noopener noreferrer" style="color: var(--cyan, #00ffff); text-decoration: none; font-weight: 600;">The Pixels Post Substack Newsletter</a>
    </p>
    <p style="margin: 1rem 0 0 0;">
      <a href="${url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 0.75rem 1.5rem; background: var(--cyan, #00ffff); color: black; text-decoration: none; border-radius: 8px; font-weight: bold; transition: transform 0.2s;">
        📖 Read Original Article on Substack →
      </a>
    </p>
  </div>
  
  <!-- Main Content (no images!) -->
  <div class="ama-body" style="margin: 2rem 0;">
    ${cleaned}
  </div>
  
  <!-- Footer Attribution -->
  <div class="ama-footer" style="margin-top: 3rem; padding-top: 2rem; border-top: 2px solid rgba(0, 255, 255, 0.2); text-align: center;">
    <p style="color: #999; font-style: italic; margin: 0;">
      📰 This AMA summary was automatically imported from 
      <a href="https://pixelspost.substack.com" target="_blank" rel="noopener noreferrer" style="color: var(--cyan, #00ffff);">The Pixels Post</a> 
      Substack newsletter.
    </p>
    <p style="color: #999; font-style: italic; margin: 0.5rem 0 0 0; font-size: 0.9rem;">
      All credit goes to the original authors. Please subscribe to their newsletter for the latest updates!
    </p>
  </div>
  
</div>
  `;
  
  return formatted;
}

// Create wiki article in database
async function createWikiArticle(data) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO pages (
        slug, title, content, summary, category, 
        difficulty, author_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const now = new Date().toISOString();
    
    db.run(sql, [
      data.slug,
      data.title,
      data.content,
      data.summary, // Empty string - no snippet!
      CATEGORY,
      'Beginner',
      AUTHOR_ID,
      data.date.toISOString(),
      now
    ], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

// Check if article already exists
function checkExists(slug) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM pages WHERE slug = ?', [slug], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Create URL-friendly slug
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run scraper if called directly
if (require.main === module) {
  scrapeAMAs()
    .then(() => {
      console.log('\n✅ Scraper finished successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Scraper failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = { scrapeAMAs };
