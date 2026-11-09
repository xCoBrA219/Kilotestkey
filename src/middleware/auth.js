/**
 * Cloud Code Router - Authentifizierungs-Middleware
 * 
 * Prüft API-Schlüssel für den Router
 */

const logger = require('./logger');

/**
 * Erstellt die Authentifizierungs-Middleware
 * @param {string} apiKey - Erwarteter API-Schlüssel
 * @returns {Function} Express-Middleware
 */
function authMiddleware(apiKey) {
  if (!apiKey) {
    // Kein API-Schlüssel konfiguriert, immer durchlassen
    return (req, res, next) => next();
  }
  
  return (req, res, next) => {
    try {
      // API-Schlüssel aus Headers extrahieren
      const authHeader = req.headers.authorization || req.headers.Authorization;
      
      // Bearer-Token parsen
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        if (token === apiKey) {
          // API-Schlüssel ist korrekt
          return next();
        }
      }
      
      // API-Schlüssel aus Query-Param
      const queryKey = req.query.api_key || req.query.apiKey;
      if (queryKey === apiKey) {
        return next();
      }
      
      // API-Schlüssel aus Body
      if (req.body && req.body.apiKey === apiKey) {
        return next();
      }
      
      // Kein gültiger API-Schlüssel gefunden
      logger.warn('Unautorisierter Zugriffsversuch', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      
      return res.status(401).json({
        error: {
          message: 'Unautorisiert - Ungültiger API-Schlüssel',
          type: 'unauthorized',
          code: 401
        }
      });
      
    } catch (error) {
      logger.error('Fehler in Auth-Middleware:', error);
      return res.status(500).json({
        error: {
          message: 'Interner Serverfehler',
          type: 'server_error',
          code: 500
        }
      });
    }
  };
}

/**
 * Erstellt eine Middleware für Provider-spezifische Authentifizierung
 * @param {string} providerName - Provider-Name
 * @returns {Function} Express-Middleware
 */
function providerAuthMiddleware(providerName) {
  return (req, res, next) => {
    // Hier könnte man Provider-spezifische Authentifizierung implementieren
    // Für jetzt einfach durchlassen
    next();
  };
}

/**
 * Generiert einen neuen API-Schlüssel
 * @returns {string} API-Schlüssel
 */
function generateApiKey() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validiert einen API-Schlüssel
 * @param {string} apiKey - Zu validierender API-Schlüssel
 * @param {string} expectedKey - Erwarteter API-Schlüssel
 * @returns {boolean} True, wenn gültig
 */
function validateApiKey(apiKey, expectedKey) {
  return apiKey === expectedKey;
}

module.exports = {
  authMiddleware,
  providerAuthMiddleware,
  generateApiKey,
  validateApiKey
};
