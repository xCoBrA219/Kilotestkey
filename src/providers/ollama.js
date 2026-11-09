/**
 * Cloud Code Router - Ollama Provider
 * 
 * Implementierung für Ollama (lokale Modelle)
 */

const axios = require('axios');
const logger = require('../middleware/logger');

/**
 * Ollama Provider
 * 
 * Stellt die Verbindung zur Ollama-API her (lokal laufend)
 */
class OllamaProvider {
  /**
   * Erstellt eine neue OllamaProvider-Instanz
   * @param {Object} config - Provider-Konfiguration
   */
  constructor(config) {
    this.apiKey = config.apiKey; // Ollama benötigt normalerweise keinen API-Key
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.models = config.models || ['llama3', 'mistral', 'phi3', 'qwen2.5'];
    this.timeout = config.timeout || 120000; // Längeres Timeout für lokale Modelle
    this.maxRetries = config.maxRetries || 3;
    this.headers = {
      'Content-Type': 'application/json',
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
      // OpenAI-Format zu Ollama-Format konvertieren
      const ollamaParams = this.convertToOllamaFormat(params);
      
      const response = await this.client.post('/api/chat', ollamaParams);
      return this.formatResponse(response.data, params.model);
    } catch (error) {
      throw this.formatError(error);
    }
  }
  
  /**
   * Konvertiert OpenAI-Format zu Ollama-Format
   * @param {Object} openaiParams - OpenAI-Parameter
   * @returns {Object} Ollama-Parameter
   */
  convertToOllamaFormat(openaiParams) {
    const { messages, model, max_tokens, temperature, stream, ...rest } = openaiParams;
    
    // Nachrichten konvertieren
    const ollamaMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    return {
      model,
      messages: ollamaMessages,
      options: {
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 2048
      },
      stream: stream || false,
      ...rest
    };
  }
  
  /**
   * Formatiert die Ollama-Response
   * @param {Object} data - Ollama-Response
   * @param {string} model - Modell-Name
   * @returns {Object} Formatierte Response
   */
  formatResponse(data, model) {
    return {
      provider: 'ollama',
      model: model || data.model,
      content: data.message?.content || '',
      finish_reason: data.done ? 'stop' : 'unknown',
      usage: {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
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
      error.response?.data?.error || 
      error.message || 
      'Unbekannter Fehler bei Ollama-API'
    );
    
    formattedError.provider = 'ollama';
    formattedError.statusCode = error.response?.status || 500;
    formattedError.code = 'server_error';
    formattedError.type = 'server_error';
    
    return formattedError;
  }
  
  /**
   * Gibt die verfügbaren Modelle zurück
   * @returns {Promise<Array>} Liste der Modelle
   */
  async getModels() {
    try {
      const response = await this.client.get('/api/tags', {
        timeout: 10000
      });
      return response.data.models.map(model => model.name);
    } catch (error) {
      logger.warn('Konnte Modelle von Ollama nicht abrufen, verwende Standard-Modelle');
      return this.models;
    }
  }
  
  /**
   * Prüft die Verfügbarkeit des Providers
   * @returns {Promise<boolean>} True, wenn verfügbar
   */
  async checkHealth() {
    try {
      await this.client.get('/api/tags', {
        timeout: 5000,
        validateStatus: () => true
      });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Prüft, ob ein bestimmtes Modell verfügbar ist
   * @param {string} model - Modell-Name
   * @returns {Promise<boolean>} True, wenn verfügbar
   */
  async isModelAvailable(model) {
    try {
      const models = await this.getModels();
      return models.includes(model);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Gibt die Provider-Konfiguration zurück
   * @returns {Object} Konfiguration
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      models: this.models,
      timeout: this.timeout,
      maxRetries: this.maxRetries
    };
  }
}

module.exports = OllamaProvider;
