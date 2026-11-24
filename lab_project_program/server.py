# -*- coding: utf-8 -*-
"""
实验项目介绍程序 · 本地服务
- 静态托管 index.html（H5 实验项目介绍程序）
- GET /api/v1/projects                     项目列表（支持 ?category= &q= 筛选）
- GET /api/v1/projects/{id}                项目详情
- CORS 支持（允许数字人/测试程序跨域调用）
仅用 Python 标准库，无第三方依赖。
运行：python server.py [--port 8077]
"""
import argparse
import json
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
PROJECTS_FILE = ROOT / "lab_projects.json"
INDEX_FILE = ROOT / "index.html"
API_PREFIX = "/api/v1"
DEFAULT_PORT = 8077

STATIC_EXTS = {".html", ".css", ".js", ".json", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".svg"}


class LabProjectAPI:
    """实验项目介绍程序核心：读取 lab_projects.json，提供列表/筛选/详情。"""

    def __init__(self, data):
        self.meta = data.get("meta", {})
        self.projects = data.get("projects", [])

    def list_projects(self, category=None, q=None):
        items = self.projects
        if category:
            items = [p for p in items if p.get("category") == category or p.get("category_name") == category]
        if q:
            # 多关键词：按空白切分，任意词命中即算匹配（满足"筛选需求原样交给程序"）
            terms = [t for t in q.lower().split() if t]
            items = [p for p in items if any(self._match(p, t) for t in terms)]
        return items

    def get_project(self, pid):
        for p in self.projects:
            if p.get("id") == pid:
                return p
        return None

    @staticmethod
    def _match(p, ql):
        blender = " ".join(filter(None, [
            p.get("id", ""), p.get("name", ""), p.get("name_en", ""),
            p.get("category", ""), p.get("category_name", ""),
            " ".join(p.get("devices", [])), " ".join(p.get("standards", [])),
            " ".join(p.get("tags", [])), " ".join(p.get("keywords", [])),
            p.get("main_function", ""), p.get("case_intro", ""), p.get("how_to", ""),
        ])).lower()
        return ql in blender

    @staticmethod
    def _public_view(p, detail=False):
        base = {
            "id": p["id"], "name": p["name"], "name_en": p["name_en"],
            "category": p["category"], "category_name": p["category_name"],
            "tags": p.get("tags", []),
        }
        if detail:
            base.update({
                "devices": p.get("devices", []),
                "standards": p.get("standards", []),
                "main_function": p.get("main_function", ""),
                "case_intro": p.get("case_intro", ""),
                "how_to": p.get("how_to", ""),
            })
        return base


class Handler(BaseHTTPRequestHandler):
    server_version = "LabProjectProgram/1.0"

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        qs = parse_qs(parsed.query)
        if path.startswith(API_PREFIX):
            self._handle_api(path, qs)
        else:
            self._serve_static(path)

    # ---------- API ----------
    def _handle_api(self, path, qs):
        api = self.server.api  # type: LabProjectAPI
        route = path[len(API_PREFIX):].strip("/")
        if not route:
            return self._json({"status": "ok", "meta": self.server.api.meta})
        if route == "projects":
            category = (qs.get("category") or [None])[0]
            q = (qs.get("q") or [None])[0]
            items = api.list_projects(category=category, q=q)
            body = {"status": "ok", "total": len(items),
                    "projects": [api._public_view(p) for p in items]}
            return self._json(body)
        m = re.fullmatch(r"projects/([A-Za-z0-9\-_]+)", route)
        if m:
            p = api.get_project(m.group(1))
            if p is None:
                return self._json_error("PROJECT_NOT_FOUND", f"未找到实验项目 {m.group(1)}", 404)
            return self._json({"status": "ok", "project": api._public_view(p, detail=True)})
        return self._json_error("NOT_FOUND", f"接口不存在: {path}", 404)

    # ---------- 静态 ----------
    def _serve_static(self, path):
        if path == "/" or path == "":
            path = "/index.html"
        rel = path.lstrip("/")
        target = (ROOT / rel).resolve()
        if not str(target).startswith(str(ROOT.resolve())) or target.suffix.lower() not in STATIC_EXTS or not target.is_file():
            return self._json_error("NOT_FOUND", "资源不存在", 404)
        ctype = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
        }.get(target.suffix.lower(), "application/octet-stream")
        data = target.read_bytes()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    # ---------- 通用 ----------
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-From")

    def _json(self, obj, code=200):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _json_error(self, code_str, msg, code):
        self._json({"status": "error", "error": {"code": code_str, "message": msg}}, code)

    def log_message(self, fmt, *args):
        line = f"[{self.log_date_time_string()}] {self.address_string()} {fmt % args}"
        print(line, flush=True)


def load_projects():
    if not PROJECTS_FILE.exists():
        raise SystemExit(f"缺少数据文件: {PROJECTS_FILE}")
    return json.loads(PROJECTS_FILE.read_text(encoding="utf-8"))


def build_server(port):
    data = load_projects()
    api = LabProjectAPI(data)
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.api = api
    return server


def main():
    parser = argparse.ArgumentParser(description="实验项目介绍程序本地服务")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()
    server = build_server(args.port)
    print(f"[实验项目介绍程序] http://127.0.0.1:{args.port}  （项目数: {len(server.api.projects)}）", flush=True)
    print(f"[实验项目介绍程序] API: GET {API_PREFIX}/projects?category=&q=  |  GET {API_PREFIX}/projects/{{id}}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()