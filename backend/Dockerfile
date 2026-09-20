FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend backend
COPY data_derived/classifier data_derived/classifier
COPY data_derived/scenarios data_derived/scenarios
ENV PYTHONPATH=/app/backend PYTHONUNBUFFERED=1
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser
CMD ["sh","-c","alembic -c backend/alembic.ini upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

