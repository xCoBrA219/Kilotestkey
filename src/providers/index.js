/**
 * Cloud Code Router - Provider-Manager
 * 
 * Verwaltet alle Provider und deren Konfigurationen
 */

const OpenAIProvider = require('./openai');
const AnthropicProvider = require('./anthropic');
const DeepSeekProvider = require('./deepseek');
const OpenRouterProvider = require('./openrouter');
const OllamaProvider = require('./ollama');
const CustomModelProvider = require('./custom');
const { logger } = require('../middleware/logger');

/**
 * Provider-Typen
 */
const PROVIDER_TYPES = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  deepseek: DeepSeekProvider,
  openrouter: OpenRouterProvider,
  ollama: OllamaProvider,
  custom: CustomModelProvider
};

/**
 * Standard-Provider-Konfigurationen
 */
const DEFAULT_PROVIDER_CONFIGS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
    enabled: true
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-sonnet', 'claude-3-haiku', 'claude-3-opus'],
    enabled: true
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    enabled: true
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['anthropic/claude-3-sonnet', 'google/gemini-pro', 'meta/llama-3'],
    enabled: true
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    models: ['llama3', 'mistral', 'phi3'],
    enabled: true
  },
  custom: {
    baseUrl: 'http://localhost:1234/v1',
    models: [],
    enabled: true
  }
};

/**
 * Provider-Manager
 * 
 * Verwaltet alle Provider-Instanzen und deren Lebenszyklus
 */
class ProviderManager {
  /**
   * Erstellt eine neue ProviderManager-Instanz
   * @param {Object} providersConfig - Provider-Konfigurationen
   */
  constructor(providersConfig = {}) {
    this.providers = {};
    this.config = providersConfig;
    this.initialized = false;
    
    this.init();
  }
  
  /**
   * Initialisiert alle Provider
   */
  init() {
    if (this.initialized) return;
    
    logger.info('🔌 Provider werden initialisiert...');
    
    // Für jeden Provider in der Konfiguration
    for (const [providerName, config] of Object.entries(this.config)) {
      try {
        // Standard-Konfiguration mergen
        const mergedConfig = {
          ...DEFAULT_PROVIDER_CONFIGS[providerName],
          ...config
        };
        
        // Provider-Klasse bestimmen
        const ProviderClass = PROVIDER_TYPES[providerName] || PROVIDER_TYPES.openai;
        
        // Provider-Instanz erstellen
        const provider = new ProviderClass(mergedConfig);
        
        // Provider speichern
        this.providers[providerName] = {
          instance: provider,
          config: mergedConfig,
          enabled: mergedConfig.enabled !== false
        };
        
        logger.info(`✅ Provider "${providerName}" initialisiert (${mergedConfig.models.length} Modelle)`);
      } catch (error) {
        logger.error(`❌ Fehler beim Initialisieren von Provider "${providerName}":`, error);
      }
    }
    
    this.initialized = true;
    logger.info(`✅ ${Object.keys(this.providers).length} Provider erfolgreich initialisiert`);
  }
  
  /**
   * Gibt einen Provider zurück
   * @param {string} providerName - Name des Providers
   * @returns {Object|null} Provider-Instanz oder null
   */
  getProvider(providerName) {
    const provider = this.providers[providerName];
    return provider && provider.enabled ? provider.instance : null;
  }
  
  /**
   * Gibt alle aktivierten Provider zurück
   * @returns {Object} Provider-Objekt
   */
  getEnabledProviders() {
    return Object.entries(this.providers)
      .filter(([_, p]) => p.enabled)
      .reduce((acc, [name, p]) => {
        acc[name] = p.instance;
        return acc;
      }, {});
  }
  
  /**
   * Gibt alle Provider-Namen zurück
   * @returns {Array<string>} Provider-Namen
   */
  getProviderNames() {
    return Object.keys(this.providers);
  }
  
  /**
   * Prüft, ob ein Provider verfügbar ist
   * @param {string} providerName - Name des Providers
   * @returns {Promise<boolean>} True, wenn verfügbar
   */
  async isProviderAvailable(providerName) {
    const provider = this.getProvider(providerName);
    if (!provider) return false;
    
    try {
      return await provider.checkHealth();
    } catch (error) {
      logger.warn(`⚠️ Provider "${providerName}" nicht verfügbar:`, error.message);
      return false;
    }
  }
  
  /**
   * Gibt den Status aller Provider zurück
   * @returns {Promise<Object>} Provider-Status
   */
  async getProviderStatus() {
    const status = {};
    
    for (const [name, provider] of Object.entries(this.providers)) {
      const available = provider.enabled ? await this.isProviderAvailable(name) : false;
      
      status[name] = {
        enabled: provider.enabled,
        available,
        baseUrl: provider.config.baseUrl,
        models: provider.config.models,
        hasApiKey: !!provider.config.apiKey
      };
    }
    
    return status;
  }
  
  /**
   * Gibt alle verfügbaren Modelle zurück
   * @returns {Promise<Array>} Liste aller Modelle
   */
  async getAllModels() {
    const models = [];
    
    for (const [providerName, provider] of Object.entries(this.providers)) {
      if (!provider.enabled) continue;
      
      try {
        const providerModels = await this.getProvider(providerName).getModels();
        models.push(...providerModels.map(model => ({
          id: `${providerName}:${model}`,
          provider: providerName,
          model: model
        })));
      } catch (error) {
        logger.warn(`⚠️ Konnte Modelle von Provider "${providerName}" nicht abrufen:`, error.message);
      }
    }
    
    return models;
  }
  
  /**
   * Fügt einen neuen Provider hinzu
   * @param {string} providerName - Name des Providers
   * @param {Object} config - Provider-Konfiguration
   */
  addProvider(providerName, config) {
    if (this.providers[providerName]) {
      throw new Error(`Provider "${providerName}" existiert bereits`);
    }
    
    const ProviderClass = PROVIDER_TYPES[providerName] || PROVIDER_TYPES.openai;
    const mergedConfig = {
      ...DEFAULT_PROVIDER_CONFIGS[providerName],
      ...config
    };
    
    const provider = new ProviderClass(mergedConfig);
    
    this.providers[providerName] = {
      instance: provider,
      config: mergedConfig,
      enabled: mergedConfig.enabled !== false
    };
    
    this.config[providerName] = mergedConfig;
    
    logger.info(`✅ Neuer Provider "${providerName}" hinzugefügt`);
  }
  
  /**
   * Entfernt einen Provider
   * @param {string} providerName - Name des Providers
   */
  removeProvider(providerName) {
    if (!this.providers[providerName]) {
      throw new Error(`Provider "${providerName}" existiert nicht`);
    }
    
    delete this.providers[providerName];
    delete this.config[providerName];
    
    logger.info(`❌ Provider "${providerName}" entfernt`);
  }
  
  /**
   * Aktiviert/Deaktiviert einen Provider
   * @param {string} providerName - Name des Providers
   * @param {boolean} enabled - Ob aktiviert
   */
  setProviderEnabled(providerName, enabled) {
    if (!this.providers[providerName]) {
      throw new Error(`Provider "${providerName}" existiert nicht`);
    }
    
    this.providers[providerName].enabled = enabled;
    this.config[providerName].enabled = enabled;
    
    logger.info(`🔄 Provider "${providerName}" ${enabled ? 'aktiviert' : 'deaktiviert'}`);
  }
}

module.exports = ProviderManager;
