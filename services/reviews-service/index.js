const express = require('express');
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
const PORT = process.env.PORT || 3004;

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

// ============================================
// DATABASE INITIALIZATION
// ============================================

async function initializeDatabase() {
  try {
    // Reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        game_id INT NOT NULL,
        user_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT,
        helpful_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_comment_length CHECK (LENGTH(comment) <= 5000)
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_game_id ON reviews(game_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_game_user ON reviews(game_id, user_id);
    `);

    console.log('✓ Database schema initialized');
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
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
 * Optional authentication - allows guests
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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
 * Require authenticated user (guest not allowed)
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Register or login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    if (user.role === 'GUEST') {
      return res.status(403).json({ error: 'This operation requires a registered account. Please register or login.' });
    }
    req.user = user;
    next();
  });
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function buildHateoasLinks(reviewId, gameId) {
  return {
    self: `/api/v1/reviews/${reviewId}`,
    game: `/api/v1/games/${gameId}/reviews`,
    list: '/api/v1/reviews',
  };
}

function formatReviewResponse(review) {
  return {
    ...review,
    _links: buildHateoasLinks(review.id, review.game_id),
  };
}

// ============================================
// REST API ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/v1/reviews:
 *   get:
 *     summary: Get all reviews (paginated)
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: List of reviews
 *       500:
 *         description: Server error
 */
// GET /api/v1/reviews - Get all reviews (paginated)
app.get('/api/v1/reviews', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const countResult = await pool.query('SELECT COUNT(*) as total FROM reviews');
    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT r.*, g.title as game_title 
       FROM reviews r
       LEFT JOIN games g ON r.game_id = g.id
       ORDER BY r.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const reviews = result.rows.map(formatReviewResponse);

    res.json({
      data: reviews,
      pagination: { limit, offset, total },
      _links: {
        self: '/api/v1/reviews',
        first: `/api/v1/reviews?limit=${limit}&offset=0`,
        next: offset + limit < total ? `/api/v1/reviews?limit=${limit}&offset=${offset + limit}` : null,
        prev: offset > 0 ? `/api/v1/reviews?limit=${limit}&offset=${Math.max(0, offset - limit)}` : null,
      },
    });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/games/{gameId}/reviews:
 *   get:
 *     summary: Get reviews for a specific game
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: List of reviews for game
 *       404:
 *         description: Game not found
 *       500:
 *         description: Server error
 */
// GET /api/v1/games/:gameId/reviews - Get reviews for a specific game
app.get('/api/v1/games/:gameId/reviews', optionalAuth, async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const sort = req.query.sort || 'recent'; // recent, helpful, rating_high, rating_low

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM reviews WHERE game_id = $1',
      [gameId]
    );
    const total = parseInt(countResult.rows[0].total);

    let orderClause = 'r.created_at DESC';
    if (sort === 'helpful') orderClause = 'r.helpful_count DESC';
    else if (sort === 'rating_high') orderClause = 'r.rating DESC';
    else if (sort === 'rating_low') orderClause = 'r.rating ASC';

    const result = await pool.query(
      `SELECT r.* FROM reviews r
       WHERE r.game_id = $1
       ORDER BY ${orderClause}
       LIMIT $2 OFFSET $3`,
      [gameId, limit, offset]
    );

    // Calculate average rating
    const avgResult = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE game_id = $1',
      [gameId]
    );

    const reviews = result.rows.map(formatReviewResponse);

    res.json({
      game_id: gameId,
      average_rating: avgResult.rows[0].avg_rating ? parseFloat(avgResult.rows[0].avg_rating).toFixed(1) : null,
      total_reviews: parseInt(avgResult.rows[0].total_reviews),
      data: reviews,
      pagination: { limit, offset, total },
      _links: {
        self: `/api/v1/games/${gameId}/reviews?sort=${sort}`,
        first: `/api/v1/games/${gameId}/reviews?limit=${limit}&offset=0&sort=${sort}`,
        next: offset + limit < total ? `/api/v1/games/${gameId}/reviews?limit=${limit}&offset=${offset + limit}&sort=${sort}` : null,
        prev: offset > 0 ? `/api/v1/games/${gameId}/reviews?limit=${limit}&offset=${Math.max(0, offset - limit)}&sort=${sort}` : null,
      },
    });
  } catch (err) {
    console.error('Get game reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   get:
 *     summary: Get single review
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Review details
 *       404:
 *         description: Review not found
 *       500:
 *         description: Server error
 */
// GET /api/v1/reviews/:id - Get single review
app.get('/api/v1/reviews/:id', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(formatReviewResponse(result.rows[0]));
  } catch (err) {
    console.error('Get review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/games/{gameId}/reviews:
 *   post:
 *     summary: Create review (auth required)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, title, content]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       201:
 *         description: Review created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Game not found
 *       422:
 *         description: Invalid rating
 *       500:
 *         description: Server error
 */
// POST /api/v1/games/:gameId/reviews - Create review (auth required)
app.post('/api/v1/games/:gameId/reviews', requireAuth, async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    const userId = req.user.id;
    const { title, rating, comment } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Validate comment length
    if (comment && comment.length > 5000) {
      return res.status(400).json({ error: 'Comment exceeds 5000 characters' });
    }

    // Check if user already reviewed this game
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE game_id = $1 AND user_id = $2',
      [gameId, userId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this game' });
    }

    const result = await pool.query(
      `INSERT INTO reviews (game_id, user_id, title, rating, comment) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [gameId, userId, title || null, rating, comment || null]
    );

    res.status(201).json({
      message: 'Review created successfully',
      data: formatReviewResponse(result.rows[0]),
    });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   put:
 *     summary: Update review (auth required, own review only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, title, content]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       200:
 *         description: Review updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only update own review
 *       404:
 *         description: Review not found
 *       422:
 *         description: Invalid rating
 *       500:
 *         description: Server error
 */
// PUT /api/v1/reviews/:id - Update review (auth required, own review only)
app.put('/api/v1/reviews/:id', requireAuth, async (req, res) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user.id;
    const { title, rating, comment } = req.body;

    // Verify review ownership
    const reviewResult = await pool.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (reviewResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own reviews' });
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Validate comment length if provided
    if (comment && comment.length > 5000) {
      return res.status(400).json({ error: 'Comment exceeds 5000 characters' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) { updates.push(`title = $${paramCount++}`); values.push(title); }
    if (rating !== undefined) { updates.push(`rating = $${paramCount++}`); values.push(rating); }
    if (comment !== undefined) { updates.push(`comment = $${paramCount++}`); values.push(comment); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(reviewId);

    const query = `UPDATE reviews SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    res.json({
      message: 'Review updated successfully',
      data: formatReviewResponse(result.rows[0]),
    });
  } catch (err) {
    console.error('Update review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/reviews/{id}/helpful:
 *   post:
 *     summary: Mark review as helpful (auth required)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Marked as helpful
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found
 *       500:
 *         description: Server error
 */
// POST /api/v1/reviews/:id/helpful - Mark review as helpful (auth required)
app.post('/api/v1/reviews/:id/helpful', requireAuth, async (req, res) => {
  try {
    const reviewId = req.params.id;

    const result = await pool.query(
      'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1 RETURNING *',
      [reviewId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({
      message: 'Review marked as helpful',
      data: formatReviewResponse(result.rows[0]),
    });
  } catch (err) {
    console.error('Mark helpful error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   delete:
 *     summary: Delete review (auth required, own review only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Review deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only delete own review
 *       404:
 *         description: Review not found
 *       500:
 *         description: Server error
 */
// DELETE /api/v1/reviews/:id - Delete review (auth required, own review only)
app.delete('/api/v1/reviews/:id', requireAuth, async (req, res) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user.id;

    // Verify review ownership
    const reviewResult = await pool.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (reviewResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }

    await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

    res.json({ message: 'Review deleted successfully', deletedId: parseInt(reviewId) });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SWAGGER DOCUMENTATION
// ============================================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GameStore Reviews API',
      version: '1.0.0',
      description: 'User reviews service with ratings and helpful tracking'
    },
    servers: [
      { url: 'http://localhost:3004', description: 'Development' }
    ]
  },
  apis: [__filename]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve);
app.get('/docs', swaggerUi.setup(swaggerSpec));

// ============================================
// PROMETHEUS METRICS
// ============================================

app.get('/metrics', metricsEndpoint);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'reviews-service' });
});

// ============================================
// SERVER STARTUP
// ============================================

async function start() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✓ Connected to PostgreSQL');

    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`✓ Reviews Service running on http://localhost:${PORT}`);
      console.log(`✓ REST API: http://localhost:${PORT}/api/v1/reviews`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Auth: JWT required for POST/PUT/DELETE`);
    });
  } catch (err) {
    console.error('Failed to start reviews service:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
