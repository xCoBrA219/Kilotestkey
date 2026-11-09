/**
 * Cloud Code Router - Router-Engine
 * 
 * Verwaltet das Routing von Anfragen zu den richtigen Providern
 */

const { logger } = require('../middleware/logger');

/**
 * Router-Engine
 * 
 * Entscheidet, welcher Provider für eine Anfrage verwendet wird
 */
class RouterEngine {
  /**
   * Erstellt eine neue RouterEngine-Instanz
   * @param {ProviderManager} providerManager - Provider-Manager
   * @param {Object} routingConfig - Routing-Konfiguration
   */
  constructor(providerManager, routingConfig = {}) {
    this.providerManager = providerManager;
    this.config = {
      default: routingConfig.default || null,
      rules: routingConfig.rules || [],
      fallback: routingConfig.fallback || []
    };
    
    // Routing-Regeln sortieren nach Priorität
    this.config.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
  
  /**
   * Routet eine Anfrage zum richtigen Provider
   * @param {Object} request - Anfrage-Parameter
   * @param {Object} options - Optionen (Headers, etc.)
   * @returns {Promise<Object>} Response vom Provider
   */
  async routeRequest(request, options = {}) {
    const { requestId, headers } = options;
    const { model, messages, ...rest } = request;
    
    logger.info(`[${requestId}] Routing-Anfrage für Modell: ${model}`);
    
    // 1. Prüfen, ob ein spezifischer Provider in den Headern angegeben ist
    const forcedProvider = headers['x-provider'] || headers['X-Provider'];
    if (forcedProvider) {
      logger.info(`[${requestId}] Erzwungener Provider: ${forcedProvider}`);
      return this.routeToProvider(forcedProvider, request, options);
    }
    
    // 2. Routing-Regeln anwenden
    const matchedRule = this.matchRoutingRule(request, options);
    if (matchedRule) {
      logger.info(`[${requestId}] Routing-Regel matched: ${matchedRule.pattern} -> ${matchedRule.target}`);
      return this.routeToTarget(matchedRule.target, request, options);
    }
    
    // 3. Standard-Routing verwenden
    if (this.config.default) {
      logger.info(`[${requestId}] Standard-Routing: ${this.config.default}`);
      return this.routeToTarget(this.config.default, request, options);
    }
    
    // 4. Fallback-Routing
    if (this.config.fallback.length > 0) {
      logger.info(`[${requestId}] Fallback-Routing wird verwendet`);
      return this.tryFallback(request, options);
    }
    
    // 5. Keine Routing-Option gefunden
    throw new Error('Keine Routing-Option verfügbar. Bitte konfigurieren Sie default oder fallback.');
  }
  
  /**
   * Findet eine passende Routing-Regel
   * @param {Object} request - Anfrage
   * @param {Object} options - Optionen
   * @returns {Object|null} Passende Regel oder null
   */
  matchRoutingRule(request, options) {
    const { model, messages } = request;
    const { headers } = options;
    
    for (const rule of this.config.rules) {
      // Pattern-Matching
      if (this.matchPattern(rule.pattern, model, messages, headers)) {
        return rule;
      }
    }
    
    return null;
  }
  
  /**
   * Prüft, ob ein Pattern matcht
   * @param {string} pattern - Pattern
   * @param {string} model - Modell
   * @param {Array} messages - Nachrichten
   * @param {Object} headers - Header
   * @returns {boolean} True, wenn Pattern matcht
   */
  matchPattern(pattern, model, messages, headers) {
    // Einfaches String-Matching
    if (pattern.includes('*')) {
      // Wildcard-Matching
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      return regex.test(model) || 
             messages.some(m => regex.test(m.content || '')) ||
             Object.values(headers || {}).some(h => regex.test(h || ''));
    }
    
    // Exaktes Matching
    return pattern === model ||
           messages.some(m => m.content?.includes(pattern)) ||
           Object.values(headers || {}).some(h => h?.includes(pattern));
  }
  
  /**
   * Routet zu einem spezifischen Provider
   * @param {string} providerName - Provider-Name
   * @param {Object} request - Anfrage
   * @param {Object} options - Optionen
   * @returns {Promise<Object>} Response
   */
  async routeToProvider(providerName, request, options) {
    const provider = this.providerManager.getProvider(providerName);
    
    if (!provider) {
      throw new Error(`Provider "${providerName}" nicht gefunden oder deaktiviert`);
    }
    
    // Prüfen, ob Provider verfügbar ist
    const available = await this.providerManager.isProviderAvailable(providerName);
    if (!available) {
      throw new Error(`Provider "${providerName}" ist nicht verfügbar`);
    }
    
    // Anfrage an Provider weiterleiten
    return provider.chat(request);
  }
  
  /**
   * Routet zu einem Target (Provider:Model oder nur Provider)
   * @param {string} target - Target (z.B. "openai:gpt-4" oder "anthropic")
   * @param {Object} request - Anfrage
   * @param {Object} options - Optionen
   * @returns {Promise<Object>} Response
   */
  async routeToTarget(target, request, options) {
    // Target parsen (Provider:Model oder nur Provider)
    const [providerName, model] = target.split(':');
    
    // Falls Modell im Target angegeben ist, im Request überschreiben
    const updatedRequest = model ? { ...request, model } : request;
    
    return this.routeToProvider(providerName, updatedRequest, options);
  }
  
  /**
   * Versucht Fallback-Routing
   * @param {Object} request - Anfrage
   * @param {Object} options - Optionen
   * @returns {Promise<Object>} Response
   */
  async tryFallback(request, options) {
    const errors = [];
    
    for (const fallbackTarget of this.config.fallback) {
      try {
        logger.info(`[${options.requestId}] Versuche Fallback: ${fallbackTarget}`);
        return await this.routeToTarget(fallbackTarget, request, options);
      } catch (error) {
        errors.push({
          target: fallbackTarget,
          error: error.message
        });
        logger.warn(`[${options.requestId}] Fallback fehlgeschlagen: ${fallbackTarget} - ${error.message}`);
      }
    }
    
    // Alle Fallbacks fehlgeschlagen
    const errorMessages = errors.map(e => `${e.target}: ${e.error}`).join('; ');
    throw new Error(`Alle Fallback-Optionen fehlgeschlagen: ${errorMessages}`);
  }
  
  /**
   * Löst das Routing auf, ohne die Anfrage auszuführen.
   * Gibt den aufgelösten Provider-Namen und das Modell zurück.
   * @param {Object} request - Anfrage-Parameter
   * @param {Object} options - Optionen (Headers, etc.)
   * @returns {Promise<{provider: string, model: string, target: string}>} Auflösungs-Ergebnis
   */
  async resolveRoute(request, options = {}) {
    const { requestId, headers } = options;
    const { model } = request;

    // 1. Erzwungener Provider in den Headern
    const forcedProvider = headers['x-provider'] || headers['X-Provider'];
    if (forcedProvider) {
      return { provider: forcedProvider, model, target: forcedProvider };
    }

    // 2. Routing-Regeln anwenden
    const matchedRule = this.matchRoutingRule(request, options);
    if (matchedRule) {
      const [providerName, ruleModel] = matchedRule.target.split(':');
      return { provider: providerName, model: ruleModel || model, target: matchedRule.target };
    }

    // 3. Standard-Routing
    if (this.config.default) {
      const [providerName, defaultModel] = this.config.default.split(':');
      return { provider: providerName, model: defaultModel || model, target: this.config.default };
    }

    // 4. Fallback-Routing (erster verfügbarer)
    if (this.config.fallback.length > 0) {
      const [providerName, fallbackModel] = this.config.fallback[0].split(':');
      return { provider: providerName, model: fallbackModel || model, target: this.config.fallback[0] };
    }

    throw new Error('Keine Routing-Option verfügbar.');
  }
  addRoutingRule(rule) {
    this.config.rules.push(rule);
    this.config.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    logger.info(`✅ Neue Routing-Regel hinzugefügt: ${rule.pattern} -> ${rule.target}`);
  }
  
  /**
   * Entfernt eine Routing-Regel
   * @param {string} pattern - Pattern der Regel
   */
  removeRoutingRule(pattern) {
    this.config.rules = this.config.rules.filter(rule => rule.pattern !== pattern);
    logger.info(`❌ Routing-Regel entfernt: ${pattern}`);
  }
  
  /**
   * Setzt das Standard-Routing
   * @param {string} target - Standard-Target
   */
  setDefaultRouting(target) {
    this.config.default = target;
    logger.info(`🔄 Standard-Routing gesetzt auf: ${target}`);
  }
  
  /**
   * Fügt eine Fallback-Option hinzu
   * @param {string} target - Fallback-Target
   */
  addFallback(target) {
    this.config.fallback.push(target);
    logger.info(`✅ Fallback hinzugefügt: ${target}`);
  }
  
  /**
   * Entfernt eine Fallback-Option
   * @param {string} target - Fallback-Target
   */
  removeFallback(target) {
    this.config.fallback = this.config.fallback.filter(t => t !== target);
    logger.info(`❌ Fallback entfernt: ${target}`);
  }
  
  /**
   * Gibt die aktuelle Routing-Konfiguration zurück
   * @returns {Object} Routing-Konfiguration
   */
  getConfig() {
    return this.config;
  }
}

module.exports = RouterEngine;
