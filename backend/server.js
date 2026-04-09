const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./db');
const logger = require('./utils/logger');
const gigRoutes = require('./routes/gigRoutes');
const authRoutes = require('./routes/authRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');
// Required for express-rate-limit to work correctly behind Render's proxy.
app.set('trust proxy', 1);

// Build the CORS whitelist from the environment variable.
// In production (Render), set CORS_ORIGINS to your Vercel URL.
// In local dev, if the variable is absent, localhost:3000 is the default.
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

// Optional regex pattern for dynamic origins (e.g. Vercel preview deployments).
// Set CORS_ORIGIN_PATTERN on Render to something like: chalturot-frontend.*\.vercel\.app
const originPattern = process.env.CORS_ORIGIN_PATTERN
  ? new RegExp(process.env.CORS_ORIGIN_PATTERN)
  : null;

app.use(compression());

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server requests (no Origin header) and whitelisted origins.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (originPattern && originPattern.test(origin)) {
      return callback(null, true);
    }
    return callback(Object.assign(new Error('Not allowed by CORS'), { status: 403 }));
  },
  credentials: true,
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 600),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/api/events',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts, please try again later.' },
});

app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Language', 'he');
  next();
});

app.use(express.json({ limit: '200kb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', apiLimiter);

// Define Routes
app.get('/', (req, res) => {
  res.send('Gig App API is running');
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', chatRoutes);
app.use(notFound);
app.use(errorHandler);
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server ready on port ${PORT}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();