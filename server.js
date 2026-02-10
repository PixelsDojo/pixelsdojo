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

// Rest of the code
// ...
