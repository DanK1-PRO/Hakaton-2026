# Project State

Updated: 2026-09-21. Version: 0.1.0 + Danil UI integration branch.

## Actual State

The repository now contains a working FastAPI / React 18 / PostgreSQL 15 application,
not only source folders. Git origin: https://github.com/DanK1-PRO/Hakaton-2026.git (private).
Private main is published. GitHub run 35509118528 passed verify and containers
for application commit 9d0227c. Evidence: docs/VERIFICATION.md.

Implemented: role-aware JWT/Argon2 login, incidents/search/filter/create/edit,
source-derived classifier (1283 rows), DDS service states and 30-second acknowledgement,
version conflicts, append-only actions, simulated phone, 3 synthetic scenarios,
persistent evaluations, instructor feedback/CSV, admin user creation,
ML mock/local gateway with validated fallback and a separate example service.

Runtime: Docker Compose api/ui/db with migrations and seed. Local Windows alternative
uses real portable PostgreSQL 15 at 55432, UI 5173, API 8000. Data and secrets are ignored.
Python 3.12 was used locally; Docker/CI targets 3.11.

## Evidence

15 pytest cases passed. 8 real-browser tests passed at 1440/390px.
The browser suite includes a delayed-response regression for the phone/edit version race.
Build/typecheck, Ruff, Python/npm audits passed. Restart preserved saved evaluations.
Separate local ML and failed-ML fallback passed. See docs/VERIFICATION.md and docs/evidence.
Original customer files unchanged and excluded from Git. Source hash manifest exists.
Skills and memory files physically exist, not merely described in a chat.
Team handoff specs and a reusable AI-agent start prompt are published under docs/team.
Branch ownership is tracked in docs/team/TEAM_BRANCH_REGISTRY.ru.md: main is Danil's stable base, ml/scoring-experiment is Maxim's ML test branch, ui/sanya-results-admin is Sanya's UI test branch.

Danil branch `ui/danil-integration-review` is active locally. It adds a source-like ARM DDS workspace shell: dense grey card, top phone panel, left address/description, right classification block, bottom service dock/history, bottom reaction editor, explicit conflict reload, and ARM Playwright tests. Verification on 2026-09-21: frontend build passed, `npx playwright test tests/arm.spec.ts` 8/8 passed, full `npm test` 16/16 passed, backend pytest 15/15 passed, `git diff --check` passed.

Sanya branch `origin/ui/sanya-results-admin` currently points to `e81b63144798036f7b231ea6fc8a323cb2d8995d`. It changes incident filters, results, admin users, styles and flow tests. Do not merge automatically: one known integration adjustment is needed because `frontend/tests/flow.spec.ts:149` still targets `.workspace-heading`, which Danil's ARM workspace removes.

Additional branches seen on origin: `ui/nikita-card-flow`, `LocalAPI`, `hht`, updated `ml/scoring-experiment`. Treat them as unreviewed until inspected.

## Important Boundaries

Do not claim full general customer-spec acceptance. Real ASR/SIP/ML weights, groups,
advanced analytics, field encryption and large-scale load acceptance are not implemented.
No official numeric scoring rubric; result score=null. Scenario references require review.
Tickets PDF remains scanned and not a completed scenario corpus.
Standalone EDDS manual absent; direct DDS memo/screenshots used.
Conditional classifier routing is preserved as reference data, not silently interpreted.

## Continue

Read TASK_QUEUE, DECISIONS and docs/ML_INTEGRATION.md. Preserve working APIs.
Only inspect relevant source pages and files. Do not re-scaffold or rebuild the architecture.
