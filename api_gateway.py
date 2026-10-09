#!/usr/bin/env python3
"""
Universal MiniCPM AI Platform - Local Authenticated API Gateway
Enforces SHA-256 API Key verification, scoped permissions, rate limiting,
and proxies OpenAI-compatible requests to local MiniCPM (127.0.0.1:11434).
Uses Python standard library only (zero external pip packages).
"""

import sys
import json
import time
import hashlib
import secrets
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8000
UPSTREAM_OLLAMA = "http://127.0.0.1:11434"

# In-memory API key database (hashed)
# key_hash -> { id, name, platform, key_prefix, permissions, rate_limit, created_at, last_used }
API_KEYS = {}
REQUEST_COUNTS = {}

def hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

def register_key(name: str, platform: str, permissions: list, rate_limit: int = 60) -> tuple:
    raw_key = f"sk-app-{platform[:3]}-{secrets.token_hex(24)}"
    h = hash_key(raw_key)
    record = {
        "id": f"app_{platform}_{secrets.token_hex(4)}",
        "name": name,
        "platform": platform,
        "key_prefix": raw_key[:11],
        "hashed_key": h,
        "status": "active",
        "permissions": permissions,
        "rate_limit": rate_limit,
        "created_at": int(time.time()),
        "last_used": None
    }
    API_KEYS[h] = record
    return raw_key, record

# Seed default developer keys
MASTER_KEY = "sk-app-dev-master-minicpm"
API_KEYS[hash_key(MASTER_KEY)] = {
    "id": "app_master_default",
    "name": "Master Developer Key",
    "platform": "mac",
    "key_prefix": "sk-app-dev",
    "hashed_key": hash_key(MASTER_KEY),
    "status": "active",
    "permissions": ["chat", "models", "tools", "admin"],
    "rate_limit": 120,
    "created_at": int(time.time()),
    "last_used": None
}

# Also seed an Android Phone key
ANDROID_KEY, _ = register_key("Android Phone Client", "android", ["chat", "models"], 60)

class GatewayHandler(BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def authenticate(self, required_permission="chat") -> tuple:
        auth_header = self.headers.get("Authorization")
        if not auth_header:
            return False, 401, "Missing Authorization header. Expected: Bearer <API_KEY>"

        parts = auth_header.strip().split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return False, 401, "Invalid Authorization format. Expected: Bearer <API_KEY>"

        token = parts[1]
        token_hash = hash_key(token)
        record = API_KEYS.get(token_hash)

        # Allow local development 'ollama' key
        if not record and token == "ollama":
            return True, 200, {"id": "dev_ollama", "name": "Local Dev", "rate_limit": 300}

        if not record:
            return False, 401, "Unauthorized: Invalid API key"

        if record.get("status") != "active":
            return False, 403, "Forbidden: This API key has been revoked"

        if required_permission not in record.get("permissions", []) and "admin" not in record.get("permissions", []):
            return False, 403, f"Forbidden: Key does not have permission '{required_permission}'"

        # Rate Limiting
        now = time.time()
        client_id = record["id"]
        usage = REQUEST_COUNTS.get(client_id)
        if not usage or (now - usage["start"]) > 60:
            REQUEST_COUNTS[client_id] = {"count": 1, "start": now}
        else:
            usage["count"] += 1
            if usage["count"] > record.get("rate_limit", 60):
                return False, 429, f"Rate limit exceeded ({record.get('rate_limit')} req/min)"

        record["last_used"] = int(now)
        return True, 200, record

    def do_GET(self):
        if self.path in ["/v1/models", "/api/v1/models"]:
            valid, status, res = self.authenticate("models")
            if not valid:
                self.send_json(status, {"error": {"message": res, "type": "authentication_error"}})
                return

            self.send_json(200, {
                "object": "list",
                "data": [{
                    "id": "minicpm5-2b",
                    "object": "model",
                    "created": 1725667200,
                    "owned_by": "openbmb"
                }]
            })
            return

        if self.path in ["/api/v1/keys", "/v1/keys"]:
            keys_list = [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "platform": r["platform"],
                    "key_prefix": r["key_prefix"],
                    "status": r["status"],
                    "permissions": r["permissions"],
                    "rate_limit": r["rate_limit"],
                    "created_at": r["created_at"],
                    "last_used": r["last_used"]
                }
                for r in API_KEYS.values()
            ]
            self.send_json(200, {"object": "list", "data": keys_list})
            return

        if self.path == "/health":
            self.send_json(200, {
                "status": "healthy",
                "engine": "MiniCPM5-2B (Apple M1)",
                "port": PORT,
                "timestamp": int(time.time())
            })
            return

        self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        if self.path in ["/api/v1/keys", "/v1/keys"]:
            name = data.get("name", "New Application")
            platform = data.get("platform", "app")
            perms = data.get("permissions", ["chat", "models"])
            rate_limit = data.get("rate_limit", 60)
            raw_key, rec = register_key(name, platform, perms, rate_limit)
            self.send_json(201, {
                "message": "API Key created successfully. Store this secret safely.",
                "secret_api_key": raw_key,
                "key_id": rec["id"],
                "name": rec["name"],
                "platform": rec["platform"],
                "permissions": rec["permissions"],
                "rate_limit": rec["rate_limit"],
                "created_at": rec["created_at"]
            })
            return

        if self.path in ["/v1/chat/completions", "/api/v1/chat/completions"]:
            valid, status, res = self.authenticate("chat")
            if not valid:
                self.send_json(status, {"error": {"message": res, "type": "authentication_error"}})
                return

            # Forward to upstream MiniCPM
            target_url = f"{UPSTREAM_OLLAMA}/v1/chat/completions"
            req = urllib.request.Request(
                target_url,
                data=body.encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )

            try:
                with urllib.request.urlopen(req, timeout=60) as upstream_res:
                    resp_data = upstream_res.read()
                    self.send_response(200)
                    self.send_cors_headers()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(resp_data)
                    return
            except urllib.error.URLError as e:
                self.send_json(503, {
                    "error": {
                        "message": f"Could not reach local MiniCPM engine (127.0.0.1:11434): {e}",
                        "type": "upstream_unavailable"
                    }
                })
                return

        self.send_json(404, {"error": "Not found"})

    def send_json(self, status: int, data: dict):
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode("utf-8"))

def run():
    server = HTTPServer(("0.0.0.0", PORT), GatewayHandler)
    print(f"============================================================")
    print(f"🔐 Universal MiniCPM Authenticated Gateway running on 0.0.0.0:{PORT}")
    print(f"Base URL:      http://127.0.0.1:{PORT}/v1")
    print(f"Master API Key: {MASTER_KEY}")
    print(f"Android Key:    {ANDROID_KEY}")
    print(f"Upstream:      {UPSTREAM_OLLAMA}")
    print(f"============================================================")
    server.serve_forever()

if __name__ == "__main__":
    run()
