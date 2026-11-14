#!/usr/bin/env python3
"""Websign · lokaler Entwicklungsserver (nur Python-Standardbibliothek).

    python3 tools/serve.py [port]        Standard: 4173, nur auf 127.0.0.1

Liefert das Repository aus, ohne Cache. Zusätzlich nimmt er Bilder entgegen, die
tools/playground.html im Browser rendert (OG-Bild, Icons, später Standbilder):

    PUT /__save/assets/media/og/websign-og.jpg

Gespeichert wird ausschließlich unter assets/media/ und assets/img/, und nur mit
Bild-Endungen. Der Server läuft nicht auf GitHub Pages und gehört nicht zur Website.
"""
import gzip
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
GZIP_EXT = ('.html', '.css', '.js', '.mjs', '.json', '.svg', '.xml', '.txt', '.webmanifest', '.vtt', '.bin')
SAVE_DIRS = ('assets/media/', 'assets/img/')
SAVE_EXT = ('.jpg', '.png', '.webp', '.avif')
MAX_BYTES = 8 * 1024 * 1024


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
        '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp',
        '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
        '.vtt': 'text/vtt', '.bin': 'application/octet-stream',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        # Textdateien und das 3D-Modell gzip-komprimiert senden, so wie GitHub Pages es tut.
        # Damit stimmen lokal gemessene Übertragungsgrößen und Ladezeiten mit der echten Seite überein.
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            path = os.path.join(path, 'index.html')
        ext = os.path.splitext(path)[1].lower()
        if ext in GZIP_EXT and os.path.isfile(path) and 'gzip' in self.headers.get('Accept-Encoding', ''):
            with open(path, 'rb') as fh:
                body = gzip.compress(fh.read(), 6)
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_PUT(self):
        prefix = '/__save/'
        rel = self.path.split('?', 1)[0]
        if not rel.startswith(prefix):
            return self.send_error(404)
        rel = rel[len(prefix):]
        target = os.path.realpath(os.path.join(ROOT, rel))
        allowed = any(target.startswith(os.path.join(ROOT, d)) for d in SAVE_DIRS)
        length = int(self.headers.get('Content-Length') or 0)
        if not allowed or not rel.lower().endswith(SAVE_EXT) or not 0 < length <= MAX_BYTES:
            return self.send_error(403)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, 'wb') as fh:
            fh.write(self.rfile.read(length))
        self.send_response(204)
        self.end_headers()
        sys.stderr.write('gespeichert: %s (%d Bytes)\n' % (rel, length))


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    print('Websign lokal: http://127.0.0.1:%d/  (Platzhalter sichtbar mit ?dev)' % port)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
