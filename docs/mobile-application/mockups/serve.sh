#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-8766}"

if lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Port $PORT already in use."
else
  python3 -m http.server "$PORT" &
  SERVER_PID=$!
  trap 'kill $SERVER_PID 2>/dev/null' EXIT
  sleep 0.5
fi

URL="http://localhost:${PORT}/index.html"
echo ""
echo "  RoamView mobile mockups: $URL"
echo ""

if command -v open >/dev/null 2>&1; then
  open "$URL"
fi

wait
