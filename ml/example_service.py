"""Runnable contract example. Replace the evaluator with a teammate's implementation."""

from fastapi import FastAPI
from app.schemas import EvaluationRequest, EvaluationResult
from app.ml_gateway.gateway import deterministic_evaluate

app = FastAPI(title="DDS local ML contract example", version="1.0")


@app.get("/health")
def health():
    return {"status": "ok", "capabilities": ["evaluator"], "model_version": "local-contract-example-1"}


@app.post("/v1/evaluate", response_model=EvaluationResult)
def evaluate(request: EvaluationRequest):
    result = deterministic_evaluate(request)
    return result.model_copy(update={"mode": "local", "model_version": "local-contract-example-1"})
