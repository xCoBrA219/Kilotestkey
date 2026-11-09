# Cloud Code Router (CCR)

> **Ein Open-Source API-Router für KI-Modelle**
>
> Ein zentraler Kontrollpunkt für alle Ihre KI-Agenten und API-Anfragen. Verbinden Sie verschiedene Provider (OpenAI, Anthropic, DeepSeek, OpenRouter, etc.), verwalten Sie API-Schlüssel und routen Sie Anfragen intelligent.

---

## 🎯 **Ziel & Inspiration**

Inspiriert von [Claude Code Router](https://github.com/musistudio/claude-code-router), aber mit Fokus auf:
- **Einfache Einrichtung** - Keine komplexe Konfiguration nötig
- **Flexible Routing-Regeln** - Basierend auf Modell, Kosten, Verfügbarkeit
- **Mehrere Provider** - Unterstützt OpenAI, Anthropic, DeepSeek, OpenRouter, Mistral, etc.
- **Lokale & Cloud-Modelle** - Verbindung zu lokalen (Ollama) und Cloud-APIs
- **Observability** - Request-Logs, Token-Verbrauch, Kosten-Tracking

---

## ✨ **Features**

### 🔌 **Provider-Verwaltung**
- ✅ API-Schlüssel für mehrere Anbieter speichern
- ✅ Verschiedene Modelle pro Anbieter konfigurieren
- ✅ Connectivity-Checks und Status-Monitoring
- ✅ Credential-Pools für Lastverteilung

### 🚦 **Intelligentes Routing**
- ✅ Standard-Routing (z.B. alle Anfragen zu Provider A)
- ✅ Modell-basiertes Routing (z.B. "code-*" Modelle zu DeepSeek)
- ✅ Kosten-basiertes Routing (günstigste Option wählen)
- ✅ Fallback-Routing (bei Ausfall zum nächsten Provider)
- ✅ Bedingtes Routing (basierend auf Request-Header, Body, etc.)

### 📊 **Observability**
- ✅ Request/Response-Logs
- ✅ Token-Verbrauch pro Anfrage
- ✅ Geschätzte Kosten
- ✅ Latenz-Messung
- ✅ Fehler-Tracking

### 🔒 **Sicherheit**
- ✅ API-Authentifizierung für den Router selbst
- ✅ Environment-Variable-Unterstützung für API-Schlüssel
- ✅ Rate-Limiting
- ✅ Request-Validierung

### 🌐 **API-Gateway**
- ✅ REST API-Endpunkt (z.B. `http://localhost:3000/api/v1/chat`)
- ✅ Kompatibel mit OpenAI-Chat-API-Format
- ✅ Streaming-Unterstützung
- ✅ Batch-Processing

---

## 🚀 **Schnellstart**

### Vorraussetzungen
- Node.js 18+ (empfohlen: 20+)
- npm oder yarn

### Installation

```bash
# Repository klonen
git clone https://github.com/xCoBrA219/Kilotestkey.git
cd Kilotestkey

# Abhängigkeiten installieren
npm install

# Konfiguration erstellen
cp config.example.json config.json
# Bearbeiten Sie config.json mit Ihren API-Schlüsseln

# Server starten
npm run start

# Oder im Entwicklungsmodus
npm run dev
```

### Docker

```bash
# Image bauen
docker build -t cloud-code-router .

# Container starten
docker run -p 3000:3000 -v $(pwd)/config.json:/app/config.json cloud-code-router
```

---

## 📝 **Konfiguration**

### Grundlegende `config.json`

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "apiKey": "Ihr-Router-API-Schlüssel",
    "rateLimit": {
      "enabled": true,
      "requestsPerMinute": 100
    }
  },
  "providers": {
    "openai": {
      "apiKey": "${OPENAI_API_KEY}",
      "baseUrl": "https://api.openai.com/v1",
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "enabled": true
    },
    "anthropic": {
      "apiKey": "${ANTHROPIC_API_KEY}",
      "baseUrl": "https://api.anthropic.com/v1",
      "models": ["claude-3-sonnet", "claude-3-haiku"],
      "enabled": true
    },
    "deepseek": {
      "apiKey": "${DEEPSEEK_API_KEY}",
      "baseUrl": "https://api.deepseek.com",
      "models": ["deepseek-chat", "deepseek-reasoner"],
      "enabled": true
    },
    "openrouter": {
      "apiKey": "${OPENROUTER_API_KEY}",
      "baseUrl": "https://openrouter.ai/api/v1",
      "models": ["anthropic/claude-3-sonnet", "google/gemini-pro"],
      "enabled": true
    },
    "ollama": {
      "baseUrl": "http://localhost:11434",
      "models": ["llama3", "mistral"],
      "enabled": true
    }
  },
  "routing": {
    "default": "openai,gpt-4",
    "rules": [
      {
        "pattern": "code-*",
        "target": "deepseek,deepseek-chat"
      },
      {
        "pattern": "think",
        "target": "anthropic,claude-3-sonnet"
      }
    ],
    "fallback": [
      "openai,gpt-3.5-turbo",
      "anthropic,claude-3-haiku",
      "deepseek,deepseek-chat"
    ]
  },
  "logging": {
    "enabled": true,
    "level": "info",
    "file": "logs/router.log"
  }
}
```

### Environment-Variablen

Statt API-Schlüssel direkt in der config.json zu speichern, können Sie Environment-Variablen verwenden:

```bash
# .env Datei
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-..."
export DEEPSEEK_API_KEY="sk-..."
export OPENROUTER_API_KEY="sk-or-..."

