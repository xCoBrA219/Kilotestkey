/**
 * Cloud Code Router - OpenAI Provider
 * 
 * Implementierung für OpenAI-API
 */

const axios = require('axios');
const logger = require('../middleware/logger');

/**
 * OpenAI Provider
 * 
 * Stellt die Verbindung zur OpenAI-API her
 */
class OpenAIProvider {
  /**
   * Erstellt eine neue OpenAIProvider-Instanz
   * @param {Object} config - Provider-Konfiguration
   */
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.models = config.models || ['gpt-4', 'gpt-3.5-turbo'];
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
   * Formatiert die OpenAI-Response
   * @param {Object} data - OpenAI-Response
   * @returns {Object} Formatierte Response
   */
  formatResponse(data) {
    return {
      provider: 'openai',
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
      'Unbekannter Fehler bei OpenAI-API'
    );
    
    formattedError.provider = 'openai';
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
      const response = await this.client.get('/models');
      return response.data.data.map(model => model.id);
    } catch (error) {
      logger.warn('Konnte Modelle von OpenAI nicht abrufen, verwende Standard-Modelle');
      return this.models;
    }
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
        // Auth-Fehler bedeutet, der Service ist erreichbar
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

module.exports = OpenAIProvider;
