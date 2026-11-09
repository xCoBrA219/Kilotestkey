/**
 * Cloud Code Router - Server
 * 
 * Express-basierter Server mit API-Endpunkten
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('./middleware/logger');
const { authMiddleware } = require('./middleware/auth');
const { rateLimitMiddleware } = require('./middleware/rateLimit');
const ProviderManager = require('./providers');
const RouterEngine = require('./router');

/**
 * Erstellt und startet den Express-Server
 * @param {Object} config - Server-Konfiguration
 * @returns {Promise<Object>} Express-Server-Instanz
 */
async function startServer(config) {
  const app = express();
  
  // Middleware
  app.use(helmet());
  app.use(compression());
  app.use(cors({
    origin: config.server.corsOrigins || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Provider', 'X-Model', 'X-Routing-Rule']
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Request-Logging
  app.use(logger.requestLogger);
  
  // Rate Limiting (falls aktiviert)
  if (config.server.rateLimit?.enabled) {
    app.use(rateLimitMiddleware(config.server.rateLimit));
  }
  
  // API-Schlüssel Authentifizierung (falls konfiguriert)
  if (config.server.apiKey) {
    app.use(authMiddleware(config.server.apiKey));
  }
  
  // Provider-Manager und Router-Engine initialisieren
  const providerManager = new ProviderManager(config.providers);
  const routerEngine = new RouterEngine(providerManager, config.routing);
  
  // Health-Check Endpunkt
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Provider-Status Endpunkt
  app.get('/api/v1/providers', async (req, res) => {
    try {
      const providers = await providerManager.getProviderStatus();
      res.json({
        success: true,
        providers,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Fehler beim Abrufen der Provider-Status:', error);
      res.status(500).json({
        success: false,
        error: 'Fehler beim Abrufen der Provider-Status'
      });
    }
  });
  
  // Modelle abrufen
  app.get('/api/v1/models', async (req, res) => {
    try {
      const models = await providerManager.getAllModels();
      res.json({
        success: true,
        models,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Fehler beim Abrufen der Modelle:', error);
      res.status(500).json({
        success: false,
        error: 'Fehler beim Abrufen der Modelle'
      });
    }
  });
  
  // Haupt-API-Endpunkt für Chat-Completions
  app.post('/api/v1/chat/completions', async (req, res) => {
    try {
      const requestId = req.headers['x-request-id'] || generateRequestId();
      const startTime = Date.now();
      
      logger.info(`[${requestId}] Neue Chat-Anfrage erhalten`, {
        model: req.body.model,
        provider: req.headers['x-provider'],
        messages: req.body.messages?.length || 0
      });
      
      // Anfrage an Router-Engine weiterleiten
      const response = await routerEngine.routeRequest(req.body, {
        headers: req.headers,
        requestId
      });
      
      const duration = Date.now() - startTime;
      logger.info(`[${requestId}] Anfrage abgeschlossen in ${duration}ms`, {
        resolvedProvider: response.provider,
        resolvedModel: response.model,
        tokensUsed: response.usage?.total_tokens || 0
      });
      
      // Response formatieren (OpenAI-kompatibel)
      res.json({
        id: requestId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.content
          },
          finish_reason: response.finish_reason || 'stop'
        }],
        usage: response.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      });
      
    } catch (error) {
      logger.error('Fehler bei Chat-Anfrage:', error);
      
      // Fehler-Response
      const errorResponse = {
        error: {
          message: error.message || 'Ein Fehler ist aufgetreten',
          type: error.type || 'server_error',
          code: error.code || 500
        }
      };
      
      // Falls Provider-spezifischer Fehler
      if (error.provider) {
        errorResponse.error.provider = error.provider;
      }
      
      res.status(error.statusCode || 500).json(errorResponse);
    }
  });
  
  // Streaming-Endpunkt (für zukünftige Implementierung)
  app.post('/api/v1/chat/completions/stream', (req, res) => {
    res.status(501).json({
      error: {
        message: 'Streaming wird noch nicht unterstützt',
        type: 'not_implemented',
        code: 501
      }
    });
  });
  
  // Dashboard (einfache HTML-Seite für Management)
  app.get('/dashboard', (req, res) => {
    res.send(`,
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cloud Code Router - Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          .card { background: #f5f5f5; padding: 20px; margin: 10px 0; border-radius: 8px; }
          .status-online { color: green; }
          .status-offline { color: red; }
        </style>
      </head>
      <body>
        <h1>🚀 Cloud Code Router</h1>
        <p>Willkommen im Dashboard!</p>
        <div class="card">
          <h2>📊 Status</h2>
          <p>Server läuft auf Port ${config.server.port}</p>
        </div>
        <div class="card">
          <h2>🔌 Provider</h2>
          <p>Konfigurierte Provider: ${Object.keys(config.providers || {}).length}</p>
        </div>
        <div class="card">
          <h2>📖 Dokumentation</h2>
          <p>Siehe <a href="/api/v1/providers">/api/v1/providers</a> für Provider-Status</p>
          <p>Siehe <a href="/api/v1/models">/api/v1/models</a> für verfügbare Modelle</p>
        </div>
      </body>
      </html>
    `);
  });
  
  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        message: 'Endpunkt nicht gefunden',
        type: 'not_found',
        code: 404
      }
    });
  });
  
  // Error Handler
  app.use((err, req, res, next) => {
    logger.error('Unerwarteter Fehler:', err);
    res.status(500).json({
      error: {
        message: 'Interner Serverfehler',
        type: 'internal_server_error',
        code: 500
      }
    });
  });
  
  // Server starten
  return new Promise((resolve, reject) => {
    const server = app.listen(config.server.port, config.server.host, () => {
      resolve(server);
    });
    
    server.on('error', (error) => {
      logger.error('Server-Fehler:', error);
      reject(error);
    });
  });
}

/**
 * Generiert eine eindeutige Request-ID
 * @returns {string} Request-ID
 */
function generateRequestId() {
  return `ccr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = { startServer };
