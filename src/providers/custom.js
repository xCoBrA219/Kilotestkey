/**
 * Cloud Code Router - Custom Model Provider
 * 
 * Implementierung für eigene Sprachmodelle über beliebige OpenAI-kompatible Endpunkte.
 * Ermöglicht das Einpflanzen eigener Sprachmodelle (z. B. lokale LLMs, vLLM, LM Studio, etc.).
 */

const axios = require('axios');
const { logger } = require('../middleware/logger');

/**
 * Custom Model Provider
 * 
 * Stellt die Verbindung zu einem benutzerdefinierten, OpenAI-kompatiblen
 * Sprachmodell-Endpunkt her.
 */
class CustomModelProvider {
  /**
   * Erstellt eine neue CustomModelProvider-Instanz
   * @param {Object} config - Provider-Konfiguration
   */
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://localhost:1234/v1';
    this.models = config.models || [];
    this.timeout = config.timeout || 120000;
    this.maxRetries = config.maxRetries || 3;
    this.headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
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
   * Führt eine Chat-Completion aus (OpenAI-kompatibles Format)
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
   * Führt eine Streaming-Chat-Completion aus (SSE)
   * @param {Object} params - Chat-Parameter mit stream: true
   * @param {Function} onChunk - Callback für jeden empfangenen Chunk
   * @returns {Promise<Object>} Finale Response
   */
  async streamChat(params, onChunk) {
    try {
      const response = await this.client.post('/chat/completions', {
        ...params,
        stream: true
      }, {
        responseType: 'stream',
        timeout: this.timeout
      });

      return new Promise((resolve, reject) => {
        let fullContent = '';
        let finishReason = 'stop';
        let model = params.model;

        response.data.on('data', (chunk) => {
          const text = chunk.toString();
          const lines = text.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') {
                continue;
              }
              try {
                const data = JSON.parse(dataStr);
                const delta = data.choices?.[0]?.delta;
                if (delta) {
                  if (delta.content) {
                    fullContent += delta.content;
                    if (onChunk) {
                      onChunk(delta.content);
                    }
                  }
                  if (data.choices[0].finish_reason) {
                    finishReason = data.choices[0].finish_reason;
                  }
                  if (data.model) {
                    model = data.model;
                  }
                }
              } catch (parseError) {
                // Ignore unparseable SSE lines
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve({
            provider: 'custom',
            model: model || params.model,
            content: fullContent,
            finish_reason: finishReason,
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            },
            raw: null
          });
        });

        response.data.on('error', (err) => {
          reject(this.formatError(err));
        });
      });
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * Formatiert die Provider-Response
   * @param {Object} data - Provider-Response
   * @returns {Object} Formatierte Response
   */
  formatResponse(data) {
    return {
      provider: 'custom',
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
      'Unbekannter Fehler bei Custom Model Provider'
    );

    formattedError.provider = 'custom';
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
      const fetched = response.data.data?.map(model => model.id) || [];
      // Zusammenfügen mit konfigurierten Modellen (Deduplizierung)
      const allModels = [...new Set([...fetched, ...this.models])];
      return allModels;
    } catch (error) {
      logger.warn('Konnte Modelle vom Custom Provider nicht abrufen, verwende konfigurierte Modelle');
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

module.exports = CustomModelProvider;
