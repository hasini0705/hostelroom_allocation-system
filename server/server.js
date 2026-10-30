require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const { initDatabase } = require('./database/db');
const { seedDatabase } = require('./database/seed');
const { startExpiryWorker } = require('./utils/expiryWorker');

// Initialize database schema and sample data
initDatabase();
seedDatabase();

// Start background expiry worker (every 5 seconds)
startExpiryWorker(5000);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(cookieParser());

// Request logger
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/captcha')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api/captcha', require('./routes/captcha'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/student', require('./routes/student'));
app.use('/api/hostel', require('./routes/hostel'));
app.use('/api/booking', require('./routes/booking'));
app.use('/api/warden', require('./routes/warden'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Hostel Room Allocation System',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      // In development, client may not yet be built
      res.status(200).send(`
        <html>
          <head><title>Hostel Room Allocation System - API Server</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #f8fafc;">
            <h1>🏨 Hostel Room Allocation System API Server</h1>
            <p style="color: #38bdf8;">Backend is running smoothly on port ${PORT}.</p>
            <p>To run the frontend, run <code>npm --prefix client run dev</code> or build the client with <code>npm run build</code>.</p>
            <div style="margin-top: 24px; padding: 16px; background: #1e293b; display: inline-block; border-radius: 8px; text-align: left;">
              <p><strong>Demo Warden:</strong> warden@hostel.edu / Warden@123</p>
              <p><strong>Demo Student:</strong> student@hostel.edu / Student@123</p>
            </div>
          </body>
        </html>
      `);
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.'
  });
});

let server = null;
if (require.main === module) {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🏨 Hostel Allocation System Server running on port ${PORT}`);
    console.log(`   Local URL: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = { app, server };
