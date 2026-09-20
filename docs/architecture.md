# Architecture / Архитектура

Version 0.1.0. Scope: Danil's A+C and FastAPI skeleton.

## Components

A modular FastAPI monolith separates SQLAlchemy models, Pydantic DTOs, authorization, domain transitions and the ML gateway. React uses Redux Toolkit Query for server data and a Redux auth slice. The API owns timestamps, transitions and authorization. Frontend timers only display elapsed time.

PostgreSQL stores users, incident types, scenarios, training sessions, cards, append-only action events and instructor feedback. Alembic creates the schema and pgcrypto extension. Demo data is synthetic; encryption of actual PII is not claimed.

## Ownership

| Owner | Boundary |
|---|---|
| Danil | Initial API, architecture, UI integration, traceability |
| Nikita / Sanek | Frontend collaboration |
| Kirill | Backend/data/deployment and ML |
| Maksim | Auth/router collaboration and ML |
| Shared | Contracts, migration sequence, integration acceptance |

These working interfaces support team integration without reassigning the captain's responsibilities.

## Runtime

1. Start locks the user row and returns the existing active session or creates a new one.
2. The scenario creates an incoming DDS card; reference answers stay on the server.
3. Opening writes a received event. Updates lock the card and check its version.
4. Actor, payload and server time are committed together.
5. Finish locks the session and card, evaluates through the gateway and persists the result.
6. Instructor feedback is retained separately; it does not overwrite the model result.

## Failures

- DB unavailable: 503 and retry. Mounted forms retain their contents.
- Stale version: 409; concurrent work is not overwritten.
- Network interruption: persisted server state survives and polling resumes. Failed writes are not silently acknowledged. A durable offline edit queue across reload is not implemented.
- Local ML timeout/error/malformed output/mismatched session: explicit deterministic fallback.
- Terminal reactions and finished sessions disallow trainee writes.
- Demo instructors see all sessions; production instructor-group scoping is pending.
- Default ports bind to loopback. LAN use requires TLS, accounts and deployment settings.
- XLSX conditional routing is retained, not flattened into unconditional notifications.

## Compatibility and performance

Python 3.11 is the container/CI target. Initial local runtime is Python 3.12. React remains 18. React Router 7.18.4 supports React >=18 and was selected after dependency audits; the captain did not pin a Router major. This is a BrowserRouter SPA without SSR/RSC.

Lists paginate; reference data is cached; polling is 5 seconds; model calls have a timeout. A local smoke test does not prove the customer 100-user target. Measurement scope is recorded in VERIFICATION.md.

