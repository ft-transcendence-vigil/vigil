import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

callbacks = []
lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/count":
            with lock:
                body = str(len(callbacks)).encode()
            self.send_response(200)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(404)

    def do_POST(self):
        if self.path != "/internal/alerts/trigger-evaluation":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length))
        required = {"notification_id", "signal_type", "stored_at", "services"}
        if (
            set(payload) != required
            or payload["signal_type"] not in {"logs", "metrics", "traces"}
            or not payload["services"]
        ):
            self.send_error(400)
            return
        with lock:
            callbacks.append(payload)
        self.send_response(204)
        self.end_headers()

    def log_message(self, format, *args):
        pass


ThreadingHTTPServer(("0.0.0.0", 8081), Handler).serve_forever()
