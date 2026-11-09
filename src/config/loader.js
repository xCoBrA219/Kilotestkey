/**
 * Cloud Code Router - Konfigurations-Loader
 * 
 * Lädt und verarbeitet die Konfiguration aus verschiedenen Quellen
 */

const fs = require('fs');
const path = require('path');
const { expandEnvVariables } = require('../utils/env');

/**
 * Standard-Konfiguration
 */
const DEFAULT_CONFIG = {
  server: {
    port: 3000,
    host: '0.0.0.0',
    apiKey: null,
    corsOrigins: ['*'],
    rateLimit: {
      enabled: false,
      requestsPerMinute: 100
    }
  },
  providers: {},
  routing: {
    default: null,
    rules: [],
    fallback: []
  },
  logging: {
    enabled: true,
    level: 'info',
    file: 'logs/router.log'
  }
};

/**
 * Lädt die Konfiguration aus einer Datei
 * @param {string} configPath - Pfad zur Konfigurationsdatei
 * @returns {Object} Konfiguration
 */
function loadConfigFromFile(configPath) {
  try {
    // Prüfen, ob Datei existiert
    if (!fs.existsSync(configPath)) {
      return null;
    }
    
    // Datei einlesen
    const fileContent = fs.readFileSync(configPath, 'utf8');
    
    // JSON parsen
    const config = JSON.parse(fileContent);
    
    return config;
  } catch (error) {
    console.error(`Fehler beim Laden der Konfiguration aus ${configPath}:`, error);
    return null;
  }
}

/**
 * Lädt die Konfiguration
 * @param {string} configPath - Optional: Pfad zur Konfigurationsdatei
 * @returns {Object} Konfiguration
 */
function loadConfig(configPath) {
  // Standard-Pfade für Konfigurationsdatei
  const defaultPaths = [
    path.join(process.cwd(), 'config.json'),
    path.join(process.cwd(), 'config', 'config.json'),
    path.join(__dirname, '..', '..', 'config.json')
  ];
  
  // Pfad bestimmen
  const targetPath = configPath || defaultPaths.find(p => fs.existsSync(p));
  
  // Konfiguration aus Datei laden
  let fileConfig = null;
  if (targetPath) {
    fileConfig = loadConfigFromFile(targetPath);
  }
  
  // Mit Standard-Konfiguration mergen
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig
  };
  
  // Environment-Variablen expandieren
  const expandedConfig = expandEnvVariables(mergedConfig);
  
  return expandedConfig;
}

/**
 * Speichert die Konfiguration in eine Datei
 * @param {Object} config - Konfiguration
 * @param {string} configPath - Pfad zur Konfigurationsdatei
 */
function saveConfig(config, configPath) {
  try {
    const dir = path.dirname(configPath);
    
    // Verzeichnis erstellen, falls nicht vorhanden
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Konfiguration als JSON speichern (pretty print)
    const configString = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, configString, 'utf8');
    
    console.log(`Konfiguration erfolgreich in ${configPath} gespeichert.`);
  } catch (error) {
    console.error(`Fehler beim Speichern der Konfiguration:`, error);
    throw error;
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  DEFAULT_CONFIG
};
