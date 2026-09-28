"""Download and verify Kirill's release parts; prepare an offline model artifact."""

import argparse
import hashlib
import json
import shutil
import subprocess
import urllib.request
from pathlib import Path

from github_repo import DownloadRedirect, api

ROOT = Path(__file__).resolve().parents[1]
MODEL_NAME = "GigaChat3.1-10B-A1.8B-q4_K_M"


def digest(path):
    with path.open("rb") as stream:
        return "sha256:" + hashlib.file_digest(stream, "sha256").hexdigest()


def prepare(output):
    output.mkdir(parents=True, exist_ok=True)
    release = api("/releases/tags/modelURL")
    assets = {a["name"]: a for a in release["assets"]}
    parts = [assets[f"{MODEL_NAME}.part{i:02}.gguf"] for i in range(1, 8)]
    if any(not a.get("digest", "").startswith("sha256:") for a in parts):
        raise ValueError("Release must publish SHA-256 digests for every part")
    if shutil.disk_usage(output).free < sum(a["size"] for a in parts) * 2:
        raise RuntimeError("At least 13 GB free space required for parts and assembled model")
    credentials = subprocess.run(
        ["git", "credential", "fill"],
        input="protocol=https\nhost=github.com\n\n",
        text=True,
        capture_output=True,
        check=True,
    ).stdout
    token = dict(line.split("=", 1) for line in credentials.splitlines() if "=" in line)["password"]
    opener = urllib.request.build_opener(DownloadRedirect())
    paths = []
    for asset in parts:
        path = output / asset["name"]
        if not (path.exists() and path.stat().st_size == asset["size"] and digest(path) == asset["digest"]):
            request = urllib.request.Request(
                asset["url"],
                headers={
                    "Authorization": "Bearer " + token,
                    "Accept": "application/octet-stream",
                    "User-Agent": "dds-offline-preparation",
                },
            )
            temporary = path.with_suffix(".download")
            print("Downloading " + path.name, flush=True)
            with opener.open(request, timeout=60) as response, temporary.open("wb") as stream:
                shutil.copyfileobj(response, stream, 1024 * 1024)
            if temporary.stat().st_size != asset["size"] or digest(temporary) != asset["digest"]:
                raise ValueError("Size or SHA-256 mismatch: " + path.name)
            temporary.replace(path)
        paths.append(path)
        print("Verified " + path.name, flush=True)
    # These release assets are byte slices, not native independently headed GGUF shards.
    for i, path in enumerate(paths):
        with path.open("rb") as stream:
            is_gguf = stream.read(4) == b"GGUF"
        if is_gguf != (i == 0):
            raise ValueError("Unexpected part format; do not concatenate native GGUF shards")
    assembled = output / (MODEL_NAME + ".gguf")
    temporary = assembled.with_suffix(".assembling")
    with temporary.open("wb") as dest:
        for path in paths:
            with path.open("rb") as source:
                shutil.copyfileobj(source, dest, 1024 * 1024)
    temporary.replace(assembled)
    manifest = {
        "release": release["html_url"],
        "file": assembled.name,
        "size": assembled.stat().st_size,
        "digest": digest(assembled),
        "parts": [{k: a[k] for k in ("name", "size", "digest")} for a in parts],
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("Prepared " + str(assembled), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / ".runtime" / "models")
    prepare(parser.parse_args().output)
