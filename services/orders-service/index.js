const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const logger = require('./config/logger');
const { metricsMiddleware, metricsEndpoint } = require('./config/metrics');

const app = express();
const PORT = process.env.PORT || 3003;

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

// Game Service Configuration
const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://localhost:3002';

// ============================================
// DATABASE INITIALIZATION
// ============================================

async function initializeDatabase() {
  try {
    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_status CHECK (status IN ('pending', 'completed', 'cancelled'))
      );
    `);

    // Order Items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        game_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        price_at_purchase DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_quantity CHECK (quantity > 0),
        CONSTRAINT chk_price CHECK (price_at_purchase >= 0)
      );
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_game_id ON order_items(game_id);
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
 * Require authenticated user (guest not allowed)
 * Orders require a registered account
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Register or login to place orders.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    if (user.role === 'GUEST') {
      return res.status(403).json({ error: 'Guest accounts cannot place orders. Please register or login.' });
    }
    req.user = user;
    next();
  });
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function buildHateoasLinks(orderId) {
  return {
    self: `/api/v1/orders/${orderId}`,
    list: '/api/v1/orders',
    items: `/api/v1/orders/${orderId}/items`,
    cancel: `/api/v1/orders/${orderId}`,
  };
}

function formatOrderResponse(order) {
  return {
    ...order,
    _links: buildHateoasLinks(order.id),
  };
}

// ============================================
// REST API ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Get all orders (paginated)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: List of orders
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// GET /api/v1/orders - List all orders for authenticated user (or all orders if admin)
app.get('/api/v1/orders', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admins see all orders, regular users see only their orders
    const whereClause = userRole?.toUpperCase() === 'ADMIN' ? '' : 'WHERE user_id = $1';
    const whereParams = userRole?.toUpperCase() === 'ADMIN' ? [] : [userId];

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM orders ${whereClause}`,
      whereParams
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}`,
      [...whereParams, limit, offset]
    );

    const orders = result.rows.map(formatOrderResponse);

    res.json({
      data: orders,
      pagination: { limit, offset, total },
      _links: {
        self: '/api/v1/orders',
        first: `/api/v1/orders?limit=${limit}&offset=0`,
        next: offset + limit < total ? `/api/v1/orders?limit=${limit}&offset=${offset + limit}` : null,
        prev: offset > 0 ? `/api/v1/orders?limit=${limit}&offset=${Math.max(0, offset - limit)}` : null,
      },
    });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get order details by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Order details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
// GET /api/v1/orders/:id - Get order details with items
app.get('/api/v1/orders/:id', requireAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = formatOrderResponse(orderResult.rows[0]);

    // Get order items
    const itemsResult = await pool.query(
      `SELECT oi.*, g.title as game_title 
       FROM order_items oi
       LEFT JOIN games g ON oi.game_id = g.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    order.items = itemsResult.rows;

    res.json(order);
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [gameId, quantity]
 *                   properties:
 *                     gameId: { type: integer }
 *                     quantity: { type: integer }
 *     responses:
 *       201:
 *         description: Order created
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
// POST /api/v1/orders - Create new order
app.post('/api/v1/orders', requireAuth, async (req, res) => {
  try {
    const { items } = req.body; // items: [{game_id, quantity}, ...]
    const userId = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Fetch game prices from database
    const gameIds = items.map(item => item.game_id);
    const gamesResult = await pool.query(
      `SELECT id, price FROM games WHERE id = ANY($1)`,
      [gameIds]
    );

    const gameMap = {};
    gamesResult.rows.forEach(game => {
      gameMap[game.id] = parseFloat(game.price);
    });

    // Validate all games exist and calculate total
    let totalPrice = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!gameMap[item.game_id]) {
        return res.status(404).json({ error: `Game ${item.game_id} not found` });
      }
      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than 0' });
      }

      const subtotal = gameMap[item.game_id] * item.quantity;
      totalPrice += subtotal;
      validatedItems.push({
        game_id: item.game_id,
        quantity: item.quantity,
        price: gameMap[item.game_id],
        subtotal: subtotal,
      });
    }

    // Create order
    const orderResult = await pool.query(
      'INSERT INTO orders (user_id, total_price, status) VALUES ($1, $2, $3) RETURNING *',
      [userId, totalPrice, 'pending']
    );

    const order = orderResult.rows[0];

    // Insert order items
    for (const item of validatedItems) {
      await pool.query(
        'INSERT INTO order_items (order_id, game_id, quantity, price_at_purchase, subtotal) VALUES ($1, $2, $3, $4, $5)',
        [order.id, item.game_id, item.quantity, item.price, item.subtotal]
      );
    }

    // Fetch created order with items
    const itemsResult = await pool.query(
      `SELECT oi.id, oi.game_id, oi.quantity, oi.price_at_purchase, oi.subtotal, g.title
       FROM order_items oi
       LEFT JOIN games g ON oi.game_id = g.id
       WHERE oi.order_id = $1`,
      [order.id]
    );

    const response = formatOrderResponse(order);
    response.items = itemsResult.rows;

    res.status(201).json({ message: 'Order created successfully', data: response });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/orders/{id}/items:
 *   get:
 *     summary: Get order items
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Order items list
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
// GET /api/v1/orders/:id/items - Get order items
app.get('/api/v1/orders/:id/items', requireAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    // Verify order belongs to user
    const orderCheck = await pool.query(
      'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await pool.query(
      `SELECT oi.id, oi.game_id, oi.quantity, oi.price_at_purchase, oi.subtotal, g.title, g.genre
       FROM order_items oi
       LEFT JOIN games g ON oi.game_id = g.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    res.json({
      order_id: parseInt(orderId),
      items: itemsResult.rows,
      _links: {
        order: `/api/v1/orders/${orderId}`,
        list: '/api/v1/orders',
      },
    });
  } catch (err) {
    console.error('Get order items error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/orders/{id}/items:
 *   post:
 *     summary: Add item to order (only if pending)
 *     tags: [Orders]
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
 *             required: [gameId, quantity]
 *             properties:
 *               gameId: { type: integer }
 *               quantity: { type: integer }
 *     responses:
 *       200:
 *         description: Item added
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       422:
 *         description: Order not in pending status
 *       500:
 *         description: Server error
 */
// POST /api/v1/orders/:id/items - Add item to order (only if pending)
app.post('/api/v1/orders/:id/items', requireAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    const { game_id, quantity } = req.body;

    if (!game_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'game_id and quantity (>0) are required' });
    }

    // Verify order belongs to user and is pending
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND status = $3',
      [orderId, userId, 'pending']
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or is not pending' });
    }

    // Fetch game price
    const gameResult = await pool.query(
      'SELECT price FROM games WHERE id = $1',
      [game_id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const price = parseFloat(gameResult.rows[0].price);
    const subtotal = price * quantity;

    // Add item to order
    await pool.query(
      'INSERT INTO order_items (order_id, game_id, quantity, price_at_purchase, subtotal) VALUES ($1, $2, $3, $4, $5)',
      [orderId, game_id, quantity, price, subtotal]
    );

    // Update order total
    await pool.query(
      'UPDATE orders SET total_price = total_price + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [subtotal, orderId]
    );

    // Fetch updated order
    const updatedOrder = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);

    res.status(201).json({
      message: 'Item added to order',
      data: formatOrderResponse(updatedOrder.rows[0]),
    });
  } catch (err) {
    console.error('Add order item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [pending, confirmed, shipped, delivered, cancelled] }
 *     responses:
 *       200:
 *         description: Order updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       422:
 *         description: Invalid status
 *       500:
 *         description: Server error
 */
// PATCH /api/v1/orders/:id - Update order status
app.patch('/api/v1/orders/:id', requireAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    const { status } = req.body;

    const validStatuses = ['pending', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
      [status, orderId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order updated successfully', data: formatOrderResponse(result.rows[0]) });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   put:
 *     summary: Update order status (admin only)
 *     tags: [Orders]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [pending, completed, cancelled] }
 *     responses:
 *       200:
 *         description: Order updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 *       404:
 *         description: Order not found
 *       400:
 *         description: Invalid status
 *       500:
 *         description: Server error
 */
// PUT /api/v1/orders/:id - Update order status (admin only)
app.put('/api/v1/orders/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userRole = req.user.role;
    const { status } = req.body;

    // Check admin access
    if (userRole?.toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const validStatuses = ['pending', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Fetch items for the order
    const itemsResult = await pool.query(
      `SELECT oi.id, oi.game_id, oi.quantity, oi.price_at_purchase as price, g.title as game_title
       FROM order_items oi
       LEFT JOIN games g ON oi.game_id = g.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    const orderResponse = formatOrderResponse(result.rows[0]);
    orderResponse.items = itemsResult.rows;

    res.json({ message: 'Order status updated successfully', data: orderResponse });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   delete:
 *     summary: Cancel order (only if pending)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Order cancelled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       422:
 *         description: Order not in pending status
 *       500:
 *         description: Server error
 */
// DELETE /api/v1/orders/:id - Cancel order (only if pending)
app.delete('/api/v1/orders/:id', requireAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);

    res.json({ message: 'Order cancelled successfully', deletedId: parseInt(orderId) });
  } catch (err) {
    console.error('Delete order error:', err);
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
      title: 'GameStore Orders API',
      version: '1.0.0',
      description: 'Orders management service with price locking'
    },
    servers: [
      { url: 'http://localhost:3003', description: 'Development' }
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
  res.json({ status: 'ok', service: 'orders-service' });
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
      console.log(`✓ Orders Service running on http://localhost:${PORT}`);
      console.log(`✓ REST API: http://localhost:${PORT}/api/v1/orders`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Auth: JWT required for all endpoints`);
    });
  } catch (err) {
    console.error('Failed to start orders service:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