# Oder direkt in der Shell
OPENAI_API_KEY="sk-..." ANTHROPIC_API_KEY="sk-..." node src/index.js
```

---

## 🎯 **Verwendungsbeispiele**

### 1. **Einfache Anfrage**

```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Ihr-Router-API-Schlüssel" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hallo, wie geht es dir?"}
    ]
  }'
```

### 2. **Routing zu spezifischem Provider**

```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer Ihr-Router-API-Schlüssel" \
  -H "X-Provider: deepseek" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {"role": "user", "content": "Erkläre mir Python-Dekoratoren."}
    ]
  }'
```

### 3. **Mit Claude Code verbinden**

In Ihrer Claude Code Konfiguration:

```json
{
  "baseUrl": "http://localhost:3000",
  "apiKey": "Ihr-Router-API-Schlüssel",
  "model": "gpt-4"
}
```

---

## 📁 **Projektstruktur**

```
cloud-code-router/
├── src/
│   ├── index.js              # Haupt-Eintrittspunkt
│   ├── server.js             # Express/Fastify Server
│   ├── config/
│   │   ├── loader.js          # Konfiguration laden
│   │   └── validator.js       # Konfiguration validieren
│   ├── providers/
│   │   ├── index.js           # Provider-Manager
│   │   ├── openai.js          # OpenAI-Provider
│   │   ├── anthropic.js       # Anthropic-Provider
│   │   ├── deepseek.js        # DeepSeek-Provider
│   │   ├── openrouter.js      # OpenRouter-Provider
│   │   └── ollama.js          # Ollama-Provider
│   ├── router/
│   │   ├── index.js           # Routing-Engine
│   │   ├── rules.js           # Routing-Regeln
│   │   └── fallback.js        # Fallback-Logik
│   ├── middleware/
│   │   ├── auth.js            # Authentifizierung
│   │   ├── rateLimit.js       # Rate-Limiting
│   │   └── logger.js          # Logging
│   └── utils/
│       ├── tokens.js          # Token-Zählung
│       ├── costs.js           # Kostenberechnung
│       └── errors.js          # Fehlerbehandlung
├── config.example.json        # Beispiel-Konfiguration
├── .env.example               # Beispiel-Environment-Variablen
├── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🛠️ **Entwicklung**

### Neue Provider hinzufügen

1. Erstellen Sie eine neue Datei in `src/providers/` (z.B. `mistral.js`)
2. Implementieren Sie die Provider-Klasse:

```javascript
class MistralProvider {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.models = config.models;
  }

  async chat(completionParams) {
    // Implementierung der Mistral-API-Aufrufe
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(completionParams)
    });
    return response.json();
  }

  async getModels() {
    // Modelle abrufen
    return this.models;
  }

  async checkHealth() {
    // Gesundheitscheck
    return true;
  }
}

module.exports = MistralProvider;
```

3. Registrieren Sie den Provider in `src/providers/index.js`

---

## 🤝 **Mitwirken**

Beiträge sind willkommen! Bitte:
1. Forken Sie das Repository
2. Erstellen Sie einen Feature-Branch
3. Committen Sie Ihre Änderungen
4. Pushen Sie zum Branch
5. Erstellen Sie einen Pull Request

---

## 📜 **Lizenz**

MIT License - Siehe [LICENSE](LICENSE) Datei.

---

## 📞 **Support**

- **Dokumentation**: [Wiki](https://github.com/xCoBrA219/Kilotestkey/wiki) (in Arbeit)
- **Issues**: [GitHub Issues](https://github.com/xCoBrA219/Kilotestkey/issues)
- **Discussions**: [GitHub Discussions](https://github.com/xCoBrA219/Kilotestkey/discussions)

---

**Cloud Code Router** | © 2024 | Ein Open-Source-Projekt
