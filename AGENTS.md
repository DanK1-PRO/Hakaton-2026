# Codex Project Instructions — Hackathon 2026 DDS Simulator

This workspace is Danil's local project for the 2026 hackathon DDS training simulator.

Use Russian for user-facing product UI and for conversation with Danil. Repository control files, schemas, code comments, and AI memory files may be in English when that keeps contracts clearer.

## Current Mission

The implementation pass has built v0.1.0. Read docs/ai/PROJECT_STATE.md and docs/VERIFICATION.md before changing the working application. The objective below defines the delivered scope, not a command to scaffold it again.

Goal:

1. Create a locally runnable training simulator for a DDS dispatcher.
2. Use the captain's current implementation baseline for stack and delivery order.
3. Ground product behavior and UI in customer materials, especially the DDS ARM-112 memo.
4. Keep ML behind mocks/adapters so Danil's UI/backend can work before other team members deliver real models.
5. Finish with verification and update compact memory files.

Do not broaden this into a long-term platform redesign. Future UI polish, real ML model integration, richer VoIP, and advanced analytics are later passes.

## Source Priority

There are two independent source hierarchies.

Product/domain truth:

1. `Данные заказчика/9. Деп Обороны и ЧС.pdf`
2. `Данные заказчика/Датасет.zip::Работа с АРМ-112 для ДДС от ОКр_ГСИ.pdf`
3. `Данные заказчика/Датасет.zip::Классификатор_происшествий_v_046_24_корректировка_МВД_+_Департамент.xlsx`
4. `Данные заказчика/Датасет.zip::Билеты- задачи по C 112 . АГС_ГСИ.pdf`
5. `Данные заказчика/Инструкция_по_заведению_карточки_2507ГСИ.docx`
6. `Данные заказчика/СКРИНШОТ ДДСГСИ.docx` and `Данные заказчика/СКРИНШОТ КАРТОЧКИ 112ГСИ.docx`
7. `Данные заказчика/context_customer_answers_civil_defense.md`

Implementation truth:

1. `ТЗ для хакатона/HACKATHON_2026_MASTER_SPEC_CODEX.md`
2. The latest captain/team plan described there.
3. Danil's current request in this task.

Customer materials define what is correct. The captain plan defines how the team currently builds it.

## Architecture Baseline

Use this stack unless Danil explicitly approves a change:

- Backend: Python 3.11, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic, JWT, pytest.
- Frontend: React 18, TypeScript, Ant Design, Redux Toolkit, react-router-dom.
- Database: PostgreSQL 15.
- Runtime: Docker Compose with `api`, `ui`, and `db`.
- ML boundary: `ml_gateway` with mock/local adapters. Do not make the UI call ML directly.

Target runtime flow:

```text
React UI
  -> FastAPI API
    -> domain/simulation services
    -> PostgreSQL
    -> ML gateway
      -> mock evaluator/generator now
      -> future local model services later
```

## Working Rules

- Do not modify, move, or delete original customer files.
- Do not delete suspected duplicates without Danil's explicit confirmation.
- Mark unknowns as `UNKNOWN`, `UNRESOLVED`, or `NEEDS_CONFIRMATION`; do not invent official rules.
- Keep all source-derived facts traceable to filename and page/section when possible.
- The simulator must remain runnable with `ML_MODE=mock`.
- The first working system must prioritize one reliable end-to-end vertical slice over broad unfinished features.

## Astra Execution Protocol

At the start of the next pass:

1. Read this file.
2. Read `docs/ai/HANDOFF_FOR_ASTRA.md`.
3. Read `docs/ai/PROJECT_STATE.md`.
4. Read `docs/ai/TASK_QUEUE.md`.
5. Read `docs/ai/SOURCE_INDEX.yaml`.
6. Read only the source files needed for the current feature. Do not re-read every large PDF by default.

Use at most three parallel subagents:

- Backend/API subagent: backend, migrations, API tests.
- Frontend/UI subagent: React, Ant Design, Russian UI, UI tests/build.
- Data/ML contract subagent: classifier/scenario extraction, schemas, mocks/adapters.

The root Astra agent owns shared contracts, Docker Compose, architectural decisions, integration tests, and final verification.
