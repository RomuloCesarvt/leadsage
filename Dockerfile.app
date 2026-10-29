# O LeadSage inteiro num serviço só (tela + servidor + motor de sites), para hospedagem grátis sem funções (Render).
# Construir a partir da RAIZ do repositório:  docker build -f Dockerfile.app .
FROM node:22-slim AS tela
WORKDIR /obra
COPY package.json ./
COPY frontend frontend
COPY conector conector
# o mesmo passo de montagem que a Vercel fazia (npm run build): compila a tela e junta o Conector para download
RUN cd frontend && npm ci --no-audit --no-fund && npm run build \
    && cd .. && mkdir -p frontend/dist/conector \
    && cp conector/leadsage-conector.mjs conector/package.json conector/LEIA-ME.md frontend/dist/conector/ \
    && mv frontend/dist /obra/dist

FROM python:3.12-slim
COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node
WORKDIR /srv
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend backend
COPY api api
COPY --from=tela /obra/dist dist
COPY render-start.sh render-start.sh
ENV LEADSAGE_DIST=/srv/dist \
    RENDER_SITE_URL=http://127.0.0.1:3001/api/render-site \
    PYTHONUNBUFFERED=1
WORKDIR /srv/backend
CMD ["sh", "/srv/render-start.sh"]
