# -*- coding: utf-8 -*-
"""小联数字人本地服务：静态页面 + /api/chat 对话路由。"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "engine"))
from persona_engine import PersonaEngine  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RES_DIR = getattr(sys, "_MEIPASS", BASE_DIR)
FROZEN = bool(getattr(sys, "frozen", False))
WEB_DIR = os.path.join(RES_DIR, "web")
TEARDOWN_DIR = (os.path.join(RES_DIR, "teardown") if FROZEN
                else os.path.join(os.path.dirname(BASE_DIR), "_work", "teardown-out", "dist"))
ENGINE = PersonaEngine()

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".moc": "application/octet-stream",
    ".mtn": "application/octet-stream",
    ".moc3": "application/octet-stream",
    ".exp3": "application/json; charset=utf-8",
}
mimetypes.add_type("text/javascript", ".js")


class Handler(BaseHTTPRequestHandler):
    server_version = "LabPersona/1.0"

    def log_message(self, fmt, *args):  # noqa: A003
        print(f"[web] {self.address_string()} {fmt % args}", flush=True)

    def _send(self, code, body: bytes, ctype="application/json; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, code=200):
        self._send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"))

    def do_GET(self):  # noqa: N802
        path = urlparse(self.path).path
        if path == "/api/health":
            info = ENGINE.stats()
            info.update({"ok": True, "persona": ENGINE.persona.get("name", "小联"),
                         "city": ENGINE.store.get("city", "")})
            return self._json(info)
        if path == "/api/persona":
            return self._json({"persona": ENGINE.persona, "store": ENGINE.store})
        if path == "/api/page":
            qs = parse_qs(urlparse(self.path).query)
            page = (qs.get("path") or [""])[0]
            lang = (qs.get("lang") or ["zh"])[0].lower()
            lang = "en" if lang.startswith("en") else "zh"
            entry = ENGINE.find_by_page(page, lang)
            if not entry:
                return self._json({"found": False}, 404)
            return self._json({
                "found": True,
                "answer": entry["answer"],
                "source": "kb",
                "kb": entry["kb"],
                "lang": entry.get("lang", lang),
                "entry_id": entry["id"],
                "intent": entry["intent"],
                "category": entry["category"],
                "related_page": entry["related_page"],
                "latency_ms": 0,
            })
        if path == "/":
            path = "/index.html"
        if path.startswith("/teardown/"):
            return self._file(TEARDOWN_DIR, path[len("/teardown/"):])
        return self._file(WEB_DIR, path.lstrip("/"))

    def do_POST(self):  # noqa: N802
        path = urlparse(self.path).path
        if path not in ("/api/chat", "/api/reset"):
            return self._json({"error": "not found"}, 404)
        try:
            length = int(self.headers.get("Content-Length") or 0)
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except Exception:  # noqa: BLE001
            return self._json({"error": "invalid json"}, 400)
        if path == "/api/reset":
            sid = str(payload.get("session_id") or "default")
            ENGINE.sessions.pop(sid, None)
            return self._json({"ok": True})
        message = str(payload.get("message") or "").strip()
        if not message:
            return self._json({"error": "empty message"}, 400)
        sid = str(payload.get("session_id") or "default")
        lang = str(payload.get("lang") or "zh").lower()
        lang = "en" if lang.startswith("en") else "zh"
        result = ENGINE.respond(message, session_id=sid, use_llm=bool(payload.get("use_llm", True)), lang=lang)
        result["question"] = message
        print(f"[chat] {sid} [{lang}] | {message[:40]} -> {result['source']} "
              f"{result.get('entry_id', '')} {result['latency_ms']}ms", flush=True)
        return self._json(result)

    def _file(self, root, rel_path):
        root = os.path.realpath(root)
        target = os.path.realpath(os.path.join(root, rel_path.replace("/", os.sep)))
        if not target.startswith(root + os.sep) and target != root:
            return self._send(403, b"forbidden", "text/plain; charset=utf-8")
        if not os.path.isfile(target):
            return self._send(404, b"not found", "text/plain; charset=utf-8")
        ext = os.path.splitext(target)[1].lower()
        ctype = MIME.get(ext) or mimetypes.guess_type(target)[0] or "application/octet-stream"
        with open(target, "rb") as f:
            body = f.read()
        self._send(200, body, ctype)


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass
    ap = argparse.ArgumentParser(description="小联数字人本地服务")
    ap.add_argument("--port", type=int, default=int(os.environ.get("LAB_PORT", "8090")))
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--open", action="store_true", help="启动后自动打开浏览器")
    args = ap.parse_args()

    srv = None
    port = args.port
    for p in range(args.port, args.port + 11):
        try:
            srv = ThreadingHTTPServer((args.host, p), Handler)
            port = p
            break
        except OSError:
            continue
    if srv is None:
        print(f"[error] 端口 {args.port}-{args.port + 10} 均被占用，无法启动", flush=True)
        return 1
    stats = ENGINE.stats()
    print(f"[kb] {stats['counts']} total={stats['total']} dir={stats['kb_dir']}", flush=True)
    print(f"[llm] model={stats['model']} @ {stats['api']} (config: {stats['config_path']})", flush=True)
    url = f"http://{args.host}:{port}"
    print(f"[ready] {url}", flush=True)
    if args.open:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n[stop]", flush=True)


if __name__ == "__main__":
    main()
