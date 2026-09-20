# Contributing / Участие в разработке

Use feature branches and small pull requests. Describe the observable behavior, source requirement, contract changes and verification. Russian and English discussions are both welcome.

1. Read AGENTS.md and docs/ai/PROJECT_STATE.md.
2. Keep customer originals immutable. Add derived data with file/sheet/row or page provenance.
3. Frontend calls API v1; ML code stays behind ml_gateway.
4. A schema change requires an Alembic revision and integration test. Do not rewrite applied migrations.
5. Export contracts with scripts/export_contracts.py after changing DTOs.
6. Run pytest, ruff, frontend build and relevant Playwright scenarios.
7. Update traceability and the compact handoff when behavior changes.

Team ownership: Danil (FastAPI skeleton, architecture/frontend), Nikita/Sanek (frontend), Kirill (backend/data/deployment + ML), Maksim (backend auth/router + ML). Shared contracts and migrations need coordination in PR review.

Не добавляйте реальные персональные данные, ключи, веса моделей и исходные архивы заказчика. Учебные примеры должны оставаться синтетическими. Не заменяйте подтверждённое правило выводом модели.

