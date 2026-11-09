// JARVIS Web-App - Main JavaScript

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const themeToggle = document.getElementById('themeToggle');

// JARVIS Configuration
const JARVIS_CONFIG = {
    name: 'JARVIS',
    version: '1.0.0',
    personality: 'Hilfsbereit und effizient',
    responses: {
        greetings: [
            'Hallo! Wie kann ich Ihnen helfen?',
            'Guten Tag! Was kann ich für Sie tun?',
            'Servus! Ich bin bereit für Ihre Anfrage.',
            'Hallo! Ich bin JARVIS, Ihr persönlicher Assistent.'
        ],
        farewells: [
            'Auf Wiedersehen! Rufen Sie mich, wenn Sie mich brauchen.',
            'Tschüss! Ich bin immer für Sie da.',
            'Bis später!',
            'Machen Sie es gut!'
        ],
        thanks: [
            'Gern geschehen!',
            'Kein Problem!',
            'Immer gerne!',
            'Freut mich, helfen zu können!' 
        ],
        unknown: [
            'Tut mir leid, ich verstehe das nicht. Könnten Sie es anders formulieren?',
            'Ich bin nicht sicher, was Sie meinen. Können Sie mehr Details geben?',
            'Diese Anfrage kenne ich noch nicht. Versuchen Sie etwas Einfacheres.',
            'Ich lerne noch. Könnten Sie das bitte genauer erklären?'
        ]
    },
    commands: {
        zeit: () => {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            return `Die aktuelle Uhrzeit ist: **${hours}:${minutes}:${seconds}**`;
        },
        uhrzeit: () => {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            return `Es ist gerade **${hours}:${minutes}** Uhr.`;
        },
        datum: () => {
            const now = new Date();
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const year = now.getFullYear();
            const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
            const dayName = days[now.getDay()];
            const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                           'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
            const monthName = months[now.getMonth()];
            return `Heute ist **${dayName}, der ${day}. ${monthName} ${year}**.`;
        },
        wetter: () => {
            // Simuliertes Wetter (könnte später mit API verbunden werden)
            const weatherOptions = [
                'Die Wettervorhersage zeigt Sonne und blauen Himmel.',
                'Es sieht nach Regen aus. Nehmen Sie einen Regenschirm mit!',
                'Bewölkt, aber trocken. Angenehme Temperaturen.',
                'Starker Wind heute. Vorsicht beim Radfahren!',
                'Sonnig mit vereinzelten Wolken. Perfektes Wetter!' 
            ];
            return weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
        },
        witz: () => {
            const jokes = [
                'Warum können Geister so schlecht lügen? - Weil man direkt durch sie durchsieht!',
                'Was ist grün und steht vor der Tür? - Klopfsalat!',
                'Warum hat der Computer eine Brille? - Weil er zu viele Bytes hat!',
                'Was ist der Lieblingssnack von Programmierern? - Schoko-Loops!',
                'Warum tragen Programmierer keine Schuhe? - Weil sie lieber barfuß codieren!',
                'Was sagt ein Programmierer im Fitnessstudio? - "Ich muss meine Muskeln debuggen!"',
                'Treffen sich zwei Bytes. Sagt das eine: "Ich glaub, uns fehlt was..."',
                'Warum hat der Entwickler die Treppe genommen? - Weil der Aufzug nur bis Level 0 ging!' 
            ];
            return jokes[Math.floor(Math.random() * jokes.length)];
        },
        hilfe: () => {
            return `Ich kann Ihnen bei verschiedenen Dingen helfen. Versuchen Sie:

- **"Was ist die Uhrzeit?"** oder **"Zeig mir das Datum"**
- **"Wie ist das Wetter?"** 
- **"Erzähl mir einen Witz"**
- **"Wer bist du?"** oder **"Was kannst du?"**
- **"Hallo"** oder **"Tschüss"**

Sie können auch die Schaltflächen in der Sidebar verwenden.`;
        },
        'wer bist du': () => {
            return `Ich bin **JARVIS** (Just A Rather Very Intelligent System), Version ${JARVIS_CONFIG.version}. 
Ich bin Ihr persönlicher digitaler Assistent, hier um Ihnen bei verschiedenen Aufgaben zu helfen.`;
        },
        'was kannst du': () => {
            return `Ich kann:
- Die aktuelle Uhrzeit und das Datum anzeigen
- Wetterinformationen liefern (simuliert)
- Witze erzählen
- Auf Ihre Fragen antworten
- Einfache Berechnungen durchführen
- Und vieles mehr!

Fragen Sie einfach oder verwenden Sie die Aktionsschaltflächen.`;
        }
    }
};

// Initialize the app
function init() {
    loadTheme();
    addWelcomeMessage();
    setupEventListeners();
    userInput.focus();
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('jarvis-theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.checked = savedTheme === 'dark';
    }
}

// Toggle theme
function toggleTheme() {
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('jarvis-theme', newTheme);
}

// Add welcome message
function addWelcomeMessage() {
    const welcomeHTML = `
        <div class="message jarvis-message welcome-message">
            <h2>Willkommen bei JARVIS</h2>
            <p>Ich bin Ihr persönlicher digitaler Assistent.</p>
            <p>Wie kann ich Ihnen heute helfen?</p>
            <div class="suggestions">
                <button class="suggestion-btn" onclick="quickReply('Was ist die Uhrzeit?')">Uhrzeit</button>
                <button class="suggestion-btn" onclick="quickReply('Was ist das Datum?')">Datum</button>
                <button class="suggestion-btn" onclick="quickReply('Wie ist das Wetter?')">Wetter</button>
                <button class="suggestion-btn" onclick="quickReply('Erzähl mir einen Witz')">Witz</button>
            </div>
        </div>
    `;
    addMessage(welcomeHTML, 'jarvis');
}

