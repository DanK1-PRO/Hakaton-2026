"""Scoped GitHub repository administration using the existing Git credential helper."""

import argparse
import json
import subprocess
import urllib.request

REPO = "DanK1-PRO/Hakaton-2026"


class DownloadRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected:
            # GitHub log downloads use signed storage URLs, not the Git credential.
            redirected.remove_header("Authorization")
        return redirected


def api(path, method="GET", data=None, raw=False):
    credentials = subprocess.run(
        ["git", "credential", "fill"],
        input="protocol=https\nhost=github.com\n\n",
        text=True,
        capture_output=True,
        check=True,
    ).stdout
    values = dict(line.split("=", 1) for line in credentials.splitlines() if "=" in line)
    token = values.get("password")
    if not token:
        raise RuntimeError("No GitHub credential available")
    request = urllib.request.Request(
        "https://api.github.com/repos/" + REPO + path,
        data=json.dumps(data).encode() if data is not None else None,
        method=method,
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "dds-project-tool",
        },
    )
    with urllib.request.build_opener(DownloadRedirect()).open(request, timeout=30) as response:
        body = response.read()
        if raw == "bytes":
            return body
        if raw:
            return body.decode("utf-8")
        return json.loads(body) if body else None


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=["info", "runs", "jobs", "logs", "cancel", "setup"])
    parser.add_argument("--run-id", type=int)
    parser.add_argument("--job-id", type=int)
    args = parser.parse_args()
    if args.operation == "setup":
        api(
            "",
            "PATCH",
            {
                "description": "ДДС / DDS Training Simulator: локальное АРМ, учебные сценарии, FastAPI + React, PostgreSQL, mock/local ML.",
                "has_issues": True,
                "has_wiki": False,
            },
        )
        api(
            "/topics",
            "PUT",
            {
                "names": [
                    "dispatcher-training",
                    "simulation",
                    "fastapi",
                    "react",
                    "typescript",
                    "postgresql",
                    "machine-learning",
                    "hackathon-2026",
                ]
            },
        )
        print("Repository description and topics updated")
    elif args.operation == "runs":
        runs = api("/actions/runs?per_page=5")["workflow_runs"]
        print(
            json.dumps(
                [
                    {
                        "id": r["id"],
                        "status": r["status"],
                        "conclusion": r["conclusion"],
                        "sha": r["head_sha"],
                        "url": r["html_url"],
                    }
                    for r in runs
                ],
                indent=2,
            )
        )
    elif args.operation == "logs":
        if not args.job_id:
            parser.error("--job-id required")
        print(api(f"/actions/jobs/{args.job_id}/logs", raw=True)[-24000:])
    elif args.operation == "cancel":
        if not args.run_id:
            parser.error("--run-id required")
        api(f"/actions/runs/{args.run_id}/cancel", "POST")
        print("Run cancellation requested")
    elif args.operation == "jobs":
        if not args.run_id:
            parser.error("--run-id required")
        jobs = api(f"/actions/runs/{args.run_id}/jobs")["jobs"]
        print(
            json.dumps(
                [
                    {
                        "name": j["name"],
                        "status": j["status"],
                        "conclusion": j["conclusion"],
                        "steps": j["steps"],
                        "id": j["id"],
                    }
                    for j in jobs
                ],
                indent=2,
            )
        )
    else:
        repo = api("")
        print(
            json.dumps(
                {key: repo.get(key) for key in ("full_name", "private", "default_branch", "description", "html_url")},
                ensure_ascii=False,
                indent=2,
            )
        )
