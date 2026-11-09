/**
 * Cloud Code Router - Logger
 * 
 * Centralisiertes Logging-System mit Winston
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

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
    return winston.createLogger({
      level: 'silent',
      transports: [new winston.transports.Console()]
    });
  }
  
  // Transports
  const transportsList = [
    new winston.transports.Console({
      level,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          let logMessage = `[${timestamp}] ${level}: ${message}`;
          
          if (Object.keys(meta).length > 0) {
            logMessage += ` ${JSON.stringify(meta)}`;
          }
          
          return logMessage;
        })
      )
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
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.json()
        )
      })
    );
  }
  
  // Logger erstellen
  return winston.createLogger({
    level,
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
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  );
  
  // Globalen Logger für unhandled Promise Rejections
  process.on('unhandledRejection', (reason, promise) => {
    if (logger) {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    }
  });
  
  process.on('uncaughtException', (error) => {
    if (logger) {
      logger.error('Uncaught Exception:', error);
    }
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
  if (logger) {
    logger.info('Request gestartet', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
  
  // Response-Ende loggen
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (logger) {
      logger.info('Request abgeschlossen', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      });
    }
  });
  
  next();
}

// Standard-Logger initialisieren
if (!logger) {
  initLogger();
}

module.exports = {
  logger,
  initLogger,
  requestLogger
};