// Setup event listeners
function setupEventListeners() {
    // Send message on button click
    sendButton.addEventListener('click', sendMessage);
    
    // Send message on Enter key
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Enable/disable send button based on input
    userInput.addEventListener('input', () => {
        sendButton.disabled = userInput.value.trim() === '';
    });
}

// Send message
function sendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;
    
    // Add user message
    addMessage(message, 'user');
    userInput.value = '';
    sendButton.disabled = true;
    userInput.focus();
    
    // Show typing indicator
    const typingIndicator = addTypingIndicator();
    
    // Simulate processing delay
    setTimeout(() => {
        removeTypingIndicator(typingIndicator);
        processMessage(message);
    }, 800 + Math.random() * 1000);
}

// Add message to chat
function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    
    if (type === 'user') {
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `<span class="timestamp">[${getCurrentTime()}]</span><span>${escapeHtml(content)}</span>`;
    } else if (type === 'jarvis') {
        messageDiv.className = 'message jarvis-message';
        // Format the content (replace **text** with <strong>text</strong>)
        const formattedContent = formatMessage(content);
        messageDiv.innerHTML = `<span class="timestamp">[JARVIS]</span><span>${formattedContent}</span>`;
    } else {
        messageDiv.className = 'message system-message';
        messageDiv.innerHTML = `<span class="timestamp">[System]</span><span>${escapeHtml(content)}</span>`;
    }
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
}

// Format message (bold, line breaks, etc.)
function formatMessage(text) {
    // Replace **text** with <strong>text</strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace newlines with <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Replace code blocks
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    
    return formatted;
}

// Add typing indicator
function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message jarvis-message typing-indicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    return typingDiv;
}

// Remove typing indicator
function removeTypingIndicator(element) {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

// Process user message
function processMessage(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Check for greetings
    if (isGreeting(lowerMessage)) {
        const response = JARVIS_CONFIG.responses.greetings[
            Math.floor(Math.random() * JARVIS_CONFIG.responses.greetings.length)
        ];
        addMessage(response, 'jarvis');
        return;
    }
    
    // Check for farewells
    if (isFarewell(lowerMessage)) {
        const response = JARVIS_CONFIG.responses.farewells[
            Math.floor(Math.random() * JARVIS_CONFIG.responses.farewells.length)
        ];
        addMessage(response, 'jarvis');
        return;
    }
    
    // Check for thanks
    if (isThanks(lowerMessage)) {
        const response = JARVIS_CONFIG.responses.thanks[
            Math.floor(Math.random() * JARVIS_CONFIG.responses.thanks.length)
        ];
        addMessage(response, 'jarvis');
        return;
    }
    
    // Check for commands
    for (const [command, handler] of Object.entries(JARVIS_CONFIG.commands)) {
        if (lowerMessage.includes(command)) {
            const response = handler();
            addMessage(response, 'jarvis');
            return;
        }
    }
    
    // Check for calculations
    if (isMathExpression(lowerMessage)) {
        try {
            // Sanitize the expression (only allow numbers and basic operators)
            const sanitized = lowerMessage.replace(/[^0-9+\-*/().x\s]/g, '');
            if (sanitized) {
                // Replace 'x' with '*' for multiplication
                const expression = sanitized.replace(/x/gi, '*');
                const result = eval(expression);
                addMessage(`Das Ergebnis von "${message}" ist: **${result}**`, 'jarvis');
                return;
            }
        } catch (e) {
            // Fall through to unknown response
        }
    }
    
    // Default response
    const response = JARVIS_CONFIG.responses.unknown[
        Math.floor(Math.random() * JARVIS_CONFIG.responses.unknown.length)
    ];
    addMessage(response, 'jarvis');
}

// Check if message is a greeting
function isGreeting(message) {
    const greetings = ['hallo', 'hi', 'hey', 'servus', 'guten tag', 'guten morgen', 'guten abend', 'moin'];
    return greetings.some(g => message.includes(g));
}

// Check if message is a farewell
function isFarewell(message) {
    const farewells = ['tschüss', 'auf wiedersehen', 'bye', 'ciao', 'bis später', 'bis dann', 'mach es gut'];
    return farewells.some(f => message.includes(f));
}

// Check if message is thanks
function isThanks(message) {
    const thanks = ['danke', 'vielen dank', 'thank you', 'thanks', 'merci', 'grazie'];
    return thanks.some(t => message.includes(t));
}

// Check if message is a math expression
function isMathExpression(message) {
    const mathPattern = /^[\d\s+\-*/().x]+$/;
    return mathPattern.test(message);
}

// Get current time for timestamp
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

// Scroll to bottom of chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Trigger action from sidebar
function triggerAction(action) {
    const actions = {
        zeit: 'Was ist die Uhrzeit?',
        datum: 'Was ist das Datum?',
        wetter: 'Wie ist das Wetter?',
        witz: 'Erzähl mir einen Witz'
    };
    
    if (actions[action]) {
        userInput.value = actions[action];
        sendMessage();
    }
}

// Quick reply from welcome message
function quickReply(message) {
    userInput.value = message;
    sendMessage();
}

// Initialize the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Make functions globally available for onclick handlers
window.triggerAction = triggerAction;
window.quickReply = quickReply;
