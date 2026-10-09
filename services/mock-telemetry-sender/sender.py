import logging
import os
import random
import threading
import time

import requests
from flask import Flask, jsonify

app = Flask(__name__)
logger = logging.getLogger("mock-telemetry-sender")
logging.basicConfig(level=logging.INFO)


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.get("/work")
def work():
    duration_ms = random.uniform(5, 750)
    failed = random.random() < 0.1
    time.sleep(duration_ms / 1000)
    if failed:
        logger.error("simulated request failed duration_ms=%.2f", duration_ms)
        return jsonify(status="error", duration_ms=duration_ms), 500
    logger.info("simulated request completed duration_ms=%.2f", duration_ms)
    return jsonify(status="ok", duration_ms=duration_ms)


def generate_requests():
    interval = float(os.getenv("SEND_INTERVAL_SECONDS", "5"))
    while True:
        try:
            requests.get("http://127.0.0.1:8000/work", timeout=5)
        except requests.RequestException:
            logger.exception("mock request failed")
        time.sleep(interval)


if __name__ == "__main__":
    threading.Thread(target=generate_requests, daemon=True).start()
    app.run(host="0.0.0.0", port=8000)
