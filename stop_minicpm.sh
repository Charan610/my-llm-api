#!/bin/bash
# stop_minicpm.sh - Stops the local MiniCPM inference server
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/ollama.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping MiniCPM server (PID: $PID)..."
        kill "$PID"
        # Wait up to 5 seconds
        for i in {1..5}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                break
            fi
            sleep 1
        done
        if kill -0 "$PID" 2>/dev/null; then
            echo "Force killing PID: $PID..."
            kill -9 "$PID" 2>/dev/null
        fi
        rm -f "$PID_FILE"
        echo "✅ MiniCPM server stopped."
        exit 0
    else
        echo "Server process not running. Cleaning up stale PID file."
        rm -f "$PID_FILE"
    fi
fi

# Fallback: check if any ollama serve process is running
PIDS=$(pgrep -f "ollama serve" || true)
if [ -n "$PIDS" ]; then
    echo "Stopping running Ollama processes: $PIDS"
    kill $PIDS
    echo "✅ MiniCPM server stopped."
else
    echo "No running MiniCPM server found."
fi
