# Handoff: opencode · UI part (no ML)

When Danil mentions **«opencode helped me finish the UI part»** or **«opencode UI»**,
read this file first. It is the single entry point for what opencode changed on the
`ui/danil-integration-review` branch. ML was not touched.

Updated: 2026-09-23. Branch: `ui/danil-integration-review`
(origin: https://github.com/DanK1-PRO/Hakaton-2026.git).

## Scope boundary (say this to Codex)

- **Done with opencode:** React/Ant Design UI, backend view/domain polish for the UI,
  gap-closure B9/B10/C2/C3/C4, C1 DDS profile band, customer-screenshot visual audit,
  offline Moscow map pack, timezone fix in `seconds_since`, docs/verification/memory.
- **Not done / not reviewed:** ML package (`ml/scoring-experiment`), real ASR/SIP,
  scoring weights. `ML_MODE=mock` remains the regression path.

## Commits owned by this pass

| Commit | What |
|---|---|
| `e45d68d` | fix(api): `seconds_since` converts non-UTC datetimes via `astimezone` (session time was `00:00`); regression test `test_seconds_since_handles_non_utc_tz` |
| `2eeecca` | feat(ui): gap-closure B9/B10/C2/C3/C4 + C1 DDS profile band + EPERM build fix + docs/memory |
| `5b4da64` | fix(ui): align ARM card/list/mobile with customer screenshots |
| `e9b4883` | fix(map): copy `maplibre-gl-shared.mjs` for preview worker; offline OSM PMTiles |

Verification after `e45d68d`: **pytest 17 passed**, API restarted on `:8000`.
After `2eeecca`: pytest 16, Playwright 22/22, `tsc --noEmit` + `vite build` green.

## Where the UI changes live

- `frontend/src/workspace.tsx` — dispatcher workspace, comment rule, tooltips (C4/B10)
- `frontend/src/pages.tsx` — Training profile band (C1), scenario hint (C2)
- `frontend/src/domain/ddsProfiles.ts` — DDS profile catalog (was orphaned, now wired)
- `frontend/src/arm/ServiceDock.tsx` — history prefix, reference-only tiles (B9/C3)
- `frontend/src/components.tsx` — instructor feedback author (B9)
- `frontend/src/types.ts` — `actor_name` / `author_name` on Action/Feedback
- `frontend/src/styles.css` — `.scenario-hint`, `.profile-band*`
- `backend/app/views.py` — actor/author name resolution
- `backend/app/domain.py` — 422 on `completed` without summary; `seconds_since` tz fix
- `backend/app/routers/api.py` — `expected_hint` on `/scenarios`
- `backend/tests/test_flow.py`, `frontend/tests/flow.spec.ts`, `frontend/tests/arm.spec.ts`

## Where the evidence lives

- `docs/VERIFICATION.md` — dated sections with green matrices
- `docs/ai/PROJECT_STATE.md` — overall state + boundaries
- `docs/ai/TASK_QUEUE.md` — done/next checklist
- `docs/OPEN_QUESTIONS.md` — gaps reclassified `TEAM_DECISION` / `CLOSED`
- `docs/data/DATA_CONTRACT.md` + `config/openapi.json` — regenerated contracts

## Runtime URLs (local Windows)

- UI: http://127.0.0.1:5173
- API: http://127.0.0.1:8000
- ML status (mock): `GET /api/v1/ml/status` → `{"mode":"mock",...}`
- External ML contract if ever connected: `POST http://localhost:8090/v1/evaluate`,
  `GET /health` — configured in `backend/app/settings.py` (`ml_mode`, `ml_url`)

## One-line summary for Codex

> opencode finished the UI integration on `ui/danil-integration-review`
> (gap-closure B9–C4, C1 profile band, screenshot audit, offline map, tz fix);
> ML branch untouched, `ML_MODE=mock`; evidence in `docs/VERIFICATION.md`
> and `docs/ai/PROJECT_STATE.md`; details in commits `e45d68d`, `2eeecca`,
> `5b4da64`, `e9b4883`.
