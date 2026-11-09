/**
 * Cloud Code Router - UI Helper Functions
 * 
 * Hilfsfunktionen für die Web-UI
 */

// Request-Logs-Speicher (wird später durch echte Logging ersetzt)
let requestLogs = [];

/**
 * Fügt einen Log-Eintrag hinzu
 * @param {Object} log - Log-Eintrag
 */
function addRequestLog(log) {
    requestLogs.unshift(log);
    
    // Maximal 1000 Logs behalten
    if (requestLogs.length > 1000) {
        requestLogs = requestLogs.slice(0, 1000);
    }
}

/**
 * Gibt alle Request-Logs zurück
 * @returns {Array} Logs
 */
function getRequestLogs() {
    return requestLogs;
}

/**
 * Löscht alle Request-Logs
 */
function clearRequestLogs() {
    requestLogs = [];
}

/**
 * Gibt Server-Statistiken zurück
 * @returns {Object} Statistiken
 */
function getServerStats() {
    const totalTokens = requestLogs.reduce((sum, log) => {
        return sum + (log.tokens || 0);
    }, 0);
    
    const durations = requestLogs
        .filter(log => log.duration)
        .map(log => log.duration);
    
    const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
        : 0;
    
    return {
        totalRequests: requestLogs.length,
        activeProviders: 0, // Wird später aktualisiert
        totalTokens,
        avgDuration,
        uptime: Math.round(process.uptime())
    };
}

/**
 * Gibt aktuelle Aktivität zurück
 * @returns {Array} Aktivität
 */
function getRecentActivity() {
    return requestLogs
        .slice(0, 10)
        .map(log => ({
            type: log.level || 'request',
            message: log.message || `Request zu ${log.model || 'unbekannt'}`,
            timestamp: new Date().toLocaleTimeString('de-DE')
        }));
}

/**
 * Fügt eine Aktivität hinzu
 * @param {Object} activity - Aktivität
 */
function addActivity(activity) {
    // Wird später implementiert
}

/**
 * Gibt Provider-Icon zurück
 * @param {string} providerName - Provider-Name
 * @returns {string} Font Awesome Icon-Klasse
 */
function getProviderIcon(providerName) {
    const icons = {
        openai: 'fa-robot',
        anthropic: 'fa-brain',
        claude: 'fa-brain',
        deepseek: 'fa-search',
        openrouter: 'fa-route',
        ollama: 'fa-cube',
        mistral: 'fa-wind',
        google: 'fa-google',
        meta: 'fa-facebook',
        local: 'fa-server'
    };
    
    return icons[providerName.toLowerCase()] || 'fa-server';
}

/**
 * Formatiert ein Datum
 * @param {Date|string} date - Datum
 * @returns {string} Formatiertes Datum
 */
function formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Formatiert Token-Zahl
 * @param {number} tokens - Token-Zahl
 * @returns {string} Formatierte Zahl
 */
function formatTokens(tokens) {
    if (tokens === undefined || tokens === null) return '';
    return tokens.toLocaleString('de-DE');
}

/**
 * Formatiert Dauer
 * @param {number} ms - Millisekunden
 * @returns {string} Formatierte Dauer
 */
function formatDuration(ms) {
    if (ms === undefined || ms === null) return '';
    return ms + 'ms';
}

/**
 * Erstellt eine Request-ID
 * @returns {string} Request-ID
 */
function generateRequestId() {
    return `ccr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
    addRequestLog,
    getRequestLogs,
    clearRequestLogs,
    getServerStats,
    getRecentActivity,
    addActivity,
    getProviderIcon,
    formatDate,
    formatTokens,
    formatDuration,
    generateRequestId
};
