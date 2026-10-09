#!/usr/bin/env python3
"""
Test client for local MiniCPM OpenAI-compatible API.
Compatible with standard library (no pip packages required).
"""
import sys
import json
import urllib.request
import urllib.error

API_URL = "http://127.0.0.1:11434/v1/chat/completions"
MODEL_NAME = "minicpm5-2b"

def main():
    url = sys.argv[1] if len(sys.argv) > 1 else API_URL
    print(f"Connecting to: {url}")
    print(f"Model: {MODEL_NAME}")
    print("Prompt: 'Hello, introduce yourself.'\n")

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "user",
                "content": "Hello, introduce yourself."
            }
        ],
        "temperature": 0.8,
        "max_tokens": 512
    }

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
            content = result["choices"][0]["message"]["content"]
            print("--- MiniCPM Response ---")
            print(content)
            print("------------------------")
            if "usage" in result:
                usage = result["usage"]
                prompt_toks = usage.get("prompt_tokens", 0)
                comp_toks = usage.get("completion_tokens", 0)
                total_toks = usage.get("total_tokens", 0)
                print(f"\nToken usage: {prompt_toks} prompt + {comp_toks} completion = {total_toks} total")
    except urllib.error.URLError as e:
        print(f"Error connecting to API: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
