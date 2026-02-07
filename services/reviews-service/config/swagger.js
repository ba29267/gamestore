const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GameStore API',
      version: '1.0.0',
      description: 'Complete microservices Game Store Backend API',
      contact: {
        name: 'GameStore Development Team'
      }
    },
    servers: [
      {
        url: 'http://localhost/api/v1',
        description: 'Local development server'
      },
      {
        url: 'https://api.gamestore.com/api/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code'
            }
          }
        },
        Links: {
          type: 'object',
          properties: {
            self: { type: 'string' },
            first: { type: 'string' },
            next: { type: 'string' },
            prev: { type: 'string' },
            list: { type: 'string' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            limit: { type: 'integer' },
            offset: { type: 'integer' },
            total: { type: 'integer' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Game: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            genre: { type: 'string' },
            platform: { type: 'string' },
            price: { type: 'number' },
            rating: { type: 'number' },
            description: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            _links: { $ref: '#/components/schemas/Links' }
          }
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            game_id: { type: 'integer' },
            user_id: { type: 'integer' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            title: { type: 'string' },
            comment: { type: 'string' },
            helpful_count: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            _links: { $ref: '#/components/schemas/Links' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            total_price: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'completed', 'cancelled'] },
            created_at: { type: 'string', format: 'date-time' },
            _links: { $ref: '#/components/schemas/Links' }
          }
        }
      }
    }
  },
  apis: [] // Populated dynamically by each service
};

function generateSpec(servicePaths = []) {
  return swaggerJsdoc({
    ...options,
    apis: servicePaths
  });
}

module.exports = { options, generateSpec };
