"""
FastAPI entry point with basic JWT auth and role based access.
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import uuid

# --- Settings (in real life use environment vars) ---
SECRET_KEY = "super-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- Password hasher ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In‑memory user store for demo
users_db = {
    "operator@example.com": {"id": uuid.uuid4().hex, "email": "operator@example.com", "hashed_password": pwd_context.hash("oppass"), "role": "operator"},
    "instructor@example.com": {"id": uuid.uuid4().hex, "email": "instructor@example.com", "hashed_password": pwd_context.hash("instpass"), "role": "instructor"},
    "admin@example.com": {"id": uuid.uuid4().hex, "email": "admin@example.com", "hashed_password": pwd_context.hash("adminpass"), "role": "admin"},
}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

app = FastAPI(title="LocalAPI Demo")

# --- Utility functions ---

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- Dependencies ---
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_email: str | None = payload.get("sub")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials") from exc
    if (user := users_db.get(user_email)) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

# --- Routes ---
from .routers import auth as auth_router, incidents as incidents_router
app.include_router(auth_router)
app.include_router(incidents_router)
"