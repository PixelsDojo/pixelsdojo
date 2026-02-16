// ama-scraper.js
// Scrapes Pixels Post Substack AMAs and creates wiki articles
// Fetches AMAs from December 1, 2025 onwards

const axios = require('axios');
const cheerio = require('cheerio');
const db = require('./database');

// Configuration
const SUBSTACK_URL = 'https://pixelspost.substack.com/s/ama';
const START_DATE = new Date('2025-12-01'); // December 1, 2025
const CATEGORY = 'amas';
const AUTHOR_ID = 1; // Your admin user ID

console.log('🤖 AMA Scraper Bot Starting...');
console.log(`📅 Fetching AMAs from ${START_DATE.toLocaleDateString()} onwards\n`);

// Main scraper function
async function scrapeAMAs() {
  try {
    console.log('🌐 Fetching Substack page...');
    
    // Fetch the AMA archive page
    const response = await axios.get(SUBSTACK_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    const amas = [];
    
    // Find all AMA posts (adjust selectors based on actual HTML structure)
    $('.post-preview, article, .portable-archive-post').each((i, element) => {
      try {
        const $post = $(element);
        
        // Extract title
        const title = $post.find('h3, h2, .post-preview-title, .post-title').first().text().trim();
        
        // Extract URL
        const url = $post.find('a').first().attr('href');
        
        // Extract date
        const dateText = $post.find('.post-date, time, .pencraft').text().trim();
        
        // Extract description/excerpt
        const description = $post.find('p, .post-preview-description, .subtitle').first().text().trim();
        
        if (title && url && title.toLowerCase().includes('ama')) {
          amas.push({
            title,
            url: url.startsWith('http') ? url : `https://pixelspost.substack.com${url}`,
            dateText,
            description
          });
        }
      } catch (err) {
        console.error('Error parsing post:', err.message);
      }
    });
    
    console.log(`✅ Found ${amas.length} potential AMAs\n`);
    
    // Process each AMA
    for (const ama of amas) {
      await processAMA(ama);
    }
    
    console.log('\n🎉 AMA scraping completed!');
    
  } catch (error) {
    console.error('❌ Error scraping AMAs:', error.message);
    throw error;
  }
}

// Process individual AMA
async function processAMA(ama) {
  try {
    console.log(`📰 Processing: ${ama.title}`);
    
    // Parse date (adjust format as needed)
    const amaDate = parseAMADate(ama.dateText);
    
    // Check if date is after December 1, 2025
    if (amaDate && amaDate < START_DATE) {
      console.log(`   ⏭️  Skipping (before Dec 2025): ${ama.dateText}`);
      return;
    }
    
    // Create slug
    const slug = createSlug(ama.title);
    
    // Check if already exists
    const existing = await checkExists(slug);
    if (existing) {
      console.log(`   ⏭️  Already exists: ${slug}`);
      return;
    }
    
    // Fetch full article content
    console.log(`   🌐 Fetching full article...`);
    const content = await fetchAMAContent(ama.url);
    
    // Create wiki article
    await createWikiArticle({
      slug,
      title: ama.title,
      content,
      summary: ama.description || 'Weekly AMA summary from The Pixels Post',
      url: ama.url,
      date: amaDate
    });
    
    console.log(`   ✅ Created: ${slug}\n`);
    
  } catch (error) {
    console.error(`   ❌ Error processing AMA:`, error.message);
  }
}

// Fetch full AMA content
async function fetchAMAContent(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract main content
    const content = $('.body, .post-content, article, .available-content').first().html();
    
    if (!content) {
      throw new Error('Could not extract content');
    }
    
    // Clean up and format
    let formatted = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/class="[^"]*"/g, '') // Remove class attributes
      .replace(/id="[^"]*"/g, ''); // Remove id attributes
    
    // Wrap in container with source link
    formatted = `
<div class="ama-content">
  <div class="ama-source" style="background: rgba(0, 255, 255, 0.1); padding: 1rem; border-radius: 8px; margin-bottom: 2rem; border-left: 4px solid var(--cyan);">
    <p><strong>📰 Original Source:</strong> <a href="${url}" target="_blank" rel="noopener noreferrer">Read on The Pixels Post →</a></p>
  </div>
  
  ${formatted}
  
  <div class="ama-footer" style="margin-top: 3rem; padding-top: 2rem; border-top: 2px solid rgba(0, 255, 255, 0.2);">
    <p style="color: #999; font-style: italic;">This AMA summary was imported from <a href="https://pixelspost.substack.com" target="_blank">The Pixels Post</a> Substack newsletter.</p>
  </div>
</div>
    `;
    
    return formatted;
    
  } catch (error) {
    console.error('Error fetching content:', error.message);
    // Return basic content with link
    return `
<div class="ama-content">
  <p>This is a weekly AMA (Ask Me Anything) session summary from The Pixels Post.</p>
  <p><strong>📰 Read the full AMA:</strong> <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>
</div>
    `;
  }
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
      data.summary,
      CATEGORY,
      'Beginner', // All AMAs are accessible to everyone
      AUTHOR_ID,
      data.date ? data.date.toISOString() : now,
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
    .substring(0, 100); // Limit length
}

// Parse AMA date from various formats
function parseAMADate(dateText) {
  try {
    // Try common formats
    const cleaned = dateText.trim();
    
    // Format: "Jan 15, 2025"
    let date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Format: "15 Jan 2025"
    const parts = cleaned.match(/(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
    if (parts) {
      date = new Date(`${parts[2]} ${parts[1]}, ${parts[3]}`);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Format: "2025-01-15"
    if (cleaned.match(/\d{4}-\d{2}-\d{2}/)) {
      date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    console.log(`   ⚠️  Could not parse date: ${dateText}`);
    return null;
    
  } catch (error) {
    console.log(`   ⚠️  Date parse error: ${error.message}`);
    return null;
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run scraper
scrapeAMAs()
  .then(() => {
    console.log('✅ Scraper finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Scraper failed:', error);
    process.exit(1);
  });

// Export for use in other scripts
module.exports = { scrapeAMAs };
