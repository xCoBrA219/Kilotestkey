/**
 * Cloud Code Router - Server
 * 
 * Express-basierter Server mit API-Endpunkten und Web-UI
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const axios = require('axios');
const { logger, requestLogger } = require('./middleware/logger');
const { authMiddleware, jwtAuthMiddleware } = require('./middleware/auth');
const { registerUser, authenticateUser } = require('./utils/auth');
const { rateLimitMiddleware } = require('./middleware/rateLimit');
const ProviderManager = require('./providers');
const RouterEngine = require('./router');

// Request-Logs-Speicher
let requestLogs = [];

// Chat-Sessions-Speicher (im RAM, für Sprachchat-Historie)
let chatSessions = {};

/**
 * Erstellt und startet den Express-Server
 * @param {Object} config - Server-Konfiguration
 * @returns {Promise<Object>} Express-Server-Instanz
 */
async function startServer(config) {
  const app = express();
  
  // View Engine (EJS) konfigurieren
  app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'ejs');
  
  // Statische Dateien
  app.use('/styles', express.static(path.join(__dirname, '../public/styles')));
  app.use('/scripts', express.static(path.join(__dirname, '../public/scripts')));
  app.use('/images', express.static(path.join(__dirname, '../public/images')));
  
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
  app.use(requestLogger);
  
  // Rate Limiting
  if (config.server.rateLimit?.enabled) {
    app.use(rateLimitMiddleware(config.server.rateLimit));
  }
  
  // API-Schlüssel Authentifizierung
  if (config.server.apiKey) {
    app.use(authMiddleware(config.server.apiKey));
  }
  
  // Provider-Manager und Router-Engine initialisieren
  const providerManager = new ProviderManager(config.providers);
  const routerEngine = new RouterEngine(providerManager, config.routing);
  
  // ========== UI ROUTES ==========
  
  // Dashboard
  app.get('/dashboard', async (req, res) => {
    try {
      const providerStatus = await providerManager.getProviderStatus();
      const providers = Object.entries(providerStatus).map(([name, status]) => ({
        name,
        ...status
      }));
      
      const stats = {
        totalRequests: requestLogs.length,
        activeProviders: Object.keys(config.providers || {}).length,
        totalTokens: requestLogs.reduce((sum, l) => sum + (l.tokens || 0), 0),
        uptime: Math.round(process.uptime())
      };
      
      const activity = requestLogs.slice(0, 5).map(log => ({
        type: 'request',
        message: `Request zu ${log.model || 'unbekannt'}`,
        timestamp: new Date().toLocaleTimeString('de-DE')
      }));
      
      res.render('pages/dashboard', {
        title: 'Dashboard',
        active: 'dashboard',
        stats,
        providers,
        activity
      });
    } catch (error) {
      logger.error('Fehler beim Laden des Dashboards:', error);
      res.status(500).render('pages/dashboard', {
        title: 'Dashboard',
        active: 'dashboard',
        stats: { totalRequests: 0, activeProviders: 0, totalTokens: 0, uptime: 0 },
        providers: [],
        activity: []
      });
    }
  });
  
  // Provider Page
  app.get('/providers', async (req, res) => {
    try {
      const providerStatus = await providerManager.getProviderStatus();
      const providers = Object.entries(providerStatus).map(([name, status]) => ({
        name,
        ...status
      }));
      
      res.render('pages/providers', {
        title: 'Provider',
        active: 'providers',
        providers
      });
    } catch (error) {
      logger.error('Fehler beim Laden der Provider-Seite:', error);
      res.status(500).render('pages/providers', {
        title: 'Provider',
        active: 'providers',
        providers: []
      });
    }
  });
  
  // Routing Page
  app.get('/routing', (req, res) => {
    try {
      const providers = providerManager.getEnabledProviders();
      const routingConfig = routerEngine.getConfig();
      
      res.render('pages/routing', {
        title: 'Routing',
        active: 'routing',
        providers: Object.entries(providers).map(([name, p]) => ({
          name,
          baseUrl: p.config.baseUrl,
          models: p.config.models
        })),
        routing: routingConfig
      });
    } catch (error) {
      logger.error('Fehler beim Laden der Routing-Seite:', error);
      res.status(500).render('pages/routing', {
        title: 'Routing',
        active: 'routing',
        providers: [],
        routing: { default: null, rules: [], fallback: [] }
      });
    }
  });
  
  // Logs Page
  app.get('/logs', (req, res) => {
    try {
      const logs = requestLogs.map(log => ({
        timestamp: log.timestamp || new Date().toLocaleString('de-DE'),
        level: log.level || 'info',
        provider: log.provider || '-',
        model: log.model || '-',
        requestId: log.requestId || '-',
        message: log.message || '-',
        tokens: log.tokens || 0,
        duration: log.duration || 0
      }));
      
      const stats = {
        totalLogs: logs.length,
        infoCount: logs.filter(l => l.level === 'info').length,
        warnCount: logs.filter(l => l.level === 'warn').length,
        errorCount: logs.filter(l => l.level === 'error').length,
        totalTokens: logs.reduce((sum, l) => sum + (l.tokens || 0), 0),
        avgDuration: logs.length > 0 
          ? Math.round(logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length)
          : 0
      };
      
      const providers = providerManager.getProviderNames();
      
      res.render('pages/logs', {
        title: 'Logs',
        active: 'logs',
        logs,
        stats,
        providers
      });
    } catch (error) {
      logger.error('Fehler beim Laden der Logs-Seite:', error);
      res.status(500).render('pages/logs', {
        title: 'Logs',
        active: 'logs',
        logs: [],
        stats: { totalLogs: 0, infoCount: 0, warnCount: 0, errorCount: 0, totalTokens: 0, avgDuration: 0 },
        providers: []
      });
    }
  });
  
  // Settings Page
  app.get('/settings', (req, res) => {
    try {
      const stats = {
        totalRequests: requestLogs.length,
        activeProviders: Object.keys(config.providers || {}).length,
        totalTokens: requestLogs.reduce((sum, l) => sum + (l.tokens || 0), 0),
        uptime: Math.round(process.uptime())
      };
      
      res.render('pages/settings', {
        title: 'Einstellungen',
        active: 'settings',
        server: {
          port: config.server.port,
          host: config.server.host,
          apiKey: config.server.apiKey ? true : false,
          rateLimit: config.server.rateLimit,
          corsOrigins: config.server.corsOrigins,
          nodeVersion: process.version
        },
        logging: config.logging,
        stats
      });
    } catch (error) {
      logger.error('Fehler beim Laden der Settings-Seite:', error);
      res.status(500).render('pages/settings', {
        title: 'Einstellungen',
        active: 'settings',
        server: {},
        logging: {},
        stats: {}
      });
    }
  });
  
  // Root Route - Redirect to Dashboard
  app.get('/', (req, res) => {
    res.redirect('/dashboard');
  });

  // Chat Page (Sprachchat im Browser)
  app.get('/chat', async (req, res) => {
    try {
      const models = await providerManager.getAllModels();
      const providerStatus = await providerManager.getProviderStatus();
      const providers = Object.entries(providerStatus).map(([name, status]) => ({
        name,
        ...status
      }));

      res.render('pages/chat', {
        title: 'Sprachchat',
        active: 'chat',
        models,
        providers,
        sessions: [],
        messages: []
      });
    } catch (error) {
      logger.error('Fehler beim Laden der Chat-Seite:', error);
      res.render('pages/chat', {
        title: 'Sprachchat',
        active: 'chat',
        models: [],
        providers: [],
        sessions: [],
        messages: []
      });
    }
  });
  
  // ========== API ROUTES ==========
  
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
      const requestId = req.headers['x-request-id'] || `ccr-${Date.now()}`;
      const startTime = Date.now();
      
      logger.info(`[${requestId}] Neue Chat-Anfrage erhalten`, {
        model: req.body.model,
        provider: req.headers['x-provider']
      });
      
      // Anfrage an Router-Engine weiterleiten
      const response = await routerEngine.routeRequest(req.body, {
        headers: req.headers,
        requestId
      });
      
      const duration = Date.now() - startTime;
      
      // Log-Eintrag erstellen
      requestLogs.unshift({
        timestamp: new Date().toLocaleString('de-DE'),
        level: 'info',
        requestId,
        provider: response.provider,
        model: response.model,
        message: `Chat-Anfrage an ${response.provider}:${response.model}`,
        tokens: response.usage?.total_tokens || 0,
        duration
      });
      
      // Maximal 1000 Logs behalten
      if (requestLogs.length > 1000) {
        requestLogs = requestLogs.slice(0, 1000);
      }
      
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
      
      // Fehler-Log erstellen
      requestLogs.unshift({
        timestamp: new Date().toLocaleString('de-DE'),
        level: 'error',
        requestId: req.headers['x-request-id'] || `ccr-${Date.now()}`,
        provider: error.provider || 'unknown',
        model: req.body.model || 'unknown',
        message: error.message || 'Unbekannter Fehler',
        tokens: 0,
        duration: 0
      });
      
      const errorResponse = {
        error: {
          message: error.message || 'Ein Fehler ist aufgetreten',
          type: error.type || 'server_error',
          code: error.code || 500
        }
      };
      
      if (error.provider) {
        errorResponse.error.provider = error.provider;
      }
      
      res.status(error.statusCode || 500).json(errorResponse);
    }
  });
  
  // Streaming-Endpunkt (SSE) für Sprachchat
  app.post('/api/v1/chat/completions/stream', async (req, res) => {
    try {
      const requestId = req.headers['x-request-id'] || `ccr-stream-${Date.now()}`;
      const { model, messages, ...rest } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          error: { message: 'Nachrichten sind erforderlich', type: 'bad_request', code: 400 }
        });
      }

      // Route auflösen (Provider + Modell)
      const resolved = await routerEngine.resolveRoute({ model, messages }, { headers: req.headers, requestId });
      const provider = providerManager.getProvider(resolved.provider);

      if (!provider) {
        return res.status(404).json({
          error: { message: `Provider "${resolved.provider}" nicht gefunden`, type: 'not_found', code: 404 }
        });
      }

      const available = await providerManager.isProviderAvailable(resolved.provider);
      if (!available) {
        return res.status(503).json({
          error: { message: `Provider "${resolved.provider}" nicht verfügbar`, type: 'service_unavailable', code: 503 }
        });
      }

      // SSE-Header setzen
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });

      let done = false;
      const sendEvent = (type, data) => {
        if (!done) {
          res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
        }
      };

      sendEvent('start', { requestId, provider: resolved.provider, model: resolved.model });

      try {
        if (typeof provider.streamChat === 'function') {
          await provider.streamChat({ model: resolved.model, messages, ...rest }, (chunk) => {
            sendEvent('delta', { content: chunk });
          });
        } else {
          // Fallback: nicht-streamender Provider, gesamtes Ergebnis auf einmal senden
          const response = await provider.chat({ model: resolved.model, messages, ...rest });
          sendEvent('delta', { content: response.content || '' });
          sendEvent('done', {
            provider: response.provider,
            model: response.model,
            usage: response.usage,
            finish_reason: response.finish_reason
          });
        }

        if (!done) {
          done = true;
          sendEvent('done', { provider: resolved.provider, model: resolved.model });
          res.write('data: [DONE]\n\n');
          res.end();
        }

        // Request-Log
        requestLogs.unshift({
          timestamp: new Date().toLocaleString('de-DE'),
          level: 'info',
          requestId,
          provider: resolved.provider,
          model: resolved.model,
          message: `Streaming-Chat an ${resolved.provider}:${resolved.model}`,
          tokens: 0,
          duration: 0
        });
        if (requestLogs.length > 1000) {
          requestLogs = requestLogs.slice(0, 1000);
        }
      } catch (streamError) {
        if (!done) {
          done = true;
          sendEvent('error', { message: streamError.message || 'Streaming-Fehler' });
          res.end();
        }
        logger.error(`[${requestId}] Streaming-Fehler:`, streamError);
      }
    } catch (error) {
      logger.error('Fehler bei Streaming-Chat-Anfrage:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: { message: error.message || 'Interner Serverfehler', type: 'server_error', code: 500 }
        });
      } else {
        res.end();
      }
    }
  });

  // ========== Chat-Sessions API (Sprachchat) ==========

  // Alle Chat-Sessions auflisten
  app.get('/api/v1/chat/sessions', (req, res) => {
    const sessions = Object.entries(chatSessions).map(([id, session]) => ({
      id,
      title: session.title,
      model: session.model,
      provider: session.provider,
      messageCount: session.messages.length,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt
    }));
    res.json({ success: true, sessions });
  });

  // Neue Chat-Session erstellen
  app.post('/api/v1/chat/sessions', jwtAuthMiddleware, (req, res) => {
    try {
      const { title, model, provider } = req.body;
      const id = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      chatSessions[id] = {
        id,
        title: title || 'Neuer Chat',
        model: model || '',
        provider: provider || '',
        userId: req.user.id,
        username: req.user.username,
        messages: [],
        createdAt: now,
        updatedAt: now
      };

      res.json({ success: true, session: chatSessions[id] });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Einzelne Chat-Session abrufen
  app.get('/api/v1/chat/sessions/:id', jwtAuthMiddleware, (req, res) => {
    const { id } = req.params;
    const session = chatSessions[id];

    if (!session) {
      return res.status(404).json({ success: false, error: 'Chat-Session nicht gefunden' });
    }
    // Nur Besitzer darf Session sehen
    if (session.userId && session.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Nicht der Besitzer dieser Session' });
    }

    res.json({ success: true, session });
  });

  // Nachricht zu Chat-Session hinzufügen (und Antwort generieren)
  app.post('/api/v1/chat/sessions/:id/messages', jwtAuthMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const session = chatSessions[id];

      if (!session) {
        return res.status(404).json({ success: false, error: 'Chat-Session nicht gefunden' });
      }
      if (session.userId && session.userId !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Nicht der Besitzer dieser Session' });
      }

      const { content, model, provider, stream = false } = req.body;

      if (!content) {
        return res.status(400).json({ success: false, error: 'Nachrichteninhalt erforderlich' });
      }

      const userMessage = { role: 'user', content, userId: req.user.id };
      session.messages.push(userMessage);

      // Modell/Provider aus Session übernehmen, falls nicht übergeben
      const targetModel = model || session.model;
      const targetProvider = provider || session.provider;

      const requestPayload = {
        model: targetModel,
        messages: session.messages,
        stream
      };

      const headers = {};
      if (targetProvider) {
        headers['x-provider'] = targetProvider;
      }

      let result;
      if (stream) {
        // Streaming wird client-seitig über /stream gehandled; hier nur Session-Modell speichern
        session.model = targetModel;
        session.provider = targetProvider;
        session.updatedAt = new Date().toISOString();
        return res.json({ success: true, session, streamUrl: `/api/v1/chat/completions/stream` });
      }

      result = await routerEngine.routeRequest(requestPayload, { headers, requestId: `chat-${id}` });

      const assistantMessage = {
        role: 'assistant',
        content: result.content,
        provider: result.provider,
        model: result.model,
        usage: result.usage
      };
      session.messages.push(assistantMessage);
      session.model = result.model || targetModel;
      session.provider = result.provider || targetProvider;
      session.updatedAt = new Date().toISOString();

      res.json({ success: true, session, message: assistantMessage, result });
    } catch (error) {
      logger.error('Fehler beim Senden der Chat-Nachricht:', error);
      res.status(500).json({ success: false, error: error.message || 'Interner Serverfehler' });
    }
  });

  // Chat-Session löschen
  app.delete('/api/v1/chat/sessions/:id', jwtAuthMiddleware, (req, res) => {
    const { id } = req.params;
    if (!chatSessions[id]) {
      return res.status(404).json({ success: false, error: 'Chat-Session nicht gefunden' });
    }
    // Nur Besitzer darf löschen
    if (chatSessions[id].userId && chatSessions[id].userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Nicht der Besitzer dieser Session' });
    }
    delete chatSessions[id];
    res.json({ success: true, message: 'Chat-Session gelöscht' });
  });

  // ========== Auth (Benutzerkonten) ==========

  // Registrierung
  app.post('/api/v1/auth/register', (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Benutzername und Passwort erforderlich' });
      }
      const result = registerUser(username, password);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, user: result.user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Login
  app.post('/api/v1/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Benutzername und Passwort erforderlich' });
      }
      const result = authenticateUser(username, password);
      if (!result.success) {
        return res.status(401).json({ success: false, error: result.error });
      }
      res.json({ success: true, token: result.token, user: result.user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Eigene Daten
  app.get('/api/v1/auth/me', jwtAuthMiddleware, (req, res) => {
    res.json({ success: true, user: req.user });
  });

  // ========== Föderation (Router-zu-Router Chat) ==========

  // Peers auflisten
  app.get('/api/v1/federation/peers', jwtAuthMiddleware, (req, res) => {
    const peers = (config.federation && config.federation.peers) || [];
    res.json({ success: true, peers, enabled: !!config.federation?.enabled });
  });

  // Peer hinzufügen
  app.post('/api/v1/federation/peers', jwtAuthMiddleware, (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, error: 'Peer-URL erforderlich' });
      }
      if (!config.federation) config.federation = { enabled: true, peers: [] };
      if (!config.federation.peers) config.federation.peers = [];
      if (config.federation.peers.includes(url)) {
        return res.status(400).json({ success: false, error: 'Peer bereits hinzugefügt' });
      }
      config.federation.peers.push(url);
      res.json({ success: true, peers: config.federation.peers });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Peer entfernen
  app.delete('/api/v1/federation/peers/:index', jwtAuthMiddleware, (req, res) => {
    try {
      const { index } = req.params;
      const idx = parseInt(index, 10);
      if (!config.federation || !config.federation.peers || idx < 0 || idx >= config.federation.peers.length) {
        return res.status(404).json({ success: false, error: 'Peer nicht gefunden' });
      }
      config.federation.peers.splice(idx, 1);
      res.json({ success: true, peers: config.federation.peers });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Föderations-Status
  app.get('/api/v1/federation/status', jwtAuthMiddleware, async (req, res) => {
    const peers = (config.federation && config.federation.peers) || [];
    const results = [];
    for (const peer of peers) {
      try {
        const resp = await axios.get(`${peer.replace(/\/$/, '')}/api/v1/federation/status`, { timeout: 5000 });
        results.push({ peer, online: true, ...resp.data });
      } catch (error) {
        results.push({ peer, online: false, error: error.message });
      }
    }
    res.json({ success: true, enabled: !!config.federation?.enabled, peers: results });
  });

  // Nachricht an Peer-Router senden (Föderation)
  app.post('/api/v1/federation/message', jwtAuthMiddleware, async (req, res) => {
    try {
      const { peerIndex, targetUser, content, model } = req.body;
      const peers = (config.federation && config.federation.peers) || [];
      const peerUrl = peers[parseInt(peerIndex, 10)];
      if (!peerUrl) {
        return res.status(400).json({ success: false, error: 'Peer nicht gefunden' });
      }

      // Eigene Session für den Empfänger nutzen / erstellen
      let sessionId = req.body.sessionId;
      let session = chatSessions[sessionId];
      if (!session) {
        const id = `fed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        session = {
          id,
          title: `Föderation: ${targetUser}`,
          model: model || '',
          provider: '',
          messages: [],
          userId: req.user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        chatSessions[id] = session;
        sessionId = id;
      }

      // Eigene Nachricht (absender) speichern
      session.messages.push({ role: 'user', content, userId: req.user.id, targetUser });
      session.updatedAt = new Date().toISOString();

      // An den Peer-Router weiterleiten
      const base = peerUrl.replace(/\/$/, '');
      const forwardResp = await axios.post(`${base}/api/v1/federation/relay`, {
        fromUser: req.user.username,
        targetUser,
        content,
        model,
        sessionId
      }, { timeout: 30000, headers: { 'Content-Type': 'application/json' } });

      const reply = forwardResp.data;
      session.messages.push({ role: 'assistant', content: reply.content || '', provider: 'federation', model: reply.model || model, userId: reply.fromUser });
      session.updatedAt = new Date().toISOString();

      res.json({ success: true, sessionId, reply });
    } catch (error) {
      logger.error('Föderations-Nachricht fehlgeschlagen:', error);
      res.status(500).json({ success: false, error: error.message || 'Föderations-Nachricht fehlgeschlagen' });
    }
  });

  // Relay-Endpunkt: empfangene Föderations-Nachricht beantworten (intern)
  app.post('/api/v1/federation/relay', jwtAuthMiddleware, async (req, res) => {
    try {
      const { fromUser, targetUser, content, model, sessionId } = req.body;
      // Ziel-Benutzer ist der eingeloggte (targetUser == req.user.username)
      // Antwort generieren über lokalen Router
      const routerResult = await routerEngine.routeRequest(
        { model, messages: [{ role: 'user', content }] },
        { headers: { 'x-provider': '' }, requestId: `relay-${Date.now()}` }
      );

      res.json({
        success: true,
        fromUser: req.user.username,
        toUser: fromUser,
        content: routerResult.content,
        model: routerResult.model
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get Stats
  app.get('/api/v1/stats', (req, res) => {
    const stats = {
      totalRequests: requestLogs.length,
      activeProviders: Object.keys(config.providers || {}).length,
      totalTokens: requestLogs.reduce((sum, l) => sum + (l.tokens || 0), 0),
      uptime: Math.round(process.uptime())
    };
    res.json({ success: true, ...stats });
  });
  
  // Get Logs
  app.get('/api/v1/logs', (req, res) => {
    const logs = requestLogs.map(log => ({
      timestamp: log.timestamp || new Date().toLocaleString('de-DE'),
      level: log.level || 'info',
      provider: log.provider || '-',
      model: log.model || '-',
      requestId: log.requestId || '-',
      message: log.message || '-',
      tokens: log.tokens || 0,
      duration: log.duration || 0
    }));
    res.json({ success: true, logs });
  });
  
  // Clear Logs
  app.delete('/api/v1/logs', (req, res) => {
    requestLogs = [];
    res.json({ success: true, message: 'Logs geleert' });
  });
  
  // Get Provider by Name
  app.get('/api/v1/providers/:name', (req, res) => {
    const { name } = req.params;
    const provider = providerManager.getProvider(name);
    
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider nicht gefunden' });
    }
    
    const providerConfig = provider.getConfig();
    res.json({ 
      success: true, 
      name,
      ...providerConfig
    });
  });
  
  // Add/Update Provider
  app.post('/api/v1/providers/:name', (req, res) => {
    try {
      const { name } = req.params;
      const data = req.body;
      
      // Prüfen, ob Provider bereits existiert
      const existingProvider = providerManager.getProvider(name);
      
      if (existingProvider) {
        // Provider aktualisieren
        providerManager.addProvider(name, data);
      } else {
        // Neuer Provider
        providerManager.addProvider(name, data);
      }
      
      // Konfiguration aktualisieren
      if (!config.providers) {
        config.providers = {};
      }
      config.providers[name] = data;
      
      res.json({ success: true, message: 'Provider gespeichert' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Delete Provider
  app.delete('/api/v1/providers/:name', (req, res) => {
    try {
      const { name } = req.params;
      providerManager.removeProvider(name);
      
      // Konfiguration aktualisieren
      if (config.providers && config.providers[name]) {
        delete config.providers[name];
      }
      
      res.json({ success: true, message: 'Provider gelöscht' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Toggle Provider
  app.post('/api/v1/providers/:name/toggle', (req, res) => {
    try {
      const { name } = req.params;
      const { enabled } = req.body;
      providerManager.setProviderEnabled(name, enabled);
      
      // Konfiguration aktualisieren
      if (config.providers && config.providers[name]) {
        config.providers[name].enabled = enabled;
      }
      
      res.json({ success: true, message: 'Provider-Status aktualisiert' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Test Provider Connection
  app.get('/api/v1/providers/:name/test', async (req, res) => {
    try {
      const { name } = req.params;
      const available = await providerManager.isProviderAvailable(name);
      res.json({ 
        success: available, 
        message: available ? 'Verbindung erfolgreich' : 'Verbindung fehlgeschlagen' 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Get Routing Rules
  app.get('/api/v1/routing/rules', (req, res) => {
    const routingConfig = routerEngine.getConfig();
    res.json({ success: true, rules: routingConfig.rules || [] });
  });
  
  // Add Routing Rule
  app.post('/api/v1/routing/rules', (req, res) => {
    try {
      const rule = req.body;
      routerEngine.addRoutingRule(rule);
      
      // Konfiguration aktualisieren
      if (!config.routing) {
        config.routing = { default: null, rules: [], fallback: [] };
      }
      config.routing.rules.push(rule);
      
      res.json({ success: true, message: 'Regel hinzugefügt' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Update Routing Rule
  app.put('/api/v1/routing/rules/:index', (req, res) => {
    try {
      const { index } = req.params;
      const rule = req.body;
      const routingConfig = routerEngine.getConfig();
      routingConfig.rules[index] = rule;
      
      // Konfiguration aktualisieren
      if (config.routing) {
        config.routing.rules[index] = rule;
      }
      
      res.json({ success: true, message: 'Regel aktualisiert' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Delete Routing Rule
  app.delete('/api/v1/routing/rules/:index', (req, res) => {
    try {
      const { index } = req.params;
      const routingConfig = routerEngine.getConfig();
      routingConfig.rules.splice(index, 1);
      
      // Konfiguration aktualisieren
      if (config.routing) {
        config.routing.rules.splice(index, 1);
      }
      
      res.json({ success: true, message: 'Regel gelöscht' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Update Default Routing
  app.put('/api/v1/routing/default', (req, res) => {
    try {
      const { target } = req.body;
      routerEngine.setDefaultRouting(target);
      
      // Konfiguration aktualisieren
      if (!config.routing) {
        config.routing = { default: null, rules: [], fallback: [] };
      }
      config.routing.default = target;
      
      res.json({ success: true, message: 'Standard-Routing aktualisiert' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Update Fallback
  app.put('/api/v1/routing/fallback', (req, res) => {
    try {
      const { index, target } = req.body;
      const routingConfig = routerEngine.getConfig();
      routingConfig.fallback[index] = target;
      
      // Konfiguration aktualisieren
      if (config.routing) {
        config.routing.fallback[index] = target;
      }
      
      res.json({ success: true, message: 'Fallback aktualisiert' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Delete Fallback
  app.delete('/api/v1/routing/fallback', (req, res) => {
    try {
      const { index } = req.body;
      const routingConfig = routerEngine.getConfig();
      routingConfig.fallback.splice(index, 1);
      
      // Konfiguration aktualisieren
      if (config.routing) {
        config.routing.fallback.splice(index, 1);
      }
      
      res.json({ success: true, message: 'Fallback entfernt' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Test Routing
  app.post('/api/v1/routing/test', async (req, res) => {
    try {
      const testData = req.body;
      const result = await routerEngine.routeRequest(testData, { requestId: 'test-' + Date.now() });
      res.json({ 
        success: true,
        resolvedProvider: result.provider,
        resolvedModel: result.model,
        content: result.content,
        usage: result.usage
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Generate New API Key
  app.post('/api/v1/settings/api-key', (req, res) => {
    try {
      const { generateApiKey } = require('./middleware/auth');
      const newKey = generateApiKey();
      res.json({ success: true, apiKey: newKey });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Clear Cache
  app.post('/api/v1/cache/clear', (req, res) => {
    res.json({ success: true, message: 'Cache geleert' });
  });
  
  // Get Settings
  app.get('/api/v1/settings', (req, res) => {
    res.json({ 
      success: true,
      server: config.server,
      logging: config.logging
    });
  });
  
  // Update Server Settings
  app.put('/api/v1/settings/server', (req, res) => {
    try {
      const settings = req.body;
      config.server = { ...config.server, ...settings };
      res.json({ success: true, message: 'Server-Einstellungen gespeichert' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Update Logging Settings
  app.put('/api/v1/settings/logging', (req, res) => {
    try {
      const settings = req.body;
      config.logging = { ...config.logging, ...settings };
      
      // Logger neu initialisieren
      const { initLogger } = require('./middleware/logger');
      initLogger(config.logging);
      
      res.json({ success: true, message: 'Logging-Einstellungen gespeichert' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
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
