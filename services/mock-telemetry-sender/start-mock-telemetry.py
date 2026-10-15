#!/usr/bin/env python
"""Start the non-AI stack and host-network mock telemetry sender."""

from __future__ import print_function

import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
COMPOSE = ["docker", "compose", "--project-directory", ROOT, "--profile", "mock-telemetry-sender"]


def output(message):
    sys.stdout.write(message + "\n")
    sys.stdout.flush()


def main():
    config_output = subprocess.check_output(
        COMPOSE + ["config", "--format", "json"], cwd=ROOT)
    if not isinstance(config_output, str):
        config_output = config_output.decode("utf-8")
    config = json.loads(config_output)
    sender = config["services"]["mock-telemetry-sender"]
    image = sender.get("image") or config["name"] + "-mock-telemetry-sender"
    with open(os.devnull, "w") as devnull:
        if subprocess.call(["docker", "image", "inspect", image], stdout=devnull, stderr=devnull):
            raise RuntimeError("Mock sender image is missing. Build it first with docker compose --profile mock-telemetry-sender build mock-telemetry-sender")

    output("Starting the non-AI stack without rebuilding images.")
    subprocess.check_call(COMPOSE + ["up", "-d", "--no-build", "reverse-proxy", "mock-telemetry-sender"], cwd=ROOT)
    output("Telemetry endpoint: https://localhost/otlp")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        sys.stderr.write("Mock telemetry launch failed: " + str(error) + "\n")
        sys.exit(1)
