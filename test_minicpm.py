#!/usr/bin/env python3
"""
Test client for authenticated Universal MiniCPM API Gateway.
Supports custom Base URL and API Key verification.
Uses Python standard library only (zero external pip packages).
"""

import sys
import json
import urllib.request
import urllib.error

DEFAULT_BASE_URL = "http://127.0.0.1:8000/v1"
DEFAULT_KEY = "sk-app-dev-master-minicpm"
MODEL_NAME = "minicpm5-2b"

def test_gateway(base_url=DEFAULT_BASE_URL, api_key=DEFAULT_KEY):
    base_url = base_url.rstrip("/")
    print(f"Connecting to: {base_url}")
    print(f"API Key:       {api_key[:11]}••••••••••••")
    print(f"Model:         {MODEL_NAME}\n")

    # 1. Test GET /v1/models
    print("1. Testing GET /v1/models...")
    models_req = urllib.request.Request(
        f"{base_url}/models",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    try:
        with urllib.request.urlopen(models_req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"   ✅ Models response: {data.get('data', [])}\n")
    except urllib.error.HTTPError as e:
        print(f"   ❌ HTTP Error {e.code}: {e.read().decode('utf-8')}\n")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}\n")

    # 2. Test POST /v1/chat/completions
    print("2. Testing POST /v1/chat/completions...")
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": "Hello, introduce yourself in one short sentence."}
        ],
        "temperature": 0.8,
        "max_tokens": 128
    }

    chat_req = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
    )

    try:
        with urllib.request.urlopen(chat_req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            choice = result.get("choices", [{}])[0]
            msg = choice.get("message", {}).get("content", "")
            print("   --- MiniCPM Response ---")
            print(f"   {msg.strip()}")
            print("   ------------------------")
            if "usage" in result:
                u = result["usage"]
                print(f"   Tokens: {u.get('prompt_tokens', 0)} prompt + {u.get('completion_tokens', 0)} completion = {u.get('total_tokens', 0)} total")
            print("   ✅ Chat completions verified successfully!")
    except urllib.error.HTTPError as e:
        print(f"   ❌ HTTP Error {e.code}: {e.read().decode('utf-8')}")
        sys.exit(1)
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BASE_URL
    key = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_KEY
    test_gateway(url, key)
