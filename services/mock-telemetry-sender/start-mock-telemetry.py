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
    services = config["services"]
    required = set()

    def include_dependencies(name):
        if name in required:
            return
        required.add(name)
        for dependency in services[name].get("depends_on", {}):
            include_dependencies(dependency)

    for name in ("reverse-proxy", "mock-telemetry-sender"):
        include_dependencies(name)

    missing_builds = []
    missing_pulls = []
    with open(os.devnull, "w") as devnull:
        for name in sorted(required):
            service = services[name]
            image = service.get("image") or config["name"] + "-" + name
            if subprocess.call(["docker", "image", "inspect", image], stdout=devnull, stderr=devnull):
                if service.get("build"):
                    missing_builds.append(name)
                else:
                    missing_pulls.append(name)

    if missing_builds or missing_pulls:
        commands = []
        prefix = "docker compose --profile mock-telemetry-sender "
        if missing_builds:
            commands.append(prefix + "build " + " ".join(missing_builds))
        if missing_pulls:
            commands.append(prefix + "pull " + " ".join(missing_pulls))
        raise RuntimeError("Required images are missing. Run these commands from the repository root, then rerun this launcher:\n  " + "\n  ".join(commands))

    output("Starting the non-AI stack without rebuilding images.")
    subprocess.check_call(COMPOSE + ["up", "-d", "--no-build", "--pull", "never", "reverse-proxy", "mock-telemetry-sender"], cwd=ROOT)
    output("Telemetry endpoint: https://localhost/otlp")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        sys.stderr.write("Mock telemetry launch failed: " + str(error) + "\n")
        sys.exit(1)
