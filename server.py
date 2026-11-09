#!/usr/bin/env python3
"""
JARVIS Web-App - Einfacher Entwicklungs-Webserver

Dieser Server startet die JARVIS-Web-App auf localhost:8000
Sie können die App im Browser öffnen: http://localhost:8000

Verwendung:
    python server.py
    oder
    python3 server.py
"""

from http.server import SimpleHTTPRequestHandler, HTTPServer
import socketserver
import sys
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class JarvisRequestHandler(SimpleHTTPRequestHandler):
    """Benutzerdefinierter Request-Handler für JARVIS"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def do_GET(self):
        """Behandelt GET-Anfragen"""
        # Setze den Pfad zur index.html für die Root-URL
        if self.path == '/' or self.path == '/index.html':
            self.path = '/index.html'
        
        # Standardverhalten aufrufen
        super().do_GET()
    
    def log_message(self, format, *args):
        """Loggt Nachrichten zur Konsole"""
        print(f"[JARVIS Server] {format % args}")

def start_server():
    """Startet den JARVIS-Webserver"""
    print("=" * 60)
    print("  JARVIS Web-App Server")
    print("=" * 60)
    print(f"  Server startet auf http://localhost:{PORT}")
    print(f"  Verzeichnis: {DIRECTORY}")
    print("=" * 60)
    print("  Drücken Sie STRG+C, um den Server zu beenden")
    print("=" * 60)
    print()
    
    try:
        # Server erstellen
        with HTTPServer(("localhost", PORT), JarvisRequestHandler) as httpd:
            print(f"JARVIS läuft auf http://localhost:{PORT}")
            print("Öffnen Sie den Browser und navigieren Sie zu http://localhost:8000")
            print()
            
            # Server starten
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer wird heruntergefahren...")
        sys.exit(0)
    except PermissionError:
        print(f"Fehler: Port {PORT} ist bereits belegt oder erfordert Admin-Rechte.")
        print("Versuchen Sie einen anderen Port oder führen Sie das Skript mit Admin-Rechten aus.")
        sys.exit(1)
    except Exception as e:
        print(f"Fehler beim Starten des Servers: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_server()
