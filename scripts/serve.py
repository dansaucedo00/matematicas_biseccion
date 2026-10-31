#!/usr/bin/env python3
"""Serve the compiled, self-contained application without npm or Internet access."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse

parser = argparse.ArgumentParser(description='Ejecutar Intervalo sin conexión a Internet.')
parser.add_argument('--port', type=int, default=4173)
parser.add_argument('--host', default='127.0.0.1')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent / 'dist'
if not (root / 'index.html').is_file():
    parser.error('No se encontró dist/index.html. Ejecuta npm ci y npm run build primero.')
SimpleHTTPRequestHandler.extensions_map.update({'.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml'})
try:
    with ThreadingHTTPServer((args.host, args.port), partial(SimpleHTTPRequestHandler, directory=str(root))) as server:
        print(f'Intervalo listo. Abre http://{args.host}:{args.port} en el navegador. Ctrl+C para detener.', flush=True)
        server.serve_forever()
except KeyboardInterrupt:
    pass
except OSError as error:
    parser.exit(1, f'No se pudo iniciar: {error}. Prueba otro puerto con --port 4174.\n')
