#!/usr/bin/env bash
set -euo pipefail

export IMAGEM_TAG="$1"
cd "$(dirname "$0")/.."

docker compose pull
docker compose up -d --wait
curl -fsS --retry 5 --retry-delay 2 --retry-connrefused http://127.0.0.1:3000/ > /dev/null

echo "deploy de $IMAGEM_TAG ok"