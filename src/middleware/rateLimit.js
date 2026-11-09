/**
 * Cloud Code Router - Rate-Limit-Middleware
 * 
 * Implementiert Request-Rate-Limiting
 */

const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('./logger');

// Rate-Limiter-Instanz
let rateLimiter;

/**
 * Initialisiert den Rate-Limiter
 * @param {Object} config - Rate-Limit-Konfiguration
 */
function initRateLimiter(config = {}) {
  const {
    requestsPerMinute = 100
  } = config;
  
  // Rate-Limiter erstellen
  rateLimiter = new RateLimiterMemory({
    points: requestsPerMinute,
    duration: 60 // 60 Sekunden = 1 Minute
  });
  
  if (logger) {
    logger.info(`⏱️ Rate-Limiter initialisiert: ${requestsPerMinute} Requests/Minute`);
  }
}

/**
 * Erstellt die Rate-Limit-Middleware
 * @param {Object} config - Rate-Limit-Konfiguration
 * @returns {Function} Express-Middleware
 */
function rateLimitMiddleware(config = {}) {
  // Rate-Limiter initialisieren
  initRateLimiter(config);
  
  return async (req, res, next) => {
    try {
      // IP-Adresse extrahieren
      const clientId = req.ip || req.connection.remoteAddress;
      
      // Rate-Limit prüfen
      const res = await rateLimiter.consume(clientId);
      
      // Header für Rate-Limit-Informationen
      res.set({
        'X-RateLimit-Limit': config.requestsPerMinute || 100,
        'X-RateLimit-Remaining': res.remainingPoints,
        'X-RateLimit-Reset': Math.ceil(res.msBeforeNext / 1000)
      });
      
      return next();
      
    } catch (error) {
      // Rate-Limit überschritten
      if (logger) {
        logger.warn('Rate-Limit überschritten', {
          ip: req.ip,
          path: req.path
        });
      }
      
      return res.status(429).json({
        error: {
          message: 'Rate-Limit überschritten. Bitte versuchen Sie es später erneut.',
          type: 'rate_limit_exceeded',
          code: 429,
          retryAfter: error.msBeforeNext ? Math.ceil(error.msBeforeNext / 1000) : 60
        }
      });
    }
  };
}

/**
 * Setzt den Rate-Limiter zurück
 */
function resetRateLimiter() {
  if (rateLimiter) {
    rateLimiter.deleteAll();
    if (logger) {
      logger.info('⏱️ Rate-Limiter zurückgesetzt');
    }
  }
}

/**
 * Gibt den aktuellen Rate-Limiter-Status zurück
 * @returns {Object} Status
 */
function getRateLimiterStatus() {
  if (!rateLimiter) {
    return { enabled: false };
  }
  
  return {
    enabled: true,
    points: rateLimiter.points,
    duration: rateLimiter.duration
  };
}

// Standard-Rate-Limiter initialisieren
initRateLimiter();

module.exports = {
  rateLimitMiddleware,
  initRateLimiter,
  resetRateLimiter,
  getRateLimiterStatus
};
