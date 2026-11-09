/**
 * Cloud Code Router - Environment-Variablen Utilities
 * 
 * Hilfsfunktionen für Environment-Variablen
 */

const logger = require('../middleware/logger');

/**
 * Ersetzt Environment-Variablen in einem String
 * @param {string} str - String mit Variablen (z.B. "${VAR}")
 * @returns {string} String mit ersetzten Variablen
 */
function expandEnvVariablesInString(str) {
  if (!str || typeof str !== 'string') {
    return str;
  }
  
  // Pattern für ${VAR} oder $VAR
  const pattern = /\$\{([^}]+)\}|\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
  
  return str.replace(pattern, (match, varName1, varName2) => {
    const varName = varName1 || varName2;
    const value = process.env[varName];
    
    if (value === undefined) {
      logger.warn(`⚠️ Environment-Variable nicht gefunden: ${varName}`);
      return match; // Original zurückgeben, falls nicht gefunden
    }
    
    return value;
  });
}

/**
 * Ersetzt Environment-Variablen in einem Objekt (rekursiv)
 * @param {Object|Array|string} obj - Objekt mit Variablen
 * @returns {Object|Array|string} Objekt mit ersetzten Variablen
 */
function expandEnvVariables(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return expandEnvVariablesInString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => expandEnvVariables(item));
  }
  
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = expandEnvVariables(value);
    }
    return result;
  }
  
  return obj;
}

/**
 * Lädt Environment-Variablen aus einer .env-Datei
 * @param {string} path - Pfad zur .env-Datei
 */
function loadEnvFile(path = '.env') {
  const fs = require('fs');
  const dotenv = require('dotenv');
  
  if (fs.existsSync(path)) {
    const result = dotenv.config({ path });
    
    if (result.error) {
      logger.error(`❌ Fehler beim Laden der .env-Datei: ${result.error.message}`);
    } else {
      logger.info(`✅ .env-Datei geladen: ${path}`);
    }
  } else {
    logger.warn(`⚠️ .env-Datei nicht gefunden: ${path}`);
  }
}

/**
 * Prüft, ob eine Environment-Variable gesetzt ist
 * @param {string} name - Variablenname
 * @returns {boolean} True, wenn gesetzt
 */
function hasEnvVariable(name) {
  return process.env[name] !== undefined;
}

/**
 * Gibt den Wert einer Environment-Variable zurück
 * @param {string} name - Variablenname
 * @param {*} defaultValue - Standardwert
 * @returns {*} Wert oder Standardwert
 */
function getEnvVariable(name, defaultValue = undefined) {
  return process.env[name] !== undefined ? process.env[name] : defaultValue;
}

/**
 * Setzt eine Environment-Variable (nur für aktuelle Sitzung)
 * @param {string} name - Variablenname
 * @param {*} value - Wert
 */
function setEnvVariable(name, value) {
  process.env[name] = value;
}

/**
 * Gibt alle Environment-Variablen zurück, die mit einem Präfix beginnen
 * @param {string} prefix - Präfix
 * @returns {Object} Gefilterte Variablen
 */
function getEnvVariablesWithPrefix(prefix) {
  return Object.entries(process.env)
    .filter(([key]) => key.startsWith(prefix))
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
}

module.exports = {
  expandEnvVariables,
  expandEnvVariablesInString,
  loadEnvFile,
  hasEnvVariable,
  getEnvVariable,
  setEnvVariable,
  getEnvVariablesWithPrefix
};
