/**
 * Cloud Code Router - DeepSeek Provider
 * 
 * Implementierung für DeepSeek-API
 */

const axios = require('axios');
const { logger } = require('../middleware/logger');

/**
 * DeepSeek Provider
 * 
 * Stellt die Verbindung zur DeepSeek-API her
 */
class DeepSeekProvider {
  /**
   * Erstellt eine neue DeepSeekProvider-Instanz
   * @param {Object} config - Provider-Konfiguration
   */
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com';
    this.models = config.models || ['deepseek-chat', 'deepseek-reasoner'];
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
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
      const response = await this.client.post('/chat/completions', params);
      return this.formatResponse(response.data);
    } catch (error) {
      throw this.formatError(error);
    }
  }
  
  /**
   * Formatiert die DeepSeek-Response
   * @param {Object} data - DeepSeek-Response
   * @returns {Object} Formatierte Response
   */
  formatResponse(data) {
    return {
      provider: 'deepseek',
      model: data.model,
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
      'Unbekannter Fehler bei DeepSeek-API'
    );
    
    formattedError.provider = 'deepseek';
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
    // DeepSeek hat keine öffentliche Modelle-Endpunkt
    return this.models;
  }
  
  /**
   * Prüft die Verfügbarkeit des Providers
   * @returns {Promise<boolean>} True, wenn verfügbar
   */
  async checkHealth() {
    try {
      // Einfache Anfrage, um Verfügbarkeit zu prüfen
      await this.client.get('/models', {
        timeout: 5000,
        validateStatus: () => true
      });
      return true;
    } catch (error) {
      // Wenn der Fehler nicht 401/403 ist (Auth-Fehler), dann ist der Service verfügbar
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

module.exports = DeepSeekProvider;
