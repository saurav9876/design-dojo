#!/usr/bin/env bash
# Serve Design Dojo locally. No installs needed, only Python 3 (preinstalled on macOS).
cd "$(dirname "$0")" || exit 1
PORT="${1:-8765}"
echo "Design Dojo running at http://localhost:${PORT}  (Ctrl+C to stop)"
python3 -m http.server "$PORT"
