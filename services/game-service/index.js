const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('redis');
const rateLimit = require('express-rate-limit');
const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const logger = require('./config/logger');
const { metricsMiddleware, metricsEndpoint } = require('./config/metrics');

const app = express();
const PORT = process.env.PORT || 3002;

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

// Redis Client Setup
const redisClient = createClient({
 socket: {
 host: process.env.REDIS_HOST || 'redis',
 port: process.env.REDIS_PORT || 6379,
 reconnectStrategy: (retries) => {
 if (retries > 10) {
 console.error('Max Redis reconnection attempts reached');
 return new Error('Max retries');
 }
 return retries * 50;
 },
 },
});

redisClient.on('connect', () => console.log('✓ Connected to Redis'));
redisClient.on('error', (err) => console.error('Redis error:', err));

// Rate Limiting Middleware (100 requests/minute per IP for search)
const searchRateLimiter = rateLimit({
 windowMs: 60 * 1000, // 1 minute
 max: 100, // 100 requests per minute
 message: 'Too many search requests, please try again later.',
 standardHeaders: true,
 legacyHeaders: false,
 keyGenerator: (req, res) => {
 return req.ip || req.connection.remoteAddress;
 },
});

// PostgreSQL Connection Pool
const pool = new Pool({
 user: process.env.DB_USER || 'gamestore_user',
 password: process.env.DB_PASSWORD || 'gamestore_password',
 host: process.env.DB_HOST || 'postgres',
 port: process.env.DB_PORT || 5432,
 database: process.env.DB_NAME || 'gamestore_db',
});

// Solr Configuration
const solrHost = process.env.SOLR_HOST || 'solr';
const solrPort = process.env.SOLR_PORT || 8983;
const solrBase = `http://${solrHost}:${solrPort}/solr/games`;

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// ============================================
// CACHE HELPER FUNCTIONS
// ============================================

async function getCache(key) {
 try {
 const cached = await redisClient.get(key);
 return cached ? JSON.parse(cached) : null;
 } catch (err) {
 console.error(`Cache get error for ${key}:`, err.message);
 return null;
 }
}

async function setCache(key, value, ttl = 60) {
 try {
 await redisClient.setEx(key, ttl, JSON.stringify(value));
 } catch (err) {
 console.error(`Cache set error for ${key}:`, err.message);
 }
}

async function invalidateCache(patterns) {
 try {
 for (const pattern of patterns) {
 const keys = await redisClient.keys(pattern);
 if (keys.length > 0) {
 await redisClient.del(keys);
 console.log(`✓ Invalidated cache: ${pattern}`);
 }
 }
 } catch (err) {
 console.error('Cache invalidation error:', err.message);
 }
}

// ============================================
// GRAPHQL SCHEMA
// ============================================

const typeDefs = `
 type Game {
 id: Int!
 title: String!
 genre: String!
 platform: String!
 price: Float!
 rating: Float
 description: String
 release_date: String
 created_at: String!
 updated_at: String!
 reviews: [Review!]!
 _links: GameLinks!
 }

 type GameLinks {
 self: String!
 update: String!
 delete: String!
 list: String!
 }

 type Review {
 id: Int!
 rating: Int!
 comment: String!
 }

 type GameList {
 data: [Game!]!
 pagination: Pagination!
 _links: PaginationLinks!
 }

 type Pagination {
 limit: Int!
 offset: Int!
 total: Int!
 }

 type PaginationLinks {
 self: String!
 first: String!
 next: String
 prev: String
 }

 type CreateGamePayload {
 message: String!
 data: Game!
 }

 type Query {
 games(limit: Int, offset: Int): GameList!
 game(id: Int!): Game
 searchGames(
 q: String
 genre: String
 platform: String
 priceMin: Float
 priceMax: Float
 ratingMin: Float
 sort: String
 limit: Int
 offset: Int
 ): GameList!
 }

 type Mutation {
 createGame(
 title: String!
 genre: String!
 price: Float!
 platform: String!
 release_date: String
 rating: Float
 description: String
 ): CreateGamePayload!
 }
`;

