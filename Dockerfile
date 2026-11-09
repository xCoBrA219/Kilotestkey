# Cloud Code Router - Dockerfile

# Basis-Image
FROM node:20-alpine

# Arbeitsverzeichnis
WORKDIR /app

# Abhängigkeiten installieren
RUN apk add --no-cache python3 make g++

# Package.json und package-lock.json kopieren
COPY package*.json ./

# Abhängigkeiten installieren
RUN npm ci --only=production

# Quellcode kopieren
COPY src/ ./src/
COPY config.example.json ./config.example.json
COPY .env.example ./.env.example

# Verzeichnisse für Logs und Konfiguration erstellen
RUN mkdir -p logs config

# Standard-Konfiguration kopieren (wird überschrieben, wenn Volume gemounted wird)
COPY config.example.json config/config.json

# Port freigeben
EXPOSE 3000

# Health-Check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Standard-Befehl
CMD ["node", "src/index.js"]
