"""Create the local development database if absent; credentials stay in .env."""

from pathlib import Path
from dotenv import dotenv_values
import psycopg
from psycopg import sql

settings = dotenv_values(Path(__file__).resolve().parents[1] / ".env")
with psycopg.connect(
    host="127.0.0.1",
    port=55432,
    user=settings["POSTGRES_USER"],
    password=settings["POSTGRES_PASSWORD"],
    dbname="postgres",
    autocommit=True,
) as connection:
    name = settings["POSTGRES_DB"]
    if not connection.execute("SELECT 1 FROM pg_database WHERE datname=%s", (name,)).fetchone():
        connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
print("Local PostgreSQL database ready")
