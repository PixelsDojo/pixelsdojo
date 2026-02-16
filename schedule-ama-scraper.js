// schedule-ama-scraper.js
// Sets up weekly cron job to scrape AMAs automatically

const cron = require('node-cron');
const { scrapeAMAs } = require('./ama-scraper');

console.log('⏰ AMA Scraper Scheduler Starting...\n');

// Run every Monday at 9:00 AM
// Cron format: minute hour day month weekday
const cronSchedule = '0 9 * * 1'; // Every Monday at 9 AM

console.log('📅 Schedule: Every Monday at 9:00 AM');
console.log('🤖 Will check for new AMAs weekly\n');

// Schedule the task
cron.schedule(cronSchedule, async () => {
  console.log('⏰ Cron job triggered!');
  console.log(`📅 ${new Date().toLocaleString()}\n`);
  
  try {
    await scrapeAMAs();
    console.log('✅ Weekly AMA scrape completed!\n');
  } catch (error) {
    console.error('❌ Weekly scrape failed:', error);
  }
}, {
  timezone: "Africa/Johannesburg" // SAST (your timezone)
});

console.log('✅ Scheduler is running!');
console.log('💡 Press Ctrl+C to stop\n');

// Keep process alive
process.stdin.resume();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down scheduler...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down scheduler...');
  process.exit(0);
});
