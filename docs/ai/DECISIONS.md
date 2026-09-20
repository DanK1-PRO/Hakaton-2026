# Decisions

## DEC-001 — Use `.agents/skills` For Project Skills

Date: 2026-09-19
Status: Accepted

Decision:

Create local project skills under `.agents/skills/` instead of a generic `skills/` folder.

Reason:

Codex discovers repository-local skills from `.agents/skills`, which keeps the next pass focused without requiring a global user skill installation.

Impact:

The next Astra pass can load the project-specific skills when relevant.

## DEC-002 — Treat ZIP Classifier As Likely Newer Baseline

Date: 2026-09-19
Status: Accepted for MVP; conditional routing remains reference data

Decision:

Prefer `Датасет.zip::Классификатор_происшествий_v_046_24_корректировка_МВД_+_Департамент.xlsx` over the root v046_11 classifier when generating derived classifier/routing data, unless comparison shows a reason to keep the older file for a specific subset.

Reason:

The ZIP classifier appears newer by filename/version and has more columns.

Impact:

Astra should compare versions before creating derived routing tables.

## DEC-003 — Mock ML Is Required For MVP

Date: 2026-09-19
Status: Accepted

Decision:

The MVP must work with `ML_MODE=mock`.

Reason:

Danil's UI/backend work must progress before other team members deliver real ML models.

Impact:

All ML-facing endpoints must be adapter-based and must not import heavy ML libraries into the main FastAPI process unless explicitly needed later.

## DEC-004 - DDS Workflow And UI

Accepted 2026-09-20. Use the direct DDS memo and screenshot DOCX, not an invented
operator-112 workflow. Receipt on opening; first acceptance/rejection within 30s;
rejected can only become accepted; completed/refused lock editing. Intermediate
response states are not universally mandatory. Phone is simulated and labelled.
Use a flat workstation layout with compact Russian forms; preserve source panel order.

## DEC-005 - Demonstration Data And Evaluation

Accepted 2026-09-20. Three synthetic scenarios refer to memo pp.30-31.
Reference criteria are TEAM_PROPOSAL, not official tickets or official grading.
No invented numeric score: score=null. Instructor feedback is a separate append-only
record and does not overwrite the model result. Conditional classifier columns retain
source provenance and require domain confirmation before automatic routing.

## DEC-006 - Reliable Integration Boundary

Accepted 2026-09-20. Evaluate schema v1.0 is frozen in config JSON Schemas.
Local HTTP adapter has a bounded timeout and validates session identity.
Unavailable or invalid models fall back explicitly to deterministic checks.
No heavy model dependency or cloud inference in the API/UI runtime.
Generator and ASR are future contracts, not claimed as implemented.

## DEC-007 - Local Runtime And Dependency Audit

Accepted 2026-09-20. Compose remains the delivery baseline. Docker is absent on
Danil's machine; a portable PostgreSQL 15 launcher enables immediate local use.
Source and database remain in the workspace; a verified subst drive handles
PostgreSQL's Cyrillic path limitation. Local Python 3.12; container/CI Python 3.11.
FastAPI/Starlette/JWT/multipart/pytest and frontend dependencies were updated after
security audits. React remains 18; react-router-dom uses compatible v7.

## DEC-008 - Documentation Status

Accepted 2026-09-20. Bilingual repository with real screenshots, source traceability,
operating/acceptance documents and a generated PDF. The document set is informed by
GOST 34.201-2020 but is a working edition, not formal certification or state acceptance.
Original customer documents, secrets and runtime data are not published to Git.
