#!/usr/bin/env bash
# Instala (ou atualiza) o LeadSage Nuvem numa VM Linux (Ubuntu/Debian), como servico que liga sozinho.
# Uso, na VM:
#   WORKER_SECRET="o-mesmo-segredo-do-Render" bash instalar-vm.sh
# O WORKER_SECRET precisa ser IGUAL ao dos outros servicos e ao da Vercel: as sessoes do WhatsApp ficam cifradas com ele.
# Para atualizar depois: rode o mesmo comando de novo (o segredo anterior e mantido se voce omitir WORKER_SECRET).
set -euo pipefail

REPO="${REPO:-https://github.com/RomuloCesarvt/leadsage.git}"
SITE="${LEADSAGE_URL:-https://leadsageofc.vercel.app}"
PASTA=/opt/leadsage
DADOS=/var/lib/leadsage-nuvem
ENV_ARQ=/etc/leadsage-nuvem.env

if [ "$(id -u)" -ne 0 ]; then exec sudo -E bash "$0" "$@"; fi

if [ -z "${WORKER_SECRET:-}" ] && [ -f "$ENV_ARQ" ]; then
  WORKER_SECRET="$(grep '^WORKER_SECRET=' "$ENV_ARQ" | cut -d= -f2-)"
fi
if [ "${#WORKER_SECRET}" -lt 16 ]; then echo "Defina WORKER_SECRET (16+ caracteres)."; exit 1; fi

echo "== Pacotes"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl ca-certificates
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# VM de 1 GB: um arquivo de troca evita que a memoria acabe
if [ "$(free -m | awk '/^Mem:/{print $2}')" -lt 1500 ] && [ ! -f /swapfile ]; then
  echo "== Criando 1 GB de memoria de troca"
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "== Codigo"
if [ -d "$PASTA/.git" ]; then git -C "$PASTA" pull --ff-only; else git clone --depth 1 "$REPO" "$PASTA"; fi
(cd "$PASTA/nuvem" && npm ci --omit=dev --no-audit --no-fund)

echo "== Servico"
mkdir -p "$DADOS"
umask 077
# AUTH=banco (padrao): a sessao do WhatsApp fica no banco do LeadSage, cifrada com o WORKER_SECRET. Assim esta VM assume os numeros dos outros
# servicos (Render, Hugging Face) sem pedir QR de novo, e vice-versa. So use AUTH=disco se esta for a UNICA hospedagem.
printf 'WORKER_SECRET=%s\nLEADSAGE_URL=%s\nDADOS_DIR=%s\nPORT=8080\nAUTH=%s\n' "$WORKER_SECRET" "$SITE" "$DADOS" "${AUTH:-banco}" > "$ENV_ARQ"
cat > /etc/systemd/system/leadsage-nuvem.service <<UNIT
[Unit]
Description=LeadSage Nuvem (WhatsApp de cada usuario)
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=$ENV_ARQ
WorkingDirectory=$PASTA/nuvem
ExecStart=/usr/bin/node servidor.mjs
Restart=always
RestartSec=5
MemoryMax=900M

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable leadsage-nuvem >/dev/null
systemctl restart leadsage-nuvem
sleep 4
systemctl --no-pager --lines=8 status leadsage-nuvem || true
echo
echo "Pronto. Para ver o que ele esta fazendo:  journalctl -u leadsage-nuvem -f"
