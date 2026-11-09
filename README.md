# JARVIS - Persönlicher KI-Assistent (Web-App)

![JARVIS Logo](https://img.icons8.com/plasticine/200/000000/artificial-intelligence.png)

Ein einfacher, webbasierter KI-Assistent inspiriert von JARVIS aus Iron Man. Diese Web-App bietet eine Chat-Oberfläche mit verschiedenen Funktionen.

## 🚀 Schnellstart

### Vorraussetzungen
- Ein moderner Web-Browser (Chrome, Firefox, Edge, Safari)
- Python 3 (für den Entwicklungs-Server)

### Installation & Ausführung

1. **Repository klonen** (falls nicht bereits geschehen):
   ```bash
   git clone https://github.com/xCoBrA219/Kilotestkey.git
   cd Kilotestkey
   ```

2. **Webserver starten**:
   ```bash
   python server.py
   # oder
   python3 server.py
   ```

3. **Im Browser öffnen**:
   - Navigieren Sie zu: [http://localhost:8000](http://localhost:8000)

### Alternative: Direkt öffnen
Sie können die `index.html` Datei auch direkt in Ihrem Browser öffnen (ohne Server).

## 🎯 Funktionen

### Grundlegende Befehle
- **Uhrzeit abfragen**: "Was ist die Uhrzeit?" oder "Zeig mir die Uhrzeit"
- **Datum abfragen**: "Was ist das Datum?" oder "Welcher Tag ist heute?"
- **Wetter**: "Wie ist das Wetter?" (simuliert)
- **Witze**: "Erzähl mir einen Witz"
- **Hilfe**: "Hilfe" oder "Was kannst du?"
- **Identität**: "Wer bist du?"

### Schnellzugriff
Verwenden Sie die Schaltflächen in der Sidebar für schnellen Zugriff auf häufige Aktionen:
- 🕐 Uhrzeit
- 📅 Datum
- 🌤️ Wetter
- 😄 Witz

### Mathematische Berechnungen
JARVIS kann einfache mathematische Ausdrücke berechnen:
- "Was ist 5 + 3?"
- "Berechne 10 * 5"
- "100 / 4"

### Konversation
- **Begrüßung**: "Hallo", "Hi", "Guten Tag"
- **Verabschiedung**: "Tschüss", "Auf Wiedersehen"
- **Dank**: "Danke", "Vielen Dank"

## ⚙️ Einstellungen

### Dark Mode
- Schalten Sie zwischen Hell- und Dunkelmodus um
- Die Einstellung wird im Browser gespeichert

## 📁 Projektstruktur

```
Kilotestkey/
├── index.html      # Haupt-HTML-Datei
├── styles.css      # CSS-Stile
├── app.js          # JavaScript-Logik
├── server.py       # Entwicklungs-Webserver
└── README.md       # Diese Datei
```

## 🛠️ Entwicklung

### Dateien bearbeiten
- **HTML**: `index.html` - Struktur der Web-App
- **CSS**: `styles.css` - Design und Layout
- **JavaScript**: `app.js` - Logik und JARVIS-Funktionen

### Erweiterungen

#### Neue Befehle hinzufügen
1. Öffnen Sie `app.js`
2. Fügen Sie einen neuen Eintrag im `JARVIS_CONFIG.commands`-Objekt hinzu:
   ```javascript
   commands: {
       // ... bestehende Befehle
       meinBefehl: () => {
           return "Das ist meine Antwort!";
       }
   }
   ```

#### Design anpassen
1. Öffnen Sie `styles.css`
2. Ändern Sie die CSS-Variablen am Anfang der Datei:
   ```css
   :root {
       --primary-color: #4a6fa5;
       --background-color: #f5f7fa;
       /* ... */
   }
   ```

#### API-Integration
Um echte Wetterdaten oder andere externe APIs zu integrieren:
1. Fügen Sie in `app.js` eine neue Funktion hinzu, die die API aufruft
2. Ersetzen Sie die simulierte Wetterfunktion mit der echten API-Anfrage

## 📦 Deployment

### Auf GitHub Pages
1. Erstellen Sie einen `gh-pages` Branch
2. Pushen Sie die Dateien (index.html, styles.css, app.js) in diesen Branch
3. Aktivieren Sie GitHub Pages in den Repository-Einstellungen

### Auf einem Webserver
1. Laden Sie alle Dateien auf Ihren Webserver hoch
2. Stellen Sie sicher, dass `index.html` als Startdatei konfiguriert ist

## 🤝 Mitwirken

Beiträge sind willkommen! Bitte erstellen Sie einen Pull Request mit Ihren Änderungen.

## 📜 Lizenz

Dieses Projekt ist Open Source und kann frei verwendet, verändert und verteilt werden.

---

**JARVIS v1.0.0** | Entwickelt mit ❤️ für die Gemeinschaft
