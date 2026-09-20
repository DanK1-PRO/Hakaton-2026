"""Generate local secrets without printing them; never overwrite an existing .env."""

import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / ".env"
if path.exists():
    print(".env already exists; preserved")
else:
    password = secrets.token_urlsafe(24)
    path.write_text(
        f"POSTGRES_DB=dds\nPOSTGRES_USER=dds\nPOSTGRES_PASSWORD={password}\n"
        f"DATABASE_URL=postgresql+psycopg://dds:{password}@127.0.0.1:55432/dds\n"
        f"JWT_SECRET={secrets.token_urlsafe(48)}\nDEMO_PASSWORD=DdsDemo2026!\nML_MODE=mock\n",
        encoding="utf-8",
    )
    print("Generated .env for local demo")
