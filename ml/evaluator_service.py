"""
ML Evaluator Service v1
Реализует контракт POST /v1/evaluate для оценки ответов диспетчера.

Формулы сложности на основе классификатора происшествий МВД/Департамента.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
from pathlib import Path
from typing import Optional

app = FastAPI(title="DDS ML Evaluator", version="1.0")

# ============================================================
# МОДЕЛИ ДАННЫХ
# ============================================================

class EvaluationRequest(BaseModel):
    schema_version: str = "1.0"
    session_id: str
    card: dict
    actions: list[dict]
    reference: dict
    timing: dict

class EvaluationResult(BaseModel):
    schema_version: str = "1.0"
    session_id: str
    model_version: str
    reference_version: str
    mode: str = "local"
    score: Optional[float] = None
    critical_errors: list[str] = []
    field_errors: list[dict] = []
    missing_information: list[str] = []
    timing: dict = {}
    routing_assessment: dict = {}
    comment_quality: dict = {}
    explanation: str

# ============================================================
# ЗАГРУЗКА КЛАССИФИКАТОРА
# ============================================================

CLASSIFIER_PATH = Path(__file__).parent.parent / "data_derived" / "classifier" / "incident_types.json"

def load_classifier():
    """Загружает классификатор происшествий"""
    if CLASSIFIER_PATH.exists():
        with open(CLASSIFIER_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

CLASSIFIER = load_classifier()

# ============================================================
# ФОРМУЛЫ СЛОЖНОСТИ СЦЕНАРИЯ
# ============================================================

# Веса факторов сложности (по данным классификатора МВД/Департамента)
DIFFICULTY_WEIGHTS = {
    # Факторы места
    "location": {
        "на улице": 1.0,
        "транспорт": 1.5,
        "жилой дом": 2.0,
        "метро": 2.5,
        "МЦК": 2.5,
        "объект": 2.0,
        "ДТП": 1.5,
        "azard": 2.5,
    },
    # Факторы типа происшествия
    "incident_severity": {
        "пожар": 2.5,
        "задымление": 2.0,
        "ДТП": 2.0,
        "взрыв": 3.0,
        "обрушение": 3.0,
        "утечка газа": 2.5,
        "запах газа": 1.5,
        "авария": 2.0,
        "отключение": 1.5,
        "помощь": 1.0,
    },
    # Факторы признаков
    "sign_factors": {
        "открытое пламя": 1.5,
        "дым": 1.2,
        "опасный груз": 2.0,
        "угроза людям": 2.0,
        "пострадавшие": 2.5,
        "погибшие": 3.0,
        "эвакуация": 2.0,
        "нет доступа": 1.5,
    },
    # Множители的服务
    "service_multipliers": {
        "MCHS": 1.2,      # МЧС - пожарные
        "Police": 1.0,     # Полиция
        "AMBULANCE": 1.3,  # Скорая
        "MOSGAZ": 1.5,     # Мосгаз
        "METRO": 1.4,      # Метро
    }
}


def calculate_scenario_difficulty(card: dict, reference: dict) -> dict:
    """
    Рассчитывает сложность сценария на основе данных карточки.
    
    Возвращает:
    - difficulty_score: число от 1.0 до 10.0
    - difficulty_level: "easy" / "medium" / "hard"
    - factors: список повлиявших факторов
    """
    score = 1.0  # Базовый балл
    factors = []
    
    # 1. Анализ типа происшествия (из incident_type_id)
    incident_type_id = card.get("incident_type_id")
    if incident_type_id:
        # Ищем в классификаторе
        for inc in CLASSIFIER:
            if inc.get("id") == incident_type_id or inc.get("external_code") == str(incident_type_id):
                name = inc.get("name", "").lower()
                
                # Проверяем по типу происшествия
                for severity_key, severity_weight in DIFFICULTY_WEIGHTS["incident_severity"].items():
                    if severity_key in name:
                        score += severity_weight
                        factors.append(f"тип: {severity_key} (+{severity_weight})")
                        break
                
                # Проверяем по признакам
                features = inc.get("features", [])
                for feature in features:
                    feature_lower = feature.lower()
                    for sign_key, sign_weight in DIFFICULTY_WEIGHTS["sign_factors"].items():
                        if sign_key in feature_lower:
                            score += sign_weight
                            factors.append(f"признак: {sign_key} (+{sign_weight})")
                            break
                break
    
    # 2. Анализ места происшествия (из адреса)
    address = card.get("address", "").lower()
    for location_key, location_weight in DIFFICULTY_WEIGHTS["location"].items():
        if location_key in address:
            score += location_weight
            factors.append(f"место: {location_key} (+{location_weight})")
            break
    
    # 3. Анализ действий диспетчера
    actions = card.get("actions", [])
    if len(actions) > 5:
        score += 0.5
        factors.append(f"много действий: {len(actions)} (+0.5)")
    
    # 4. Анализ комментариев
    comments = card.get("comments", "")
    if len(comments) > 100:
        score += 0.3
        factors.append("подробные комментарии (+0.3)")
    
    # 5. Анализ времени реакции
    timing = card.get("timing", {})
    ack_time = timing.get("acknowledgement_seconds")
    if ack_time and ack_time > 30:
        score += 1.0
        factors.append(f"медленная реакция: {ack_time}с (+1.0)")
    
    # Нормализация к шкале 1-10
    score = min(10.0, max(1.0, score))
    
    # Определение уровня сложности
    if score <= 3.0:
        level = "easy"
    elif score <= 6.0:
        level = "medium"
    else:
        level = "hard"
    
    return {
        "difficulty_score": round(score, 2),
        "difficulty_level": level,
        "factors": factors
    }


# ============================================================
# ОЦЕНКА ОТВЕТА ДИСПЕТЧЕРА
# ============================================================

def evaluate_dispatcher_response(request: EvaluationRequest) -> dict:
    """
    Оценивает ответ диспетчера на основе действий и эталона.
    """
    reference = request.reference
    card = request.card
    actions = request.actions
    
    errors = []
    missing = []
    critical = []
    
    # 1. Проверка полей карточки
    for field in ("address", "incident_type_id"):
        actual = str(card.get(field, "")).strip().casefold()
        expected = str(reference.get(field, "")).strip().casefold()
        if actual != expected:
            errors.append({
                "field": field,
                "expected": reference.get(field),
                "actual": card.get(field)
            })
    
    # 2. Проверка действий
    statuses = [a.get("payload", {}).get("status") for a in actions if a.get("kind") == "reaction"]
    expected_actions = reference.get("expected_actions", [])
    missing = [s for s in expected_actions if s not in statuses]
    
    # 3. Проверка времени
    timing = request.timing
    if timing.get("acknowledgement_seconds") is None:
        critical.append("Получение карточки не подтверждено")
    elif timing["acknowledgement_seconds"] > 30:
        critical.append(f"Превышено время подтверждения: {timing['acknowledgement_seconds']}с (норма: 30с)")
    
    # 4. Расчет балла
    score = 10.0
    
    # Штрафы за ошибки полей
    score -= len(errors) * 2.0
    
    # Штрафы за пропущенные действия
    score -= len(missing) * 1.5
    
    # Штрафы за критические ошибки
    score -= len(critical) * 3.0
    
    # Штраф за время
    ack_time = timing.get("acknowledgement_seconds")
    if ack_time:
        if ack_time > 60:
            score -= 2.0
        elif ack_time > 30:
            score -= 1.0
    
    score = max(0.0, min(10.0, score))
    
    return {
        "score": round(score, 2),
        "critical_errors": critical,
        "field_errors": errors,
        "missing_information": missing,
        "timing": timing,
        "routing_assessment": {"status": "scored"},
        "comment_quality": {"status": "requires_instructor_review"}
    }


# ============================================================
# API ENDPOINTS
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "capabilities": ["evaluator", "difficulty_scorer"],
        "model_version": "ml-evaluator-v1.0",
        "difficulty_formula": "weighted_factors_v1"
    }


@app.post("/v1/evaluate", response_model=EvaluationResult)
def evaluate(request: EvaluationRequest):
    """
    Оценка ответа диспетчера.
    
    Возвращает оценку с учетом:
    - сложности сценария
    - правильности заполнения карточки
    - полноты действий
    - времени реакции
    """
    # Рассчитываем сложность сценария
    difficulty = calculate_scenario_difficulty(request.card, request.reference)
    
    # Оцениваем ответ диспетчера
    evaluation = evaluate_dispatcher_response(request)
    
    # Формируем объяснение
    explanation_parts = [
        f"Сложность сценария: {difficulty['difficulty_level']} ({difficulty['difficulty_score']}/10)",
        f"Оценка ответа: {evaluation['score']}/10",
    ]
    
    if evaluation["critical_errors"]:
        explanation_parts.append(f"Критические ошибки: {', '.join(evaluation['critical_errors'])}")
    
    if evaluation["field_errors"]:
        explanation_parts.append(f"Ошибки в полях: {len(evaluation['field_errors'])}")
    
    if evaluation["missing_information"]:
        explanation_parts.append(f"Пропущены действия: {', '.join(evaluation['missing_information'])}")
    
    if difficulty["factors"]:
        explanation_parts.append(f"Факторы сложности: {', '.join(difficulty['factors'][:3])}")
    
    return EvaluationResult(
        session_id=request.session_id,
        model_version="ml-evaluator-v1.0",
        reference_version=request.reference.get("version", "1.0"),
        mode="local",
        score=evaluation["score"],
        critical_errors=evaluation["critical_errors"],
        field_errors=evaluation["field_errors"],
        missing_information=evaluation["missing_information"],
        timing=evaluation["timing"],
        routing_assessment=evaluation["routing_assessment"],
        comment_quality=evaluation["comment_quality"],
        explanation=" | ".join(explanation_parts)
    )


@app.get("/v1/difficulty/{incident_type_id}")
def get_difficulty(incident_type_id: int):
    """
    Возвращает рассчитанную сложность для типа происшествия.
    Полезно для предпросмотра сценариев.
    """
    # Создаем виртуальную карточку для расчета
    virtual_card = {"incident_type_id": incident_type_id}
    virtual_reference = {}
    
    difficulty = calculate_scenario_difficulty(virtual_card, virtual_reference)
    
    return {
        "incident_type_id": incident_type_id,
        **difficulty
    }


@app.get("/v1/classifier/stats")
def classifier_stats():
    """Статистика по классификатору"""
    return {
        "total_incident_types": len(CLASSIFIER),
        "sample_types": [inc.get("name") for inc in CLASSIFIER[:10]]
    }
