# LocalAPI – Incident Management API

## Overview

`LocalAPI` is a FastAPI application that exposes endpoints for managing incident records and generating VoIP scenarios using the HHT language model. It provides:

- **JWT‑based authentication** with role checks (`operator`, `instructor`, `admin`).
- **CRUD routes** for incidents (create, read, update, delete).  The current implementation uses an in‑memory store; replace it with your database if needed.
- **VoIP endpoints** that forward calls to the HHT generation service and return a PEG‑native formatted response.

The code lives under `app/`:
```
LocalAPI/
├── app/
│   ├── main.py          # FastAPI app factory & router inclusion
│   ├── auth.py           # JWT helpers, in‑memory user store
│   └── routers/
│       ├── incidents.py  # CRUD + VoIP routes (placeholders for now)
└── requirements.txt      # runtime deps (fastapi, python-jose, passlib, uvicorn)
```

## Running locally
```bash
cd LocalAPI
pip install -r requirements.txt
uvicorn app.main:app --reload
```
The server will start on `http://127.0.0.1:8000`.

### Authentication flow
1. **Login** – send a POST to `/token` with JSON `{"username": "<name>", "password": "<pwd>"}`.  The endpoint returns `{"access_token": "<jwt>", "token_type": "bearer"}`.
2. Use the returned token in all subsequent requests via the `Authorization: Bearer <jwt>` header.
3. The FastAPI dependencies (`get_current_user`, `require_role`) automatically validate the token and enforce role checks before allowing access to protected routes.

## Example usage
```bash
# Acquire a token (replace credentials)
curl -X POST http://localhost:8000/token \
     -H "Content-Type: application/json" \
     -d '{"username": "alice", "password": "secret"}'
```
The response will include an `access_token`.

### Incident CRUD (example)
```bash
# Create an incident
curl -X POST http://localhost:8000/incidents/
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"title": "Server outage", "description": "All services down"}'
```

## Extending the API
- **Replace the in‑memory user store** – edit `auth.py` to pull users from your database.
- **Implement real CRUD logic** – change the placeholders (HTTPException 501) in `incidents.py` to operate on a persistent store or ORM model.
- **Add more role checks** – modify `require_role` if you need nested permissions.

## Integration with HHT
The generation endpoint calls `src/generate.py` from the HHT repo.  The FastAPI route simply forwards the request body, obtains the PEG‑native output and returns it as JSON to clients.

---
*For any questions or missing features, feel free to open an issue.*