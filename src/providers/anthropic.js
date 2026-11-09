/**
 * Cloud Code Router - Anthropic Provider
 * 
 * Implementierung für Anthropic-API (Claude)
 */

const axios = require('axios');
const logger = require('../middleware/logger');

/**
 * Anthropic Provider
 * 
 * Stellt die Verbindung zur Anthropic-API her
 */
class AnthropicProvider {
  /**
   * Erstellt eine neue AnthropicProvider-Instanz
   * @param {Object} config - Provider-Konfiguration
   */
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    this.models = config.models || ['claude-3-sonnet', 'claude-3-haiku', 'claude-3-opus'];
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
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
   * @param {Object} params - Chat-Parameter (OpenAI-Format)
   * @returns {Promise<Object>} Response
   */
  async chat(params) {
    try {
      // OpenAI-Format zu Anthropic-Format konvertieren
      const anthropicParams = this.convertToAnthropicFormat(params);
      
      const response = await this.client.post('/messages', anthropicParams);
      return this.formatResponse(response.data, params.model);
    } catch (error) {
      throw this.formatError(error);
    }
  }
  
  /**
   * Konvertiert OpenAI-Format zu Anthropic-Format
   * @param {Object} openaiParams - OpenAI-Parameter
   * @returns {Object} Anthropic-Parameter
   */
  convertToAnthropicFormat(openaiParams) {
    const { messages, model, max_tokens, temperature, ...rest } = openaiParams;
    
    // Nachrichten konvertieren
    const anthropicMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    return {
      model,
      messages: anthropicMessages,
      max_tokens: max_tokens || 1024,
      temperature: temperature || 0.7,
      ...rest
    };
  }
  
  /**
   * Formatiert die Anthropic-Response
   * @param {Object} data - Anthropic-Response
   * @param {string} model - Modell-Name
   * @returns {Object} Formatierte Response
   */
  formatResponse(data, model) {
    return {
      provider: 'anthropic',
      model: model || data.model,
      content: data.content[0]?.text || '',
      finish_reason: data.stop_reason || 'stop',
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
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
      'Unbekannter Fehler bei Anthropic-API'
    );
    
    formattedError.provider = 'anthropic';
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
    // Anthropic hat keine öffentliche Modelle-Endpunkt
    // Wir verwenden die Standard-Modelle
    return this.models;
  }
  
  /**
   * Prüft die Verfügbarkeit des Providers
   * @returns {Promise<boolean>} True, wenn verfügbar
   */
  async checkHealth() {
    try {
      // Einfache Anfrage, um Verfügbarkeit zu prüfen
      await this.client.get('/messages', {
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

module.exports = AnthropicProvider;
