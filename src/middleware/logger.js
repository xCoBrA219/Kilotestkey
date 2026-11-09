/**
 * Cloud Code Router - Logger
 * 
 * Centralisiertes Logging-System
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const { format, transports, createLogger } = winston;

// Logger-Instanz
let logger;

/**
 * Erstellt einen neuen Logger
 * @param {Object} config - Logger-Konfiguration
 * @returns {Object} Winston-Logger
 */
function createAppLogger(config = {}) {
  const {
    enabled = true,
    level = 'info',
    file = null,
    maxSize = '10m',
    maxFiles = 5
  } = config;
  
  if (!enabled) {
    return createLogger({
      level: 'silent',
      transports: [new transports.Console()]
    });
  }
  
  // Formatierung
  const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  );
  
  const consoleFormat = format.combine(
    format.colorize(),
    format.timestamp({ format: 'HH:mm:ss' }),
    format.printf(({ level, message, timestamp, stack, ...meta }) => {
      let logMessage = `[${timestamp}] ${level}: ${message}`;
      
      if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
      }
      
      if (stack) {
        logMessage += `\n${stack}`;
      }
      
      return logMessage;
    })
  );
  
  // Transports
  const transportsList = [
    new transports.Console({
      level,
      format: consoleFormat
    })
  ];
  
  // Datei-Transport, falls konfiguriert
  if (file) {
    const logDir = path.dirname(file);
    
    // Verzeichnis erstellen, falls nicht vorhanden
    const fs = require('fs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    transportsList.push(
      new DailyRotateFile({
        filename: file,
        datePattern: 'YYYY-MM-DD',
        maxSize,
        maxFiles,
        level,
        format: logFormat
      })
    );
  }
  
  // Logger erstellen
  return createLogger({
    level,
    format: logFormat,
    transports: transportsList,
    exitOnError: false
  });
}

/**
 * Initialisiert den Logger
 * @param {Object} config - Logger-Konfiguration
 */
function initLogger(config = {}) {
  logger = createAppLogger(config);
  
  // Globalen Logger für unhandled Exceptions
  logger.exceptions.handle(
    new transports.Console(),
    new transports.File({ filename: 'logs/exceptions.log' })
  );
  
  // Globalen Logger für unhandled Promise Rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

/**
 * Request-Logger Middleware
 * @returns {Function} Express-Middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Request-Start loggen
  logger.info('Request gestartet', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Response-Ende loggen
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request abgeschlossen', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
}

/**
 * Error-Logger
 * @param {Error} error - Fehler
 * @param {string} context - Kontext
 */
function errorLogger(error, context = '') {
  if (context) {
    logger.error(`${context}: ${error.message}`, {
      error: error.stack,
      ...error
    });
  } else {
    logger.error(error.message, {
      error: error.stack,
      ...error
    });
  }
}

// Standard-Logger initialisieren
if (!logger) {
  initLogger();
}

module.exports = {
  logger,
  initLogger,
  requestLogger,
  errorLogger,
  createAppLogger
};
