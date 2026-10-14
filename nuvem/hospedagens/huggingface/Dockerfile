# Segundo servico da nuvem, em outra hospedagem gratuita (Hugging Face Spaces, tipo Docker).
# So precisa destes dois arquivos no Space (Dockerfile + README.md) e dois segredos: WORKER_SECRET e LEADSAGE_URL.
# Ele baixa o codigo atual do repositorio na hora de construir. Para atualizar: "Factory rebuild" no Space.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN git clone --depth 1 https://github.com/RomuloCesarvt/leadsage.git /tmp/src \
 && mkdir -p nuvem conector \
 && cp -r /tmp/src/nuvem/. nuvem/ && cp /tmp/src/conector/leadsage-conector.mjs conector/ \
 && rm -rf /tmp/src nuvem/hospedagens nuvem/node_modules
RUN cd nuvem && npm ci --omit=dev --no-audit --no-fund
ENV PORT=7860 DADOS_DIR=/tmp/dados NODE_ENV=production
EXPOSE 7860
CMD ["node", "nuvem/servidor.mjs"]
