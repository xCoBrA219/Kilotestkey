/**
 * Cloud Code Router - Haupt-Eintrittspunkt
 * 
 * Ein Open-Source API-Router für KI-Modelle
 */

const { startServer } = require('./server');
const { loadConfig } = require('./config/loader');
const { validateConfig } = require('./config/validator');
const logger = require('./middleware/logger');

// Hauptfunktion
async function main() {
  try {
    // Konfiguration laden
    logger.info('🚀 Cloud Code Router startet...');
    logger.info('📂 Konfiguration wird geladen...');
    
    const config = loadConfig();
    
    // Konfiguration validieren
    logger.info('✅ Konfiguration validieren...');
    const validation = validateConfig(config);
    
    if (!validation.valid) {
      logger.error('❌ Konfigurationsfehler:');
      validation.errors.forEach(err => logger.error(`  - ${err}`));
      process.exit(1);
    }
    
    logger.info('✅ Konfiguration erfolgreich geladen!');
    
    // Server starten
    const server = await startServer(config);
    
    const { port, host } = config.server;
    logger.info(`✅ Server läuft auf http://${host}:${port}`);
    logger.info('📡 API-Gateway: http://%s:%s/api/v1/chat/completions', host, port);
    logger.info('🔧 Management-UI: http://%s:%s/dashboard', host, port);
    
    // Graceful Shutdown
    process.on('SIGTERM', () => {
      logger.info('🛑 SIGTERM empfangen. Server wird heruntergefahren...');
      server.close(() => {
        logger.info('✅ Server erfolgreich beendet.');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      logger.info('🛑 SIGINT empfangen. Server wird heruntergefahren...');
      server.close(() => {
        logger.info('✅ Server erfolgreich beendet.');
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('❌ Fehler beim Starten des Servers:', error);
    process.exit(1);
  }
}

// Server starten
main();
