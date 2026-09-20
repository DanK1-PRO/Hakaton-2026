import httpx
from ..schemas import EvaluationRequest, EvaluationResult
from ..settings import settings


def deterministic_evaluate(request: EvaluationRequest, mode="mock"):
    reference = request.reference
    actual = request.card
    errors = []
    for field in ("address", "incident_type_id"):
        if str(actual.get(field, "")).strip().casefold() != str(reference.get(field, "")).strip().casefold():
            errors.append({"field": field, "expected": reference.get(field), "actual": actual.get(field)})
    statuses = [a["payload"].get("status") for a in request.actions if a["kind"] == "reaction"]
    missing = [s for s in reference.get("expected_actions", []) if s not in statuses]
    critical = []
    if request.timing.get("acknowledgement_seconds") is None:
        critical.append("Получение карточки не подтверждено")
    elif request.timing["acknowledgement_seconds"] > 30:
        critical.append("Превышено время подтверждения карточки: 30 секунд")
    return EvaluationResult(
        session_id=request.session_id,
        model_version="deterministic-demo-1",
        reference_version=reference.get("version", "1.0"),
        mode=mode,
        critical_errors=critical,
        field_errors=errors,
        missing_information=missing,
        timing=request.timing,
        routing_assessment={"status": "not_scored"},
        comment_quality={"status": "requires_instructor_review"},
        explanation="Проверены поля, зарегистрированные действия и время подтверждения. Смысл комментариев оценивает преподаватель. Балльная методика не утверждена.",
    )


async def evaluate(request: EvaluationRequest):
    if settings.ml_mode == "mock":
        return deterministic_evaluate(request)
    try:
        async with httpx.AsyncClient(timeout=settings.ml_timeout, trust_env=False) as client:
            response = await client.post(settings.ml_url + "/v1/evaluate", json=request.model_dump())
            response.raise_for_status()
            result = EvaluationResult.model_validate(response.json())
            if result.session_id != request.session_id:
                raise ValueError("ML session mismatch")
            return result
    except (httpx.HTTPError, ValueError):
        return deterministic_evaluate(request, mode="fallback")


async def status():
    if settings.ml_mode == "mock":
        return {"mode": "mock", "available": True, "capabilities": ["evaluator", "scenario_catalog"], "asr": False}
    try:
        async with httpx.AsyncClient(timeout=min(settings.ml_timeout, 2), trust_env=False) as client:
            result = await client.get(settings.ml_url + "/health")
            result.raise_for_status()
        return {"mode": "local", "available": True, "capabilities": ["evaluator"], "asr": False}
    except httpx.HTTPError:
        return {"mode": "fallback", "available": False, "capabilities": ["evaluator"], "asr": False}
