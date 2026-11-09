/**
 * Cloud Code Router - Main JavaScript
 * 
 * Gemeinsame Funktionen für die Web-UI
 */

// ===== Notification System =====

/**
 * Zeigt eine Benachrichtigung an
 * @param {string} message - Nachricht
 * @param {string} type - Typ (success, error, warning, info)
 * @param {number} duration - Dauer in ms (Standard: 3000)
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Bestehende Benachrichtigung entfernen
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Neue Benachrichtigung erstellen
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Styling
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 25px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    notification.style.zIndex = '1001';
    notification.style.animation = 'slideIn 0.3s ease';
    
    // Farben basierend auf Typ
    const colors = {
        success: { bg: '#2ecc71', text: '#ffffff' },
        error: { bg: '#e74c3c', text: '#ffffff' },
        warning: { bg: '#f39c12', text: '#ffffff' },
        info: { bg: '#4a6fa5', text: '#ffffff' }
    };
    
    notification.style.backgroundColor = colors[type]?.bg || '#4a6fa5';
    notification.style.color = colors[type]?.text || '#ffffff';
    
    // Zur DOM hinzufügen
    document.body.appendChild(notification);
    
    // Nach Dauer entfernen
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// ===== Sidebar Toggle =====

/**
 * Toggle Sidebar auf mobilen Geräten
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// Event Listener für Menu Toggle
const menuToggle = document.querySelector('.menu-toggle');
if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
}

// ===== Modal Functions =====

/**
 * Öffnet ein Modal
 * @param {string} modalId - ID des Modals
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

/**
 * Schließt ein Modal
 * @param {string} modalId - ID des Modals
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

// Schließt Modal beim Klicken außerhalb
window.addEventListener('click', (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            closeModal(modal.id);
        }
    });
});

// Schließt Modal mit Escape-Taste
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                closeModal(modal.id);
            }
        });
    }
});

// ===== Form Helpers =====

/**
 * Setzt ein Formular zurück
 * @param {string} formId - ID des Formulars
 */
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
}

/**
 * Validiert ein Formular
 * @param {string} formId - ID des Formulars
 * @returns {boolean} True, wenn gültig
 */
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = '#e74c3c';
            isValid = false;
        } else {
            field.style.borderColor = '';
        }
    });
    
    return isValid;
}

// ===== Table Helpers =====

/**
 * Sortiert eine Tabelle
 * @param {string} tableId - ID der Tabelle
 * @param {number} columnIndex - Index der Spalte
 */
function sortTable(tableId, columnIndex) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();
        return aValue.localeCompare(bValue);
    });
    
    // Sortierte Zeilen zurück in die Tabelle
    rows.forEach(row => tbody.appendChild(row));
}

// ===== Copy to Clipboard =====

/**
 * Kopiert Text in die Zwischenablage
 * @param {string} text - Text zum Kopieren
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('In Zwischenablage kopiert', 'success');
    } catch (error) {
        // Fallback für ältere Browser
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('In Zwischenablage kopiert', 'success');
    }
}

// ===== Format Helpers =====

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
 * Formatiert eine Zahl mit Tausendertrennzeichen
 * @param {number} num - Zahl
 * @returns {string} Formatierte Zahl
 */
function formatNumber(num) {
    if (num === undefined || num === null) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formatiert Bytes zu lesbarer Größe
 * @param {number} bytes - Bytes
 * @returns {string} Formatierte Größe
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== Local Storage Helpers =====

/**
 * Speichert einen Wert im Local Storage
 * @param {string} key - Schlüssel
 * @param {*} value - Wert
 */
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Fehler beim Speichern im Local Storage:', error);
    }
}

/**
 * Lädt einen Wert aus dem Local Storage
 * @param {string} key - Schlüssel
 * @returns {*} Wert oder null
 */
function loadFromLocalStorage(key) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error('Fehler beim Laden aus dem Local Storage:', error);
        return null;
    }
}

/**
 * Entfernt einen Wert aus dem Local Storage
 * @param {string} key - Schlüssel
 */
function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Fehler beim Entfernen aus dem Local Storage:', error);
    }
}

// ===== Confirmation Dialog =====

/**
 * Zeigt einen Bestätigungsdialog an
 * @param {string} message - Nachricht
 * @param {Function} onConfirm - Callback bei Bestätigung
 * @param {Function} onCancel - Callback bei Abbruch
 */
function confirmAction(message, onConfirm, onCancel) {
    if (confirm(message)) {
        onConfirm();
    } else if (onCancel) {
        onCancel();
    }
}

// ===== Loading Indicator =====

/**
 * Zeigt einen Lade-Indikator
 * @param {HTMLElement} element - Element, in dem der Indikator angezeigt werden soll
 */
function showLoading(element) {
    if (!element) return;
    
    element.innerHTML = '<span class="loading"></span>';
    element.disabled = true;
}

/**
 * Entfernt den Lade-Indikator
 * @param {HTMLElement} element - Element
 * @param {string} originalContent - Ursprünglicher Inhalt
 */
function hideLoading(element, originalContent = '') {
    if (!element) return;
    
    element.innerHTML = originalContent;
    element.disabled = false;
}

// ===== Auto-Refresh =====

/**
 * Startet Auto-Refresh für eine Funktion
 * @param {Function} callback - Funktion zum Aufrufen
 * @param {number} interval - Intervall in ms
 * @returns {number} Timer-ID
 */
function startAutoRefresh(callback, interval = 5000) {
    return setInterval(callback, interval);
}

/**
 * Stoppt Auto-Refresh
 * @param {number} timerId - Timer-ID
 */
function stopAutoRefresh(timerId) {
    clearInterval(timerId);
}

// ===== Export Functions =====

// Alle Funktionen für den globalen Zugriff verfügbar machen
window.showNotification = showNotification;
window.toggleSidebar = toggleSidebar;
window.openModal = openModal;
window.closeModal = closeModal;
window.resetForm = resetForm;
window.validateForm = validateForm;
window.sortTable = sortTable;
window.copyToClipboard = copyToClipboard;
window.formatDate = formatDate;
window.formatNumber = formatNumber;
window.formatBytes = formatBytes;
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;
window.removeFromLocalStorage = removeFromLocalStorage;
window.confirmAction = confirmAction;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.startAutoRefresh = startAutoRefresh;
window.stopAutoRefresh = stopAutoRefresh;

// CSS für Loading-Spinner hinzufügen
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #e0e0e0;
        border-radius: 50%;
        border-top-color: #4a6fa5;
        animation: spin 1s linear infinite;
    }
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== Initialize =====

// Seite laden
window.addEventListener('DOMContentLoaded', () => {
    // Sidebar auf mobilen Geräten standardmäßig verstecken
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.left = '-250px';
        }
    }
    
    // Alle Tooltips initialisieren
    const tooltips = document.querySelectorAll('[title]');
    tooltips.forEach(tooltip => {
        tooltip.addEventListener('mouseenter', () => {
            // Tooltip-Logik könnte hier hin
        });
    });
});

// ===== Console Message =====

console.log('%c🚀 Cloud Code Router', 'color: #4a6fa5; font-size: 24px; font-weight: bold;');
console.log('%cEin Open-Source API-Router für KI-Modelle', 'color: #7f8c8d; font-size: 14px;');
console.log('%chttps://github.com/xCoBrA219/Kilotestkey', 'color: #4a6fa5; font-size: 12px;');
