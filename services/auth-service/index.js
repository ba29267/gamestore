const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const logger = require('./config/logger');
const { metricsMiddleware, metricsEndpoint } = require('./config/metrics');

const app = express();
const PORT = process.env.PORT || 3001;

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GameStore Auth API',
      version: '1.0.0',
      description: 'User authentication and authorization service'
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Development' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [__filename]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(express.json());
app.use(cors());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Metrics middleware
app.use(metricsMiddleware);

// PostgreSQL Connection Pool
const pool = new Pool({
  user: process.env.DB_USER || 'gamestore_user',
  password: process.env.DB_PASSWORD || 'gamestore_password',
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gamestore_db',
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRY = '24h';

// User Roles
const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  GUEST: 'GUEST',
};

// ============================================
// DATABASE INITIALIZATION
// ============================================

/**
 * Initialize database schema
 */
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT '${ROLES.USER}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info('Database schema initialized');
  } catch (err) {
    logger.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

/**
 * Initialize default admin user if not exists
 */
async function initializeDefaultAdmin() {
  try {
    // Check if admin user exists
    const adminExists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@gamestore.local']
    );

    if (adminExists.rows.length > 0) {
      logger.info('Admin user already exists');
      return;
    }

    // Create default admin user
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await pool.query(
      'INSERT INTO users (email, username, password, role, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
      ['admin@gamestore.local', 'admin', hashedPassword, ROLES.ADMIN]
    );

    logger.info('Default admin user created: admin@gamestore.local');
    logger.info('Default password: change ADMIN_PASSWORD environment variable for production');
  } catch (err) {
    logger.error('Failed to initialize default admin:', err.message);
    // Don't exit - this is not fatal
  }
}

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Verify JWT Token Middleware (Required)
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/**
 * Optional Authentication Middleware (Allows Guests)
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
};

/**
 * Verify User Role Middleware
 */
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Hash password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Compare passwords
 */
async function comparePasswords(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Generate JWT Token
 */
function generateToken(userId, email, username, role) {
  return jwt.sign(
    { id: userId, email, username, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * POST /api/v1/auth/register
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, password]
 *             properties:
 *               email: { type: string, format: email }
 *               username: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [USER, ADMIN], default: USER }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: User already exists
 */
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, username, password, role = ROLES.USER } = req.body;

    // Validation
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    // GUEST role cannot be set during registration (server-assigned only)
    if (role === ROLES.GUEST) {
      return res.status(400).json({ error: 'Guest role is automatic. Register as USER or login as guest.' });
    }

    if (![ROLES.USER, ROLES.ADMIN].includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be USER or ADMIN` });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, username, role',
      [email, username, hashedPassword, role]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.email, user.username, user.role);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/auth/login
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.username, user.role);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/auth/guest
 * @swagger
 * /api/v1/auth/guest:
 *   get:
 *     summary: Login as guest (no registration needed)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Guest token generated
 *       500:
 *         description: Internal server error
 */
app.get('/api/v1/auth/guest', (req, res) => {
  try {
    // Generate guest token with placeholder user data
    const token = jwt.sign(
      {
        id: 0,
        email: 'guest@gamestore.local',
        username: 'guest',
        role: ROLES.GUEST,
      },
      JWT_SECRET,
      { expiresIn: '8h' } // Shorter expiry for guests
    );

    res.json({
      message: 'Guest access granted',
      user: {
        id: 0,
        username: 'guest',
        role: ROLES.GUEST,
        Note: 'Guest access is temporary (8 hours). Register for permanent account.'
      },
      token,
    });
  } catch (err) {
    logger.error('Guest login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/auth/me
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         description: Unauthorized
 */
app.get('/api/v1/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: result.rows[0],
    });
  } catch (err) {
    logger.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SWAGGER DOCUMENTATION
// ============================================

app.use('/docs', swaggerUi.serve);
app.get('/docs', swaggerUi.setup(swaggerSpec));

// ============================================
// PROMETHEUS METRICS
// ============================================

app.get('/metrics', metricsEndpoint);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// ============================================
// SERVER STARTUP
// ============================================

async function start() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('Connected to PostgreSQL');

    // Initialize database schema
    await initializeDatabase();

    // Initialize default admin user
    await initializeDefaultAdmin();

    // Start server
    app.listen(PORT, () => {
      logger.info(`Auth Service running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Swagger Docs: http://localhost:${PORT}/docs`);
      logger.info(`Metrics: http://localhost:${PORT}/metrics`);
    });
  } catch (err) {
    logger.error('Failed to start auth service:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
