# Construir a partir da RAIZ do repositorio:  docker build -f nuvem/Dockerfile .
FROM node:22-slim
WORKDIR /app
COPY nuvem/package.json nuvem/package-lock.json nuvem/
RUN cd nuvem && npm ci --omit=dev --no-audit --no-fund
COPY nuvem nuvem
COPY conector/leadsage-conector.mjs conector/
ENV DADOS_DIR=/dados PORT=8080 NODE_ENV=production
CMD ["node", "nuvem/servidor.mjs"]
