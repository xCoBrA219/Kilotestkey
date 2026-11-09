/**
 * Cloud Code Router - Konfigurations-Validator
 * 
 * Validiert die Konfiguration und prüft auf Fehler
 */

const Joi = require('joi');

/**
 * Schema für Server-Konfiguration
 */
const serverSchema = Joi.object({
  port: Joi.number().integer().min(1).max(65535).default(3000),
  host: Joi.string().ip().default('0.0.0.0'),
  apiKey: Joi.string().allow(null, '').optional(),
  corsOrigins: Joi.array().items(Joi.string()).default(['*']),
  rateLimit: Joi.object({
    enabled: Joi.boolean().default(false),
    requestsPerMinute: Joi.number().integer().min(1).default(100)
  }).default()
});

/**
 * Schema für Provider-Konfiguration
 */
const providerSchema = Joi.object({
  apiKey: Joi.string().allow('').optional(),
  baseUrl: Joi.string().uri().required(),
  models: Joi.array().items(Joi.string()).default([]),
  enabled: Joi.boolean().default(true),
  timeout: Joi.number().integer().min(1000).default(30000),
  maxRetries: Joi.number().integer().min(0).default(3),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional()
});

/**
 * Schema für Routing-Konfiguration
 */
const routingSchema = Joi.object({
  default: Joi.string().allow(null, '').optional(),
  rules: Joi.array().items(Joi.object({
    pattern: Joi.string().required(),
    target: Joi.string().required(),
    priority: Joi.number().integer().min(0).default(0)
  })).default([]),
  fallback: Joi.array().items(Joi.string()).default([])
});

/**
 * Schema für Logging-Konfiguration
 */
const loggingSchema = Joi.object({
  enabled: Joi.boolean().default(true),
  level: Joi.string().valid('error', 'warn', 'info', 'debug', 'silly').default('info'),
  file: Joi.string().allow(null, '').optional(),
  maxSize: Joi.string().default('10m'),
  maxFiles: Joi.number().integer().min(1).default(5)
});

/**
 * Schema für Föderation/Peer-Konfiguration
 */
const federationSchema = Joi.object({
  enabled: Joi.boolean().default(false),
  peers: Joi.array().items(Joi.string().uri()).default([])
});

/**
 * Haupt-Konfigurationsschema
 */
const configSchema = Joi.object({
  server: serverSchema.default(),
  providers: Joi.object().pattern(
    Joi.string(),
    providerSchema.required()
  ).default({}),
  routing: routingSchema.default(),
  logging: loggingSchema.default(),
  federation: federationSchema.default()
});

/**
 * Validiert die Konfiguration
 * @param {Object} config - Zu validierende Konfiguration
 * @returns {Object} Validierungsergebnis
 */
function validateConfig(config) {
  const result = configSchema.validate(config, {
    allowUnknown: false,
    stripUnknown: true
  });
  
  if (result.error) {
    const errors = result.error.details.map(detail => {
      const path = detail.path.join('.');
      const message = detail.message.replace(/[""]/g, '');
      return `${path}: ${message}`;
    });
    
    return {
      valid: false,
      errors,
      value: result.value
    };
  }
  
  // Zusätzliche Validierungen
  const additionalErrors = [];
  
  // Prüfen, ob mindestens ein Provider konfiguriert ist
  if (Object.keys(config.providers || {}).length === 0) {
    additionalErrors.push('Mindestens ein Provider muss konfiguriert sein');
  }
  
  // Prüfen, ob Standard-Routing oder Fallback konfiguriert ist
  if (!config.routing.default && config.routing.fallback.length === 0) {
    additionalErrors.push('Entweder default-Routing oder Fallback muss konfiguriert sein');
  }
  
  return {
    valid: additionalErrors.length === 0,
    errors: additionalErrors,
    value: result.value
  };
}

/**
 * Prüft, ob ein Provider gültig ist
 * @param {Object} providerConfig - Provider-Konfiguration
 * @returns {boolean} True, wenn gültig
 */
function isValidProvider(providerConfig) {
  const result = providerSchema.validate(providerConfig);
  return !result.error;
}

/**
 * Prüft, ob ein Routing-Regel gültig ist
 * @param {Object} rule - Routing-Regel
 * @returns {boolean} True, wenn gültig
 */
function isValidRoutingRule(rule) {
  const result = Joi.object({
    pattern: Joi.string().required(),
    target: Joi.string().required(),
    priority: Joi.number().integer().min(0).optional()
  }).validate(rule);
  return !result.error;
}

module.exports = {
  validateConfig,
  isValidProvider,
  isValidRoutingRule,
  configSchema
};