// ============================================
// GRAPHQL RESOLVERS
// ============================================

const resolvers = {
 Query: {
 games: async (_, { limit = 10, offset = 0 }) => {
 try {
 const countResult = await pool.query('SELECT COUNT(*) as total FROM games');
 const total = parseInt(countResult.rows[0].total);

 const result = await pool.query(
 'SELECT * FROM games ORDER BY created_at DESC LIMIT $1 OFFSET $2',
 [limit, offset]
 );

 const games = result.rows.map(formatGameResponse);
 return {
 data: games,
 pagination: { limit, offset, total },
 _links: {
 self: '/api/v1/games',
 first: `/api/v1/games?limit=${limit}&offset=0`,
 next: offset + limit < total ? `/api/v1/games?limit=${limit}&offset=${offset + limit}` : null,
 prev: offset > 0 ? `/api/v1/games?limit=${limit}&offset=${Math.max(0, offset - limit)}` : null,
 },
 };
 } catch (err) {
 throw new Error(`Failed to fetch games: ${err.message}`);
 }
 },

 game: async (_, { id }) => {
 try {
 const result = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
 return result.rows.length > 0 ? formatGameResponse(result.rows[0]) : null;
 } catch (err) {
 throw new Error(`Failed to fetch game: ${err.message}`);
 }
 },

 searchGames: async (_, {
 q = '*',
 genre,
 platform,
 priceMin,
 priceMax,
 ratingMin,
 sort = 'score desc',
 limit = 10,
 offset = 0,
 }) => {
 try {
 const isWildcard = q === '*';
 const query = isWildcard ? '*:*' : `${q}*`; 
 
 let sortParam = (isWildcard || q.length < 3) ? 'rating desc' : 'score desc';
 if (sort === 'price_asc') sortParam = 'price asc';
 else if (sort === 'price_desc') sortParam = 'price desc';
 else if (sort === 'rating_desc') sortParam = 'rating desc';
 else if (sort === 'title_asc') sortParam = 'title asc';
 
 const filters = [];
 if (genre) filters.push(`genre:"${genre}"`);
 if (platform) filters.push(`platform:"${platform}"`);
 if (priceMin != null) filters.push(`price:[${priceMin} TO *]`);
 if (priceMax != null) filters.push(`price:[* TO ${priceMax}]`);
 if (ratingMin != null) filters.push(`rating:[${ratingMin} TO *]`);
 
 const solrParams = {
 q: query,
 rows: limit,
 start: offset,
 sort: sortParam,
 wt: 'json',
 defType: 'edismax',
 qf: 'title^3 description^1 genre^2 platform^2',
 mm: '1',
 ...(filters.length > 0 && { fq: filters }),
 };
 
 const response = await axios.get(`${solrBase}/select`, {
 params: solrParams,
 paramsSerializer: (params) => {
 const parts = [];
 for (const [key, val] of Object.entries(params)) {
 if (Array.isArray(val)) {
 val.forEach(v => parts.push(`${key}=${encodeURIComponent(v)}`));
 } else {
 parts.push(`${key}=${encodeURIComponent(val)}`);
 }
 }
 return parts.join('&');
 },
 });

 const docs = response.data.response.docs || [];
 const total = response.data.response.numFound || 0;
 
 const games = docs.map(doc => ({
 id: parseInt(doc.id),
 title: doc.title,
 genre: doc.genre,
 platform: doc.platform,
 price: doc.price,
 rating: doc.rating,
 description: doc.description,
 _links: buildHateoasLinks(parseInt(doc.id)),
 }));
 
 return {
 data: games,
 pagination: { limit: parseInt(limit), offset: parseInt(offset), total },
 _links: {
 self: `/api/v1/games/search?q=${q}`,
 first: `/api/v1/games/search?q=${q}&limit=${limit}&offset=0`,
 next: parseInt(offset) + parseInt(limit) < total
 ? `/api/v1/games/search?q=${q}&limit=${limit}&offset=${parseInt(offset) + parseInt(limit)}`
 : null,
 prev: parseInt(offset) > 0
 ? `/api/v1/games/search?q=${q}&limit=${limit}&offset=${Math.max(0, parseInt(offset) - parseInt(limit))}`
 : null,
 },
 };
 } catch (err) {
 throw new Error(`Search failed: ${err.message}`);
 }
 },
 },

 Mutation: {
 createGame: async (_, { title, genre, price, platform, release_date, rating, description }, { user }) => {
 try {
 if (!user || user.role !== 'ADMIN') {
 throw new Error('Admin access required');
 }

 if (!title || !genre || !price || !platform) {
 throw new Error('Title, genre, price, and platform are required');
 }

 if (isNaN(price) || price < 0) {
 throw new Error('Price must be a positive number');
 }

 if (rating && (isNaN(rating) || rating < 0 || rating > 10)) {
 throw new Error('Rating must be between 0 and 10');
 }

 const result = await pool.query(
 `INSERT INTO games (title, genre, price, platform, release_date, rating, description) 
 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
 [title, genre, price, platform, release_date || null, rating || null, description || null]
 );

 const game = formatGameResponse(result.rows[0]);
 indexGameInSolr(result.rows[0]);

 return {
 message: 'Game created successfully',
 data: game,
 };
 } catch (err) {
 throw new Error(`Failed to create game: ${err.message}`);
 }
 },
 },

 Game: {
 reviews: async () => {
 // Stub: return empty array
 return [];
 },
 },
};

// ============================================
// DATABASE INITIALIZATION
// ============================================

async function initializeDatabase() {
 try {
 await pool.query(`
 CREATE TABLE IF NOT EXISTS games (
 id SERIAL PRIMARY KEY,
 title VARCHAR(255) NOT NULL UNIQUE,
 genre VARCHAR(100) NOT NULL,
 price DECIMAL(10, 2) NOT NULL,
 platform VARCHAR(100) NOT NULL,
 release_date DATE,
 rating DECIMAL(3, 1) CHECK (rating >= 0 AND rating <= 10),
 description TEXT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 );
 `);
 console.log('✓ Database schema initialized');
 } catch (err) {
 console.error('Failed to initialize database:', err);
 process.exit(1);
 }
}

// ============================================
// SOLR INITIALIZATION
// ============================================

async function initializeSolr() {
 try {
 // Create collection
 console.log('Creating Solr games collection...');
 try {
 await axios.get(
 `http://${solrHost}:${solrPort}/solr/admin/collections?action=CREATE&name=games&numShards=1&replicationFactor=1&collection.configName=_default`
 );
 console.log('✓ Games collection created');
 } catch (err) {
 if (err.response?.status === 400 || err.response?.status === 409) {
 console.log('✓ Games collection already exists');
 } else {
 console.warn('Collection creation warning:', err.message);
 }
 }

 // Wait for collection to be ready
 await new Promise(resolve => setTimeout(resolve, 2000));

 // Configure schema — same endpoint for both cores and collections
 console.log('Configuring Solr schema...');
 const fields = [
 { name: 'title', type: 'text_general', indexed: true, stored: true },
 { name: 'genre', type: 'string', indexed: true, stored: true },
 { name: 'platform', type: 'string', indexed: true, stored: true },
 { name: 'price', type: 'pfloat', indexed: true, stored: true },
 { name: 'rating', type: 'pfloat', indexed: true, stored: true },
 { name: 'description', type: 'text_general', indexed: true, stored: true },
 ];

 for (const field of fields) {
 try {
 await axios.post(`http://${solrHost}:${solrPort}/solr/games/schema`, {
 'add-field': field,
 });
 console.log(`✓ Added field: ${field.name}`);
 } catch (err) {
 // Field already exists — safe to ignore
 console.log(`~ Field already exists: ${field.name}`);
 }
 }

 console.log('✓ Solr schema configured');
 } catch (err) {
 console.error('Solr initialization error:', err.message);
 }
}

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

const authenticateToken = (req, res, next) => {
 const authHeader = req.headers['authorization'];
 const token = authHeader && authHeader.split(' ')[1];

 if (!token) {
 req.user = null;
 return next();
 }

 jwt.verify(token, JWT_SECRET, (err, user) => {
 if (err) {
 req.user = null;
 } else {
 req.user = user;
 }
 next();
 });
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

const authorizeAdmin = (req, res, next) => {
 if (!req.user || req.user.role !== 'ADMIN') {
 return res.status(403).json({ error: 'Admin access required' });
 }
 next();
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function buildHateoasLinks(gameId) {
 return {
 self: `/api/v1/games/${gameId}`,
 update: `/api/v1/games/${gameId}`,
 delete: `/api/v1/games/${gameId}`,
 list: '/api/v1/games',
 };
}

function formatGameResponse(game) {
 return {
 ...game,
 _links: buildHateoasLinks(game.id),
 };
}

// ============================================
// SOLR INDEXING
// ============================================

async function indexGameInSolr(game) {
 try {
 const doc = {
 id: game.id.toString(),
 title: game.title,
 genre: game.genre,
 platform: game.platform,
 price: parseFloat(game.price),
 rating: game.rating ? parseFloat(game.rating) : 0,
 description: game.description || '',
 };

 await axios.post(`${solrBase}/update?commitWithin=1000`, {
 add: { doc: doc },
 });

 console.log(`✓ Indexed game ${game.id} in Solr`);
 } catch (err) {
 console.error(`Failed to index game ${game.id} in Solr:`, err.message);
 }
}

async function updateGameInSolr(game) {
 try {
 await deleteGameFromSolr(game.id);
 await indexGameInSolr(game);
 } catch (err) {
 console.error(`Failed to update game ${game.id} in Solr:`, err.message);
 }
}

async function deleteGameFromSolr(gameId) {
 try {
 await axios.post(`${solrBase}/update?commitWithin=1000`, {
 delete: { id: gameId.toString() },
 });

 console.log(`✓ Deleted game ${gameId} from Solr`);
 } catch (err) {
 console.error(`Failed to delete game ${gameId} from Solr:`, err.message);
 }
}

// ============================================
// REST API ENDPOINTS (Backwards Compatibility)
// ============================================

/**
 * @swagger
 * /api/v1/games:
 * get:
 * summary: Get all games with pagination
 * tags: [Games]
 * parameters:
 * - in: query
 * name: limit
 * schema: { type: integer, default: 10 }
 * - in: query
 * name: offset
 * schema: { type: integer, default: 0 }
 * responses:
 * 200:
 * description: List of games
 * 500:
 * description: Server error
 */
app.get('/api/v1/games', async (req, res) => {
 try {
 const limit = parseInt(req.query.limit) || 10;
 const offset = parseInt(req.query.offset) || 0;
 const cacheKey = `games:list:${limit}:${offset}`;

 // Check cache first
 const cachedResult = await getCache(cacheKey);
 if (cachedResult) {
 console.log(`✓ Cache hit: ${cacheKey}`);
 return res.json(cachedResult);
 }

 const countResult = await pool.query('SELECT COUNT(*) as total FROM games');
 const total = parseInt(countResult.rows[0].total);

 const result = await pool.query(
 'SELECT * FROM games ORDER BY created_at DESC LIMIT $1 OFFSET $2',
 [limit, offset]
 );

 const games = result.rows.map(formatGameResponse);

 const response = {
 data: games,
 pagination: { limit, offset, total },
 _links: {
 self: '/api/v1/games',
 first: `/api/v1/games?limit=${limit}&offset=0`,
 next: offset + limit < total ? `/api/v1/games?limit=${limit}&offset=${offset + limit}` : null,
 prev: offset > 0 ? `/api/v1/games?limit=${limit}&offset=${Math.max(0, offset - limit)}` : null,
 },
 };

 // Cache for 60 seconds
 await setCache(cacheKey, response, 60);

 res.json(response);
 } catch (err) {
 console.error('Get games error:', err);
 res.status(500).json({ error: 'Internal server error' });
 }
});

/**
 * @swagger
 * /api/v1/games/search:
 * get:
 * summary: Search games by keyword (rate limited)
 * tags: [Games]
 * parameters:
 * - in: query
 * name: q
 * required: true
 * schema: { type: string }
 * responses:
 * 200:
 * description: Search results
 * 429:
 * description: Rate limit exceeded
 * 500:
 * description: Server error
 */
app.get('/api/v1/games/search', searchRateLimiter, async (req, res) => {
 try {
 const { q = '*', genre, platform, priceMin, priceMax, ratingMin, sort, limit = 10, offset = 0 } = req.query;

 const cacheKey = `games:search:${q}:${genre || 'all'}:${platform || 'all'}:${priceMin || '0'}:${priceMax || 'inf'}:${ratingMin || '0'}:${sort || 'default'}:${limit}:${offset}`;

 const cachedResult = await getCache(cacheKey);
 if (cachedResult) {
 console.log(`✓ Cache hit: ${cacheKey}`);
 return res.json(cachedResult);
 }

 const isWildcard = q === '*';
 const query = isWildcard ? '*:*' : `${q}*`; 

 let sortParam = (isWildcard || q.length < 3) ? 'rating desc' : 'score desc';
 if (sort === 'price_asc') sortParam = 'price asc';
 else if (sort === 'price_desc') sortParam = 'price desc';
 else if (sort === 'rating_desc') sortParam = 'rating desc';
 else if (sort === 'title_asc') sortParam = 'title asc';

 const filters = [];
 if (genre) filters.push(`genre:"${genre}"`);
 if (platform) filters.push(`platform:"${platform}"`);
 if (priceMin != null && priceMin !== '') filters.push(`price:[${priceMin} TO *]`);
 if (priceMax != null && priceMax !== '') filters.push(`price:[* TO ${priceMax}]`);
 if (ratingMin != null && ratingMin !== '') filters.push(`rating:[${ratingMin} TO *]`);

 const solrParams = {
 q: query,
 rows: limit,
 start: offset,
 sort: sortParam,
 wt: 'json',
 defType: 'edismax',
 qf: 'title^3 description^1 genre^2 platform^2',
 mm: '1',
 ...(filters.length > 0 && { fq: filters }),
 };

 const response = await axios.get(`${solrBase}/select`, {
 params: solrParams,
 paramsSerializer: (params) => {
 const parts = [];
 for (const [key, val] of Object.entries(params)) {
 if (Array.isArray(val)) {
 val.forEach(v => parts.push(`${key}=${encodeURIComponent(v)}`));
 } else {
 parts.push(`${key}=${encodeURIComponent(val)}`);
 }
 }
 return parts.join('&');
 },
 });

 const docs = response.data.response.docs || [];
 const total = response.data.response.numFound || 0;

 const games = docs.map(doc => ({
 id: parseInt(doc.id),
 title: Array.isArray(doc.title) ? doc.title[0] : doc.title,
 genre: doc.genre,
 platform: doc.platform,
 price: doc.price,
 rating: doc.rating,
 description: Array.isArray(doc.description) ? doc.description[0] : doc.description,
 _links: buildHateoasLinks(parseInt(doc.id)),
 }));

 const result = {
 data: games,
 pagination: { limit: parseInt(limit), offset: parseInt(offset), total },
 _links: {
 self: `/api/v1/games/search?q=${q}&limit=${limit}&offset=${offset}`,
 first: `/api/v1/games/search?q=${q}&limit=${limit}&offset=0`,
 next: parseInt(offset) + parseInt(limit) < total ? `/api/v1/games/search?q=${q}&limit=${limit}&offset=${parseInt(offset) + parseInt(limit)}` : null,
 prev: parseInt(offset) > 0 ? `/api/v1/games/search?q=${q}&limit=${limit}&offset=${Math.max(0, parseInt(offset) - parseInt(limit))}` : null,
 },
 };

 await setCache(cacheKey, result, 60);
 res.json(result);
 } catch (err) {
 console.error('Search error:', err.message);
 res.status(500).json({ error: 'Search failed', details: err.message });
 }
});

/**
 * @swagger
 * /api/v1/games/{id}:
 * get:
 * summary: Get game by ID
 * tags: [Games]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema: { type: integer }
 * responses:
 * 200:
 * description: Game details
 * 404:
 * description: Game not found
 * 500:
 * description: Server error
 */
app.get('/api/v1/games/:id', async (req, res) => {
 try {
 const result = await pool.query('SELECT * FROM games WHERE id = $1', [req.params.id]);

 if (result.rows.length === 0) {
 return res.status(404).json({ error: 'Game not found' });
 }

 res.json(formatGameResponse(result.rows[0]));
 } catch (err) {
 console.error('Get game error:', err);
 res.status(500).json({ error: 'Internal server error' });
 }
});

/**
 * @swagger
 * /api/v1/games:
 * post:
 * summary: Create a new game (admin only)
 * tags: [Games]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required: [title, description, price]
 * properties:
 * title: { type: string }
 * description: { type: string }
 * price: { type: number }
 * genre: { type: string }
 * releaseDate: { type: string, format: date }
 * responses:
 * 201:
 * description: Game created
 * 401:
 * description: Unauthorized
 * 403:
 * description: Forbidden - Admin only
 * 500:
 * description: Server error
 */
app.post('/api/v1/games', requireAuth, authorizeAdmin, async (req, res) => {
 try {
 const { title, genre, price, platform, release_date, rating, description } = req.body;

 if (!title || !genre || !price || !platform) {
 return res.status(400).json({ error: 'Title, genre, price, and platform are required' });
 }

 if (isNaN(price) || price < 0) {
 return res.status(400).json({ error: 'Price must be a positive number' });
 }

 if (rating && (isNaN(rating) || rating < 0 || rating > 10)) {
 return res.status(400).json({ error: 'Rating must be between 0 and 10' });
 }

 const result = await pool.query(
 `INSERT INTO games (title, genre, price, platform, release_date, rating, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
 [title, genre, price, platform, release_date || null, rating || null, description || null]
 );

 const game = formatGameResponse(result.rows[0]);
 indexGameInSolr(result.rows[0]);

 // Invalidate caches when new game is created
 await invalidateCache(['games:list:*', 'games:search:*']);

 res.status(201).json({ message: 'Game created successfully', data: game });
 } catch (err) {
 if (err.code === '23505') {
 return res.status(409).json({ error: 'Game title already exists' });
 }
 console.error('Create game error:', err);
 res.status(500).json({ error: 'Internal server error' });
 }
});

/**
 * @swagger
 * /api/v1/games/{id}:
 * put:
 * summary: Update game (admin only)
 * tags: [Games]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema: { type: integer }
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * title: { type: string }
 * description: { type: string }
 * price: { type: number }
 * genre: { type: string }
 * responses:
 * 200:
 * description: Game updated
 * 401:
 * description: Unauthorized
 * 403:
 * description: Forbidden - Admin only
 * 404:
 * description: Game not found
 * 500:
 * description: Server error
 */
app.put('/api/v1/games/:id', requireAuth, authorizeAdmin, async (req, res) => {
 try {
 const { id } = req.params;
 const { title, genre, price, platform, release_date, rating, description } = req.body;

 const gameCheck = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
 if (gameCheck.rows.length === 0) {
 return res.status(404).json({ error: 'Game not found' });
 }

 const updateFields = [];
 const values = [];
 let paramCount = 1;

 if (title !== undefined) { updateFields.push(`title = $${paramCount++}`); values.push(title); }
 if (genre !== undefined) { updateFields.push(`genre = $${paramCount++}`); values.push(genre); }
 if (price !== undefined) { updateFields.push(`price = $${paramCount++}`); values.push(price); }
 if (platform !== undefined) { updateFields.push(`platform = $${paramCount++}`); values.push(platform); }
 if (release_date !== undefined) { updateFields.push(`release_date = $${paramCount++}`); values.push(release_date); }
 if (rating !== undefined) { updateFields.push(`rating = $${paramCount++}`); values.push(rating); }
 if (description !== undefined) { updateFields.push(`description = $${paramCount++}`); values.push(description); }

 if (updateFields.length === 0) {
 return res.status(400).json({ error: 'No fields to update' });
 }

 updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
 values.push(id);

 const query = `UPDATE games SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
 const result = await pool.query(query, values);
 const game = formatGameResponse(result.rows[0]);

 updateGameInSolr(result.rows[0]);

 // Invalidate caches when game is updated
 await invalidateCache(['games:list:*', 'games:search:*']);

 res.json({ message: 'Game updated successfully', data: game });
 } catch (err) {
 if (err.code === '23505') {
 return res.status(409).json({ error: 'Game title already exists' });
 }
 console.error('Update game error:', err);
 res.status(500).json({ error: 'Internal server error' });
 }
});

/**
 * @swagger
 * /api/v1/games/{id}:
 * delete:
 * summary: Delete game (admin only)
 * tags: [Games]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema: { type: integer }
 * responses:
 * 200:
 * description: Game deleted
 * 401:
 * description: Unauthorized
 * 403:
 * description: Forbidden - Admin only
 * 404:
 * description: Game not found
 * 500:
 * description: Server error
 */
app.delete('/api/v1/games/:id', requireAuth, authorizeAdmin, async (req, res) => {
 try {
 const { id } = req.params;

 const gameCheck = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
 if (gameCheck.rows.length === 0) {
 return res.status(404).json({ error: 'Game not found' });
 }

 await pool.query('DELETE FROM games WHERE id = $1', [id]);
 deleteGameFromSolr(parseInt(id));

 // Invalidate caches when game is deleted
 await invalidateCache(['games:list:*', 'games:search:*']);

 res.json({ message: 'Game deleted successfully', deletedId: parseInt(id) });
 } catch (err) {
 console.error('Delete game error:', err);
 res.status(500).json({ error: 'Internal server error' });
 }
});

/**
 * @swagger
 * /api/v1/admin/reindex:
 * post:
 * summary: Reindex all games to Solr (admin only)
 * tags: [Admin]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Reindexing completed
 * 401:
 * description: Unauthorized
 * 403:
 * description: Forbidden - Admin only
 * 500:
 * description: Server error
 */
app.post('/api/v1/admin/reindex', requireAuth, authorizeAdmin, async (req, res) => {
 try {
 console.log('Starting reindex of all games...');
 
 // Get all games from PostgreSQL
 const result = await pool.query('SELECT * FROM games ORDER BY id');
 const games = result.rows;

 if (games.length === 0) {
 return res.json({ 
 message: 'No games to reindex', 
 reindexedCount: 0 
 });
 }

 // Clear existing Solr index
 try {
 await axios.post(`${solrBase}/update?commitWithin=1000`, {
 delete: { query: '*:*' }
 });
 console.log('✓ Cleared existing Solr index');
 } catch (err) {
 console.warn('Warning: Could not clear Solr index:', err.message);
 }

 // Index all games
 let successCount = 0;
 for (const game of games) {
 try {
 await indexGameInSolr(game);
 successCount++;
 } catch (err) {
 console.error(`Failed to index game ${game.id}:`, err.message);
 }
 }

 // Force commit
 try {
 await axios.post(`${solrBase}/update?commit=true`, {});
 console.log('✓ Solr index committed');
 } catch (err) {
 console.warn('Warning: Could not commit Solr index:', err.message);
 }

 res.json({ 
 message: 'Reindexing completed successfully',
 totalGames: games.length,
 reindexedCount: successCount
 });
 } catch (err) {
 console.error('Reindex error:', err);
 res.status(500).json({ error: 'Reindexing failed', details: err.message });
 }
});

// ============================================
// SWAGGER DOCUMENTATION
// ============================================

const swaggerOptions = {
 definition: {
 openapi: '3.0.0',
 info: {
 title: 'GameStore Game API',
 version: '1.0.0',
 description: 'Game CRUD service with GraphQL and Solr search'
 },
 servers: [
 { url: 'http://localhost:3002', description: 'Development' }
 ]
 },
 apis: [__filename]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve);
app.get('/docs', swaggerUi.setup(swaggerSpec));

// ============================================
// GRAPHQL PLAYGROUND (Apollo Sandbox)
// ============================================

app.get('/playground', (req, res) => {
 res.send(`
 <!DOCTYPE html>
 <html>
 <head>
 <meta charset=utf-8/>
 <meta name="viewport" content="width=device-width, initial-scale=1"/>
 <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css"/>
 <link rel="shortcut icon" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png"/>
 <script src="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
 <title>GraphQL Playground - Game Service</title>
 </head>
 <body>
 <div id="root"></div>
 <script>
 window.addEventListener('load', function (event) {
 GraphQLPlayground.init(document.getElementById('root'), {
 endpoint: '/graphql',
 subscriptionEndpoint: 'ws://localhost:3002/graphql',
 })
 })
 </script>
 </body>
 </html>
 `);
});

// ============================================
// PROMETHEUS METRICS
// ============================================

app.get('/metrics', metricsEndpoint);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
 res.json({ status: 'ok', service: 'game-service' });
});

// ============================================
// SERVER STARTUP
// ============================================

async function start() {
 try {
 // Connect to Redis
 await redisClient.connect();

 await pool.query('SELECT NOW()');
 console.log('✓ Connected to PostgreSQL');

 await initializeDatabase();

 await new Promise(resolve => setTimeout(resolve, 5000));
 await initializeSolr();

 // Create GraphQL Schema
 const schema = makeExecutableSchema({
 typeDefs,
 resolvers,
 });

 // Create Apollo Server
 const apolloServer = new ApolloServer({
 schema,
 introspection: process.env.NODE_ENV !== 'production',
 context: ({ req }) => ({
 user: req.user,
 }),
 });

 await apolloServer.start();

 // Apply JWT middleware before Apollo
 app.use(authenticateToken);

 // Mount Apollo Server
 apolloServer.applyMiddleware({ app, path: '/graphql' });

 app.listen(PORT, () => {
 console.log(`✓ Game Service running on http://localhost:${PORT}`);
 console.log(`✓ GraphQL Endpoint: http://localhost:${PORT}/graphql`);
 console.log(`✓ GraphQL Playground: http://localhost:${PORT}/playground`);
 console.log(`✓ REST API: http://localhost:${PORT}/api/v1/games`);
 console.log(`✓ Swagger Docs: http://localhost:${PORT}/docs`);
 console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
 console.log(`✓ Cache: Redis (TTL: 60s)`);
 console.log(`✓ Rate Limit: 100 req/min per IP (search endpoint)`);
 });
 } catch (err) {
 console.error('Failed to start game service:', err);
 process.exit(1);
 }
}

start();

module.exports = app;