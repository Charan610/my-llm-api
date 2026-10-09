#!/bin/bash
# start_minicpm.sh - Starts local MiniCPM inference server and Authenticated API Gateway
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/ollama.pid"
GATEWAY_PID_FILE="$DIR/gateway.pid"
LOG_FILE="$DIR/ollama.log"
GATEWAY_LOG_FILE="$DIR/gateway.log"

# Detect LAN IP
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

# 1. Start MiniCPM Inference Engine (Ollama)
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "MiniCPM inference engine is already running (PID: $(cat "$PID_FILE"))."
else
    echo "Starting MiniCPM Inference Engine..."
    export OLLAMA_HOST="0.0.0.0:11434"
    export OLLAMA_ORIGINS="*"
    export OLLAMA_FLASH_ATTENTION=1
    export OLLAMA_KEEP_ALIVE="15m"

    nohup /opt/homebrew/bin/ollama serve > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2
fi

# 2. Start Authenticated API Gateway (Port 8000)
if [ -f "$GATEWAY_PID_FILE" ] && kill -0 "$(cat "$GATEWAY_PID_FILE")" 2>/dev/null; then
    echo "API Gateway is already running (PID: $(cat "$GATEWAY_PID_FILE"))."
else
    echo "Starting Authenticated API Gateway on port 8000..."
    nohup /opt/homebrew/bin/python3 "$DIR/api_gateway.py" > "$GATEWAY_LOG_FILE" 2>&1 &
    echo $! > "$GATEWAY_PID_FILE"
    sleep 1
fi

echo "============================================================"
echo "✅ Universal MiniCPM AI Platform Ready!"
echo "Authenticated Base URL (Local):  http://127.0.0.1:8000/v1"
echo "Authenticated Base URL (LAN):    http://${LAN_IP}:8000/v1"
echo "Raw Engine URL:                  http://127.0.0.1:11434/v1"
echo "Master API Key:                  sk-app-dev-master-minicpm"
echo "============================================================"
