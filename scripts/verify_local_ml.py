"""Verify real HTTP synchronization with the example ML service and its failure path."""

import asyncio
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import httpx

ROOT = Path(__file__).resolve().parents[1]
env = {**os.environ, "PYTHONPATH": str(ROOT / "backend"), "ML_MODE": "local", "ML_URL": "http://127.0.0.1:8090"}
processes = []
logs = []


def launch(module, port):
    with socket.socket() as check:
        check.bind(("127.0.0.1", port))
    log = open(ROOT / f".runtime/verify-{port}.log", "w", encoding="utf-8")
    logs.append(log)
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", module, "--host", "127.0.0.1", "--port", str(port)],
        cwd=ROOT,
        env=env,
        stdout=log,
        stderr=log,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    processes.append(proc)
    for _ in range(50):
        try:
            if httpx.get(f"http://127.0.0.1:{port}/health", timeout=1).status_code == 200:
                return proc
        except httpx.HTTPError:
            pass
        if proc.poll() is not None:
            raise RuntimeError(f"Service {port} exited")
        time.sleep(0.2)
    raise RuntimeError(f"Service {port} not ready")


try:
    ml = launch("ml.example_service:app", 8090)
    launch("app.main:app", 8001)
    with httpx.Client(base_url="http://127.0.0.1:8001/api/v1", timeout=15) as client:
        admin = client.post("/auth/login", data={"username": "administrator@dds.local", "password": "DdsDemo2026!"})
        admin.raise_for_status()
        ah = {"Authorization": "Bearer " + admin.json()["access_token"]}
        email = f"integration-{time.time_ns()}@dds.local"
        response = client.post(
            "/admin/users",
            headers=ah,
            json={
                "email": email,
                "name": "Проверка локальной интеграции",
                "password": "DdsDemo2026!",
                "role": "trainee",
            },
        )
        response.raise_for_status()
        login = client.post("/auth/login", data={"username": email, "password": "DdsDemo2026!"})
        login.raise_for_status()
        client.headers["Authorization"] = "Bearer " + login.json()["access_token"]
        modes = []
        for scenario in ("water", "wire"):
            card = client.post("/simulation/sessions", json={"scenario_id": scenario})
            card.raise_for_status()
            result = client.post("/simulation/sessions/" + card.json()["session_id"] + "/finish")
            result.raise_for_status()
            modes.append(result.json()["mode"])
            if scenario == "water":
                ml.terminate()
                ml.wait(timeout=10)
        assert modes == ["local", "fallback"], modes
        output = {"local_http_evaluator": "passed", "service_loss_fallback": "passed", "observed_modes": modes}
        path = ROOT / "docs/evidence"
        path.mkdir(parents=True, exist_ok=True)
        (path / "ml-integration.json").write_text(json.dumps(output, indent=2), encoding="utf-8")
        print(json.dumps(output))
finally:
    for proc in reversed(processes):
        if proc.poll() is None:
            proc.terminate()
            proc.wait(timeout=10)
    for log in logs:
        log.close()
