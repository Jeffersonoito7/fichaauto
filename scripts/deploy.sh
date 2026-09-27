#!/usr/bin/env bash
# Deploy do Ficha Auto. Rodar NO SERVIDOR, dentro de /var/www/ficha-auto.
#
# Existe porque deploys manuais corromperam o .next duas vezes e o
# node_modules uma vez em 27/09/2026, derrubando a producao. A causa nao foi
# o disco (513 MB/s, zero erro de I/O): foi build concorrente com o
# `next start` do PM2 lendo a mesma pasta.
#
# As trincos deste script:
#   1. lock, para nunca existirem dois deploys ao mesmo tempo
#   2. app parado antes de tocar em .next
#   3. codigo de saida do build conferido DE VERDADE, sem pipe para tail
#   4. app so sobe se o build passou
#   5. verificacao HTTP no final, porque "pm2 online" nao prova nada

set -Eeuo pipefail

APP="ficha-auto"
DIR="/var/www/ficha-auto"
URL="https://fichaauto.com.br/login"
LOCK="/tmp/deploy-${APP}.lock"
LOG="/tmp/deploy-${APP}.log"

cd "$DIR"

# 1. Um deploy por vez. O lock some sozinho quando o processo termina.
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "ERRO: ja existe um deploy em andamento. Abortando."
  exit 1
fi

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH="$DIR/node_modules/.bin:$PATH"

echo "==> Atualizando codigo"
git pull --ff-only

echo "==> Parando o app (evita build concorrente com o next start)"
pm2 stop "$APP" >/dev/null 2>&1 || true

echo "==> Limpando cache de build"
rm -rf .next node_modules/.cache

echo "==> Instalando dependencias"
if ! npm ci --production=false > "$LOG" 2>&1; then
  echo "ERRO no npm ci. Ultimas linhas:"
  tail -20 "$LOG"
  pm2 start "$APP" >/dev/null 2>&1 || true
  exit 1
fi

echo "==> Buildando"
if ! npm run build > "$LOG" 2>&1; then
  echo "ERRO no build. O app NAO vai subir com build quebrado."
  echo "Ultimas linhas:"
  tail -25 "$LOG"
  exit 1
fi
echo "    build OK"

echo "==> Subindo o app"
pm2 start "$APP" >/dev/null 2>&1 || pm2 restart "$APP" >/dev/null 2>&1

echo "==> Verificando producao"
for i in $(seq 1 10); do
  sleep 3
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$URL" || echo "000")
  if [ "$CODE" = "200" ]; then
    echo "    $URL respondeu 200"
    echo "DEPLOY OK: $(date)"
    exit 0
  fi
  echo "    tentativa $i: HTTP $CODE"
done

echo "ERRO: o app subiu mas $URL nao respondeu 200."
pm2 logs "$APP" --err --lines 15 --nostream || true
exit 1
