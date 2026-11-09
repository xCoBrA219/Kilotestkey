/**
 * Cloud Code Router - OpenRouter Provider
 * 
 * Implementierung für OpenRouter-API
 */

const axios = require('axios');
const logger = require('../middleware/logger');

/**
 * OpenRouter Provider
 * 
 * Stellt die Verbindung zur OpenRouter-API her
 */
class OpenRouterProvider {
  /**
   * Erstellt eine neue OpenRouterProvider-Instanz
   * @param {Object} config - Provider-Konfiguration
   */
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.models = config.models || [
      'anthropic/claude-3-sonnet',
      'google/gemini-pro',
      'meta/llama-3',
      'openai/gpt-4'
    ];
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://github.com/xCoBrA219/Kilotestkey',
      'X-Title': 'Cloud Code Router',
      ...config.headers
    };
    
    // Axios-Instanz erstellen
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: this.headers
    });
  }
  
  /**
   * Führt eine Chat-Completion aus
   * @param {Object} params - Chat-Parameter
   * @returns {Promise<Object>} Response
   */
  async chat(params) {
    try {
      // Modell-Name extrahieren und anpassen für OpenRouter
      const model = params.model;
      
      // Falls das Modell nicht den Provider-Präfix hat, hinzufügen
      const openRouterModel = this.getOpenRouterModel(model);
      
      const response = await this.client.post('/chat/completions', {
        ...params,
        model: openRouterModel
      });
      
      return this.formatResponse(response.data, model);
    } catch (error) {
      throw this.formatError(error);
    }
  }
  
  /**
   * Konvertiert Modell-Name zu OpenRouter-Format
   * @param {string} model - Modell-Name
   * @returns {string} OpenRouter-Modell-Name
   */
  getOpenRouterModel(model) {
    // Falls bereits ein OpenRouter-Modell
    if (model.includes('/')) {
      return model;
    }
    
    // Standard-Zuordnung
    const modelMappings = {
      'gpt-4': 'openai/gpt-4',
      'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
      'claude-3-sonnet': 'anthropic/claude-3-sonnet',
      'claude-3-haiku': 'anthropic/claude-3-haiku',
      'claude-3-opus': 'anthropic/claude-3-opus',
      'gemini-pro': 'google/gemini-pro',
      'llama-3': 'meta/llama-3',
      'mistral': 'mistralai/mistral-7b-instruct'
    };
    
    return modelMappings[model] || model;
  }
  
  /**
   * Formatiert die OpenRouter-Response
   * @param {Object} data - OpenRouter-Response
   * @param {string} originalModel - Originales Modell
   * @returns {Object} Formatierte Response
   */
  formatResponse(data, originalModel) {
    return {
      provider: 'openrouter',
      model: originalModel || data.model,
      content: data.choices[0]?.message?.content || '',
      finish_reason: data.choices[0]?.finish_reason || 'stop',
      usage: data.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      },
      raw: data
    };
  }
  
  /**
   * Formatiert Fehler
   * @param {Error} error - Fehler
   * @returns {Error} Formatierter Fehler
   */
  formatError(error) {
    const formattedError = new Error(
      error.response?.data?.error?.message || 
      error.message || 
      'Unbekannter Fehler bei OpenRouter-API'
    );
    
    formattedError.provider = 'openrouter';
    formattedError.statusCode = error.response?.status || 500;
    formattedError.code = error.response?.data?.error?.code || 'server_error';
    formattedError.type = error.response?.data?.error?.type || 'server_error';
    
    return formattedError;
  }
  
  /**
   * Gibt die verfügbaren Modelle zurück
   * @returns {Promise<Array>} Liste der Modelle
   */
  async getModels() {
    try {
      const response = await this.client.get('/models', {
        timeout: 10000
      });
      return response.data.data.map(model => model.id);
    } catch (error) {
      logger.warn('Konnte Modelle von OpenRouter nicht abrufen, verwende Standard-Modelle');
      return this.models;
    }
  }
  
  /**
   * Prüft die Verfügbarkeit des Providers
   * @returns {Promise<boolean>} True, wenn verfügbar
   */
  async checkHealth() {
    try {
      await this.client.get('/models', {
        timeout: 5000,
        validateStatus: () => true
      });
      return true;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return true;
      }
      return false;
    }
  }
  
  /**
   * Gibt die Provider-Konfiguration zurück
   * @returns {Object} Konfiguration
   */
  getConfig() {
    return {
      apiKey: this.apiKey ? '***' : undefined,
      baseUrl: this.baseUrl,
      models: this.models,
      timeout: this.timeout,
      maxRetries: this.maxRetries
    };
  }
}

module.exports = OpenRouterProvider;
