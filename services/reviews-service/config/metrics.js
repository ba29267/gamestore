const promClient = require('prom-client');

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics();

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

const cacheHitRate = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type']
});

const cacheMissRate = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active database connections',
  labelNames: ['connection_type']
});

// Middleware to collect HTTP metrics
function metricsMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
    httpRequestTotal.labels(req.method, route, res.statusCode).inc();
  });

  next();
}

// Metrics endpoint
const metricsEndpoint = async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
};

module.exports = {
  promClient,
  metricsMiddleware,
  metricsEndpoint,
  httpRequestDuration,
  httpRequestTotal,
  dbQueryDuration,
  cacheHitRate,
  cacheMissRate,
  activeConnections
};
