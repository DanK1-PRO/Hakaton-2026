"""Verify real HTTP synchronization with the local ML evaluator service and its failure path."""

from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import httpx
import argparse

ROOT = Path(__file__).resolve().parents[1]
(ROOT / ".runtime").mkdir(exist_ok=True)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--real-llm", action="store_true", help="Require the prepared GGUF server on loopback:8091")
args = parser.parse_args()
env = {**os.environ, "PYTHONPATH": str(ROOT / "backend"), "ML_MODE": "local", "ML_URL": "http://127.0.0.1:8090"}
if args.real_llm:
    env.update(DDS_LLM_URL="http://127.0.0.1:8091/v1", DDS_LLM_TIMEOUT="40", ML_TIMEOUT="45")
else:
    env.pop("DDS_LLM_URL", None)
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
    ml = launch("ml.evaluator_service:app", 8090)
    launch("app.main:app", 8001)
    with httpx.Client(base_url="http://127.0.0.1:8001/api/v1", timeout=100, trust_env=False) as client:
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
        assessments = []
        started_at = time.monotonic()
        for scenario in ("water", "wire"):
            card = client.post("/simulation/sessions", json={"scenario_id": scenario})
            card.raise_for_status()
            if args.real_llm:
                current = client.post("/incidents/" + card.json()["id"] + "/open").json()
                stages = (
                    ["accepted", "responding", "arrived", "working", "completed"]
                    if scenario == "water"
                    else ["accepted", "refused"]
                )
                for stage in stages:
                    response = client.post(
                        "/incidents/" + current["id"] + "/reaction",
                        json={
                            "status": stage,
                            "version": current["version"],
                            "comment": {
                                "accepted": "Карточка принята, аварийная бригада уведомлена.",
                                "responding": "Старший группы сообщил о выезде.",
                                "arrived": "Бригада прибыла к месту, доступ обеспечен.",
                                "working": "Бригада перекрывает воду и устраняет повреждение.",
                                "completed": "Течь устранена, результат подтверждён старшим группы.",
                                "refused": "Линия обслуживается другой организацией; сообщение передано её диспетчеру.",
                            }[stage],
                        },
                    )
                    response.raise_for_status()
                    current = response.json()
            endpoint = "/simulation/sessions/" + card.json()["session_id"] + "/finish"
            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(lambda _: client.post(endpoint), range(2)))
            for result in results:
                result.raise_for_status()
            assert results[0].json() == results[1].json(), "Concurrent finish must be idempotent"
            result = results[0]
            modes.append(result.json()["mode"])
            assessments.append(result.json()["comment_quality"])
            if scenario == "water":
                if args.real_llm:
                    assert result.json()["comment_quality"].get("status") == "model_assessed", result.json()
                ml.terminate()
                ml.wait(timeout=10)
        assert modes == ["local", "fallback"], modes
        output = {
            "local_http_evaluator": "passed",
            "service_loss_fallback": "passed",
            "concurrent_finish": "passed",
            "observed_modes": modes,
            "real_llm": args.real_llm,
            "duration_seconds": round(time.monotonic() - started_at, 2),
            "comment_assessments": assessments,
        }
        path = ROOT / "docs/evidence"
        path.mkdir(parents=True, exist_ok=True)
        filename = "real-ml-integration.json" if args.real_llm else "ml-integration.json"
        (path / filename).write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
        print(json.dumps(output))
finally:
    for proc in reversed(processes):
        if proc.poll() is None:
            proc.terminate()
            proc.wait(timeout=10)
    for log in logs:
        log.close()
