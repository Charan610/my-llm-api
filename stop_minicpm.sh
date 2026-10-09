#!/bin/bash
# stop_minicpm.sh - Stops local MiniCPM inference server and Authenticated API Gateway
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/ollama.pid"
GATEWAY_PID_FILE="$DIR/gateway.pid"

# Stop Gateway
if [ -f "$GATEWAY_PID_FILE" ]; then
    PID=$(cat "$GATEWAY_PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping API Gateway (PID: $PID)..."
        kill "$PID" 2>/dev/null
    fi
    rm -f "$GATEWAY_PID_FILE"
fi

# Stop Inference Engine
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping MiniCPM inference server (PID: $PID)..."
        kill "$PID" 2>/dev/null
    fi
    rm -f "$PID_FILE"
fi

# Fallbacks
pkill -f "api_gateway.py" 2>/dev/null || true
pkill -f "ollama serve" 2>/dev/null || true

echo "✅ All MiniCPM services stopped."
