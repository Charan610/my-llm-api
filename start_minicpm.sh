#!/bin/bash
# start_minicpm.sh - Starts the local MiniCPM inference server
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/ollama.pid"
LOG_FILE="$DIR/ollama.log"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "MiniCPM server is already running (PID: $(cat "$PID_FILE"))."
    exit 0
fi

# Detect LAN IP
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

echo "Starting MiniCPM Inference Server..."
# OLLAMA_HOST=0.0.0.0:11434 allows connections from both localhost and local network devices
export OLLAMA_HOST="0.0.0.0:11434"
export OLLAMA_ORIGINS="*"
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_KEEP_ALIVE="15m"

nohup /opt/homebrew/bin/ollama serve > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

# Wait a moment for server to bind
sleep 2

if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "✅ MiniCPM Server started successfully (PID: $SERVER_PID)"
    echo "Local endpoint:  http://127.0.0.1:11434/v1/chat/completions"
    echo "LAN endpoint:    http://${LAN_IP}:11434/v1/chat/completions"
    echo "Logs:            $LOG_FILE"
else
    echo "❌ Failed to start server. Check $LOG_FILE for details."
    exit 1
fi
