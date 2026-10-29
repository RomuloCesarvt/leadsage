#!/bin/sh
# Liga o motor de sites (Node, só na máquina) e o servidor do LeadSage (porta pública do Render).
node /srv/api/render-site-servidor.mjs &
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
