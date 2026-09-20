from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session
from .db import get_db
from .models import User
from .settings import settings

passwords = PasswordHash.recommended()
oauth = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
DUMMY_HASH = passwords.hash("timing-only-not-an-account")


def token_for(user):
    return jwt.encode(
        {"sub": user.id, "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.token_minutes)},
        settings.jwt_secret,
        algorithm="HS256",
    )


def current_user(token: str = Depends(oauth), db: Session = Depends(get_db)):
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user = db.get(User, data["sub"])
    except (jwt.PyJWTError, KeyError):
        user = None
    if not user or not user.active:
        raise HTTPException(401, "Требуется вход в систему", headers={"WWW-Authenticate": "Bearer"})
    return user


def staff(user=Depends(current_user)):
    if user.role not in ("instructor", "administrator"):
        raise HTTPException(403, "Требуются права преподавателя")
    return user


def admin(user=Depends(current_user)):
    if user.role != "administrator":
        raise HTTPException(403, "Требуются права администратора")
    return user


def authenticate(db, email, password):
    user = db.scalar(select(User).where(User.email == email.lower()))
    valid = passwords.verify(password, user.password_hash if user else DUMMY_HASH)
    return user if valid and user and user.active else None


def user_view(user):
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}
