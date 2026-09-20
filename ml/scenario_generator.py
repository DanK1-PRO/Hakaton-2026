"""
ML Scenario Generator & Evaluator v1
Генерирует уникальные сценарии для тренировки диспетчеров 112.
Оценивает работу диспетчера по формуле баллов.

Вход: классификатор происшествий + формула сложности + формула оценки
Выход: сценарий + оценка в формате JSON
"""

import json
import random
import hashlib
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field, asdict

# ============================================================
# ЗАГРУЗКА ДАННЫХ
# ============================================================

CLASSIFIER_PATH = Path(__file__).parent.parent / "data_derived" / "classifier" / "incident_types.json"
SCENARIOS_PATH = Path(__file__).parent.parent / "data_derived" / "scenarios" / "classifier_scenarios.json"
DEMO_PATH = Path(__file__).parent.parent / "data_derived" / "scenarios" / "demo.json"

def load_classifier() -> list[dict]:
    if CLASSIFIER_PATH.exists():
        with open(CLASSIFIER_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def load_example_scenarios() -> list[dict]:
    examples = []
    for path in [DEMO_PATH, SCENARIOS_PATH]:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                examples.extend(data[:5])
    return examples


# ============================================================
# ФОРМУЛА СЛОЖНОСТИ СЦЕНАРИЯ
# ============================================================

DIFFICULTY_WEIGHTS = {
    "location": {
        "на улице": 1.0, "транспорт": 1.5, "жилой дом": 2.0,
        "метро": 2.5, "МЦК": 2.5, "объект": 2.0, "ДТП": 1.5, "azard": 2.5,
    },
    "incident_severity": {
        "пожар": 2.5, "задымление": 2.0, "ДТП": 2.0, "взрыв": 3.0,
        "обрушение": 3.0, "утечка газа": 2.5, "запах газа": 1.5,
        "авария": 2.0, "отключение": 1.5, "помощь": 1.0,
    },
    "sign_factors": {
        "открытое пламя": 1.5, "дым": 1.2, "опасный груз": 2.0,
        "угроза людям": 2.0, "пострадавшие": 2.5, "погибшие": 3.0,
        "эвакуация": 2.0, "нет доступа": 1.5,
    },
}


def calculate_difficulty(card: dict, classifier: list[dict]) -> dict:
    """Рассчитывает сложность сценария по формуле."""
    score = 1.0
    factors = []
    incident_type_id = card.get("incident_type_id")

    if incident_type_id:
        for inc in classifier:
            if inc.get("id") == incident_type_id or inc.get("external_code") == str(incident_type_id):
                name = inc.get("name", "").lower()
                for key, weight in DIFFICULTY_WEIGHTS["incident_severity"].items():
                    if key in name:
                        score += weight
                        factors.append(f"тип: {key} (+{weight})")
                        break
                for feature in inc.get("features", []):
                    fl = feature.lower()
                    for key, weight in DIFFICULTY_WEIGHTS["sign_factors"].items():
                        if key in fl:
                            score += weight
                            factors.append(f"признак: {key} (+{weight})")
                            break
                break

    address = card.get("address", "").lower()
    for key, weight in DIFFICULTY_WEIGHTS["location"].items():
        if key in address:
            score += weight
            factors.append(f"место: {key} (+{weight})")
            break

    score = min(10.0, max(1.0, score))
    if score <= 3.0:
        level = "easy"
    elif score <= 6.0:
        level = "medium"
    else:
        level = "hard"

    return {"difficulty_score": round(score, 2), "difficulty_level": level, "factors": factors}


# ============================================================
# ФОРМУЛА ОЦЕНКИ РАБОТЫ ДИСПЕТЧЕРА
# ============================================================

SCORING_PENALTIES = {
    "wrong_field": -2.0,
    "missed_action": -1.5,
    "critical_error": -3.0,
    "slow_ack_gt30": -1.0,
    "slow_ack_gt60": -2.0,
    "wrong_service": -2.5,
    "missed_victims_question": -2.0,
    "no_address_confirmed": -1.5,
}

SCORING_BONUSES = {
    "fast_ack_lt10": 0.5,
    "correct_routing_all": 1.0,
    "asked_clarifying": 0.5,
    "correct_formulation": 0.5,
}


CRITICAL_ERRORS = [
    "не_подтверждён_приём_вызова",
    "не_выяснены_пострадавшие",
    "не_запрошен_точный_адрес",
    "не_определён_тип_происшествия",
    "опасная_задержка_более_60_сек",
]


def calculate_dispatcher_score(
    scenario: dict,
    dispatcher_actions: list[dict],
    timing: dict,
    filled_card: dict,
) -> dict:
    """
    Рассчитывает оценку работы диспетчера по формуле.

    Args:
        scenario: Сценарий (card, reference, expected_actions)
        dispatcher_actions: [{"type": "accepted/responding/completed/rejected", "description": "..."}]
        timing: {"ack_seconds": N, "card_fill_seconds": N, "dispatch_seconds": N}
        filled_card: Заполненная диспетчером карточка

    Returns:
        dict с score, penalties, bonuses, errors, missing, routing
    """
    start_score = 10.0
    penalties = []
    bonuses = []
    errors = []
    missing = []

    expected_actions = scenario.get("reference", {}).get("expected_actions", [])
    ref_address = scenario.get("reference", {}).get("address", "").lower()
    ref_type_id = scenario.get("reference", {}).get("incident_type_id")
    actual_actions = [a.get("type", "") for a in dispatcher_actions]

    # --- ШТРАФЫ ---

    # 1. Проверка полей карточки
    for field_name in ("address", "incident_type_id"):
        ref_val = str(scenario.get("reference", {}).get(field_name, "")).lower()
        act_val = str(filled_card.get(field_name, "")).lower()
        if ref_val and act_val and ref_val != act_val:
            amount = SCORING_PENALTIES["wrong_field"]
            penalties.append({"reason": f"Неправильное поле '{field_name}': ожидалось '{ref_val}', получено '{act_val}'", "amount": amount})
            errors.append({"type": "field", "description": f"Поле {field_name} заполнено неправильно", "penalty": amount})

    # 2. Пропущенные действия
    for action in expected_actions:
        if action not in actual_actions:
            amount = SCORING_PENALTIES["missed_action"]
            penalties.append({"reason": f"Пропущено действие: {action}", "amount": amount})
            errors.append({"type": "action", "description": f"Не выполнено: {action}", "penalty": amount})
            missing.append(action)

    # 3. Критические ошибки
    ack_time = timing.get("ack_seconds", 0)
    if ack_time is None or ack_time == 0:
        amount = SCORING_PENALTIES["critical_error"]
        penalties.append({"reason": "Получение карточки не подтверждено", "amount": amount})
        errors.append({"type": "critical", "description": "Не подтверждён приём вызова", "penalty": amount})
    elif not filled_card.get("address") or filled_card.get("address", "").strip() == "":
        amount = SCORING_PENALTIES["no_address_confirmed"]
        penalties.append({"reason": "Не зафиксирован адрес", "amount": amount})
        errors.append({"type": "critical", "description": "Не запрошен/не зафиксирован адрес", "penalty": amount})

    # 4. Штраф за время подтверждения
    if ack_time and ack_time > 60:
        amount = SCORING_PENALTIES["slow_ack_gt60"]
        penalties.append({"reason": f"Очень медленное подтверждение: {ack_time}с", "amount": amount})
        errors.append({"type": "timing", "description": f"Подтверждение заняло {ack_time}с (норма <30с)", "penalty": amount})
    elif ack_time and ack_time > 30:
        amount = SCORING_PENALTIES["slow_ack_gt30"]
        penalties.append({"reason": f"Медленное подтверждение: {ack_time}с", "amount": amount})
        errors.append({"type": "timing", "description": f"Подтверждение заняло {ack_time}с", "penalty": amount})

    # 5. Проверка маршрутизации
    called_services = [a.get("service", "") for a in dispatcher_actions if a.get("type") == "dispatch"]
    expected_services = scenario.get("reference", {}).get("expected_services", [])
    for svc in called_services:
        if svc not in expected_services and expected_services:
            amount = SCORING_PENALTIES["wrong_service"]
            penalties.append({"reason": f"Вызвана неправильная служба: {svc}", "amount": amount})
            errors.append({"type": "routing", "description": f"Неверный вызов службы: {svc}", "penalty": amount})

    # --- БОНУСЫ ---

    # 1. Быстрое подтверждение
    if ack_time and ack_time < 10:
        amount = SCORING_BONUSES["fast_ack_lt10"]
        bonuses.append({"reason": f"Быстрое подтверждение: {ack_time}с", "amount": amount})

    # 2. Правильная маршрутизация
    if expected_services and all(s in called_services for s in expected_services):
        amount = SCORING_BONUSES["correct_routing_all"]
        bonuses.append({"reason": "Все службы вызваны правильно", "amount": amount})

    # 3. Уточняющие вопросы
    clarifying = [a for a in dispatcher_actions if a.get("type") == "clarify"]
    if clarifying:
        amount = SCORING_BONUSES["asked_clarifying"]
        bonuses.append({"reason": f"Заданы уточняющие вопросы ({len(clarifying)})", "amount": amount})

    # --- ИТОГ ---
    total_penalty = sum(p["amount"] for p in penalties)
    total_bonus = sum(b["amount"] for b in bonuses)
    final_score = max(0.0, min(10.0, start_score + total_penalty + total_bonus))

    return {
        "score": round(final_score, 2),
        "score_breakdown": {
            "start": start_score,
            "penalties": penalties,
            "bonuses": bonuses,
            "total_penalty": round(total_penalty, 2),
            "total_bonus": round(total_bonus, 2),
        },
        "errors": errors,
        "missing_information": missing,
        "routing_assessment": {
            "called_correctly": [s for s in called_services if s in expected_services],
            "called_wrong": [s for s in called_services if s not in expected_services],
            "missed": [s for s in expected_services if s not in called_services],
        },
    }


# ============================================================
# ПРОМПТ ДЛЯ ГЕНЕРАЦИИ СЦЕНАРИЯ
# ============================================================

GENERATION_SYSTEM_PROMPT = """Ты — эксперт по созданию учебных сценариев для диспетчеров службы 112.

Твоя задача: по данным классификатора происшествия сгенерировать РЕАЛИСТИЧНЫЙ сценарий звонка гражданина на линию 112.

Сценарий должен выглядеть как РЕАЛЬНЫЙ разговор: гражданин звонит, описывает ситуацию своими словами, может быть напуган, путаться, повторяться.

Формат ответа — СТРОГО JSON:
{
  "prompt": "Текст звонка гражданина (1-3 абзаца, живой язык)",
  "card": {
    "address": "Конкретный реалистичный адрес (улица, дом, город)",
    "incident_type_id": ID_из_классификатора,
    "comments": "Краткое описание ситуации для карточки"
  },
  "briefing": ["Шаг 1: что делать диспетчеру", "Шаг 2: ..."],
  "reference": {
    "expected_actions": ["accepted", "responding", "completed"],
    "key_information": ["Какие данные должен узнать диспетчер"],
    "routing_rules": ["Какие службы вызывать"]
  }
}

Правила:
1. prompt — это ГОЛОС звонящего. Он говорит от первого лица: "Алло, мне нужна помощь!"
2. Адрес должен быть реалистичным (Москва, конкретные улицы)
3. Ситуация должна соответствовать типу происшествия из классификатора
4. Не используй шаблонные фразы вроде "Произошло происшествие типа X"
5. Гражданин может: не знать точный адрес, путать детали, быть тревожным
6. Ожидаемые действия: accepted (принято), responding (выезд), completed (завершено), rejected (отклонено), refused (отказ)
7. В поле briefing напиши 1-3 шага что должен сделать диспетчер
8. В key_information — какие данные обязательно зафиксировать
9. В routing_rules — какие службы и по каким правилам вызывать
10. НЕ ПИШИ НИЧЕГО КРОМЕ JSON. Никаких комментариев, объяснений."""


# ============================================================
# ПРОМПТ ДЛЯ ОЦЕНКИ РАБОТЫ ДИСПЕТЧЕРА
# ============================================================

EVALUATION_SYSTEM_PROMPT = """Ты — эксперт-оценщик работы диспетчеров службы 112.

Твоя задача: на основе сценария и действий диспетчера оценить его работу по формуле баллов.

## Формула оценки

Начальный балл: 10.0

Штрафы:
- Неправильное поле в карточке: -2.0 балла
- Пропущенное действие: -1.5 балла
- Критическая ошибка (опасность жизни): -3.0 балла
- Медленное подтверждение (>30 сек): -1.0 балл
- Очень медленное (>60 сек): -2.0 балла
- Неправильный выбор службы: -2.5 балла
- Не задан вопрос про пострадавших: -2.0 балла
- Не зафиксирован адрес: -1.5 балла

Бонусы:
- Быстрое подтверждение (<10 сек): +0.5 балла
- Правильная маршрутизация всех служб: +1.0 балл
- Заданы уточняющие вопросы: +0.5 балла
- Корректная формулировка: +0.5 балла

Итог: min(10, max(0, балл))

## Формат ответа — СТРОГО JSON:

{
  "score": Итоговый_балл_от_0_до_10,
  "score_breakdown": {
    "start": 10.0,
    "penalties": [{"reason": "Описание ошибки", "amount": -2.0}],
    "bonuses": [{"reason": "Описание действия", "amount": 0.5}],
    "total_penalty": -Итого_штрафов,
    "total_bonus": +Итого_бонусов
  },
  "correct_actions": ["Что сделано правильно"],
  "errors": [
    {
      "type": "critical/field/timing/routing/action",
      "description": "Описание ошибки",
      "penalty": -2.0,
      "recommendation": "Что исправить"
    }
  ],
  "missing_information": ["Какие данные не зафиксированы"],
  "routing_assessment": {
    "called_correctly": ["Службы вызваны правильно"],
    "called_wrong": ["Службы вызваны неправильно"],
    "missed": ["Службы которые нужно было вызвать"]
  },
  "overall_comment": "Общая оценка 2-3 предложения"
}

## Критические ошибки (всегда -3.0):
- Не подтверждён приём вызова
- Не выяснено есть ли пострадавшие
- Не запрошен точный адрес
- Не определён тип происшествия
- Задержка >60 сек при угрозе жизни

## Правила:
1. Сравни действия с expected_actions из reference
2. Проверяй заполнение полей карточки
3. Оценивай время: <10с отлично, 10-30с норма, >30с штраф, >60с критический
4. Маршрутизация: правильные службы для типа происшествия
5. Проверяй уточняющие вопросы
6. Общий комментарь — конструктивная обратная связь
7. НЕ ПИШИ НИЧЕГО КРОМЕ JSON"""


# ============================================================
# ПОСТРОЕНИЕ ПРОМПТОВ
# ============================================================

def build_generation_prompt(
    incident: dict,
    target_difficulty: Optional[str] = None,
    example_scenarios: list[dict] = None,
) -> list[dict]:
    """Формирует промпт для генерации сценария."""
    messages = [{"role": "system", "content": GENERATION_SYSTEM_PROMPT}]

    context_parts = [
        f"Тип происшествия: {incident.get('name', 'неизвестно')}",
        f"ID: {incident.get('id')}",
        f"Код: {incident.get('external_code', 'нет')}",
    ]
    features = incident.get("features", [])
    if features:
        context_parts.append(f"Признаки: {', '.join(features)}")
    routes = incident.get("routes", [])
    if routes:
        services = list(set(r.get("service", "") for r in routes))
        context_parts.append(f"Задействованные службы: {', '.join(services)}")
    if target_difficulty:
        context_parts.append(f"Целевая сложность: {target_difficulty}")

    user_content = (
        "Сгенерируй учебный сценарий звонка на 112 для этого типа происшествия:\n\n"
        + "\n".join(context_parts)
    )

    if example_scenarios:
        examples_text = "\n\nПримеры хороших сценариев:\n"
        for ex in example_scenarios[:3]:
            examples_text += f"\n---\n{json.dumps(ex, ensure_ascii=False, indent=2)}\n"
        user_content += examples_text

    messages.append({"role": "user", "content": user_content})
    return messages


def build_evaluation_prompt(
    scenario: dict,
    dispatcher_actions: list[dict],
    timing: dict,
    filled_card: dict,
    example_evaluations: list[dict] = None,
) -> list[dict]:
    """Формирует промпт для оценки работы диспетчера."""
    messages = [{"role": "system", "content": EVALUATION_SYSTEM_PROMPT}]

    user_content = f"""## Сценарий

Звонок: {scenario.get('prompt', 'нет данных')}

Карточка (эталон):
{json.dumps(scenario.get('card', {}), ensure_ascii=False, indent=2)}

Reference:
{json.dumps(scenario.get('reference', {}), ensure_ascii=False, indent=2)}

## Действия диспетчера

{json.dumps(dispatcher_actions, ensure_ascii=False, indent=2)}

## Время

{json.dumps(timing, ensure_ascii=False, indent=2)}

## Заполненная карточка диспетчером

{json.dumps(filled_card, ensure_ascii=False, indent=2)}

## Задача

Оцени работу диспетчера по формуле. Верни СТРОГО JSON без комментариев."""

    if example_evaluations:
        examples_text = "\n\nПримеры оценок:\n"
        for ex in example_evaluations[:2]:
            examples_text += f"\n---\n{json.dumps(ex, ensure_ascii=False, indent=2)}\n"
        user_content += examples_text

    messages.append({"role": "user", "content": user_content})
    return messages


# ============================================================
# МОДЕЛИ ДАННЫХ
# ============================================================

@dataclass
class GeneratedScenario:
    id: str
    title: str
    difficulty: str
    difficulty_score: float
    service: str
    prompt: str
    briefing: list[str]
    card: dict
    reference: dict
    source: dict
    ml_metadata: dict
    difficulty_factors: list[str] = field(default_factory=list)


@dataclass
class EvaluationResult:
    score: float
    score_breakdown: dict
    correct_actions: list[str]
    errors: list[dict]
    missing_information: list[str]
    routing_assessment: dict
    overall_comment: str
    difficulty_score: float = 0.0
    difficulty_level: str = ""


# ============================================================
# LLM КЛИЕНТ
# ============================================================

class LLMClient:
    """Клиент для любого OpenAI-совместимого API."""

    def __init__(self, api_url: str, api_key: str, model: str):
        self.api_url = api_url
        self.api_key = api_key
        self.model = model

    def call(self, messages: list[dict], temperature: float = 0.7) -> str:
        import httpx
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 2048,
        }
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(f"{self.api_url}/chat/completions", json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    @staticmethod
    def parse_json(raw: str) -> Optional[dict]:
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    return json.loads(text[start:end])
                except json.JSONDecodeError:
                    pass
        return None


# ============================================================
# ГЕНЕРАТОР СЦЕНАРИЕВ
# ============================================================

class ScenarioGenerator:
    """Генерирует уникальные сценарии для тренировки диспетчеров 112."""

    def __init__(self, api_url="http://localhost:11434/v1", api_key="ollama", model="qwen2.5:7b"):
        self.classifier = load_classifier()
        self.examples = load_example_scenarios()
        self.llm = LLMClient(api_url, api_key, model)

    def generate_one(self, incident: dict, target_difficulty=None, temperature=0.8) -> Optional[GeneratedScenario]:
        messages = build_generation_prompt(incident, target_difficulty, self.examples)
        try:
            raw = self.llm.call(messages, temperature)
        except Exception as e:
            print(f"LLM error for {incident.get('name')}: {e}")
            return None

        parsed = LLMClient.parse_json(raw)
        if not parsed:
            print(f"Failed to parse LLM response for {incident.get('name')}")
            return None

        card = parsed.get("card", {})
        card["incident_type_id"] = incident.get("id")
        difficulty = calculate_difficulty(card, self.classifier)

        scenario_id = hashlib.md5(f"{incident.get('id')}_{random.randint(1000,9999)}".encode()).hexdigest()[:12]

        return GeneratedScenario(
            id=scenario_id,
            title=incident.get("name", "Неизвестно"),
            difficulty=difficulty["difficulty_level"],
            difficulty_score=difficulty["difficulty_score"],
            service=self._detect_service(incident),
            prompt=parsed.get("prompt", ""),
            briefing=parsed.get("briefing", []),
            card={
                "caller_number": f"+7{random.randint(9000000000, 9999999999)}",
                "name": f"Заявитель {scenario_id[:6]}",
                "address": card.get("address", "г. Москва"),
                "incident_type_id": incident.get("id"),
                "comments": card.get("comments", incident.get("name", "")),
            },
            reference={
                "version": "1.0-generated",
                "address": card.get("address", "г. Москва"),
                "incident_type_id": incident.get("id"),
                "expected_actions": parsed.get("reference", {}).get("expected_actions", ["accepted", "responding", "completed"]),
                "key_information": parsed.get("reference", {}).get("key_information", []),
                "routing_rules": parsed.get("reference", {}).get("routing_rules", []),
            },
            source={"type": "llm_generated", "model": self.llm.model, "status": "GENERATED", "note": "Требует проверки преподавателем."},
            ml_metadata={"category": incident.get("name", ""), "features": incident.get("features", []), "difficulty_score": difficulty["difficulty_score"]},
            difficulty_factors=difficulty["factors"],
        )

    def generate_batch(self, incident_ids=None, target_difficulty=None, count_per_type=1, temperature=0.8):
        incidents = self.classifier
        if incident_ids:
            incidents = [i for i in self.classifier if i.get("id") in incident_ids]
        scenarios = []
        for inc in incidents:
            for _ in range(count_per_type):
                s = self.generate_one(inc, target_difficulty, temperature)
                if s:
                    scenarios.append(s)
                    print(f"  [{len(scenarios)}] {s.title}: {s.difficulty} ({s.difficulty_score}/10)")
        return scenarios

    def _detect_service(self, incident):
        for route in incident.get("routes", []):
            svc = route.get("service", "")
            if "МЧС" in svc or "101" in route.get("variant", ""): return "МЧС"
            if "МВД" in svc or "Полиция" in svc: return "Полиция"
            if "СМП" in svc or "Скорая" in svc: return "СМП"
            if "МОСГАЗ" in svc: return "МОСГАЗ"
        return "ДДС"

    def save(self, scenarios, output_path):
        data = [asdict(s) for s in scenarios]
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Сохранено {len(data)} сценариев в {path}")


# ============================================================
# ОЦЕНЩИК РАБОТЫ ДИСПЕТЧЕРА
# ============================================================

class DispatcherEvaluator:
    """Оценивает работу диспетчера по формуле баллов."""

    def __init__(self, api_url="http://localhost:11434/v1", api_key="ollama", model="qwen2.5:7b"):
        self.classifier = load_classifier()
        self.llm = LLMClient(api_url, api_key, model)

    def evaluate(
        self,
        scenario: dict,
        dispatcher_actions: list[dict],
        timing: dict,
        filled_card: dict,
        use_llm: bool = True,
        temperature: float = 0.3,
    ) -> EvaluationResult:
        """
        Оценивает работу диспетчера.

        Args:
            scenario: Сценарий (prompt, card, reference)
            dispatcher_actions: [{"type": "accepted", "description": "...", "service": "МЧС"}]
            timing: {"ack_seconds": 15, "card_fill_seconds": 30, "dispatch_seconds": 45}
            filled_card: {"address": "...", "incident_type_id": 5, "comments": "..."}
            use_llm: Если True — LLM оценивает комментарии, иначе только формула
            temperature: Температура для LLM (ниже = стабильнее)
        """
        # Базовая оценка по формуле (всегда)
        formula_result = calculate_dispatcher_score(scenario, dispatcher_actions, timing, filled_card)

        if not use_llm:
            return EvaluationResult(
                score=formula_result["score"],
                score_breakdown=formula_result["score_breakdown"],
                correct_actions=[a.get("type") for a in dispatcher_actions if a.get("type") in scenario.get("reference", {}).get("expected_actions", [])],
                errors=formula_result["errors"],
                missing_information=formula_result["missing_information"],
                routing_assessment=formula_result["routing_assessment"],
                overall_comment="Оценка по формуле (без LLM)",
            )

        # LLM-оценка для качественной обратной связи
        messages = build_evaluation_prompt(scenario, dispatcher_actions, timing, filled_card)
        try:
            raw = self.llm.call(messages, temperature)
            parsed = LLMClient.parse_json(raw)
        except Exception as e:
            print(f"LLM evaluation error: {e}")
            parsed = None

        if parsed:
            # LLM подтвердила или скорректировала формулу
            llm_score = parsed.get("score", formula_result["score"])
            # Приоритет формуле, LLM корректирует до ±1 балла
            final_score = max(0.0, min(10.0, formula_result["score"] * 0.7 + llm_score * 0.3))

            return EvaluationResult(
                score=round(final_score, 2),
                score_breakdown=formula_result["score_breakdown"],
                correct_actions=parsed.get("correct_actions", []),
                errors=parsed.get("errors", formula_result["errors"]),
                missing_information=parsed.get("missing_information", formula_result["missing_information"]),
                routing_assessment=parsed.get("routing_assessment", formula_result["routing_assessment"]),
                overall_comment=parsed.get("overall_comment", ""),
            )

        return EvaluationResult(
            score=formula_result["score"],
            score_breakdown=formula_result["score_breakdown"],
            correct_actions=[],
            errors=formula_result["errors"],
            missing_information=formula_result["missing_information"],
            routing_assessment=formula_result["routing_assessment"],
            overall_comment="Оценка по формуле (LLM недоступна)",
        )


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="DDS Scenario Generator & Evaluator")
    sub = parser.add_subparsers(dest="command")

    # generate
    gen_parser = sub.add_parser("generate", help="Сгенерировать сценарии")
    gen_parser.add_argument("--api-url", default="http://localhost:11434/v1")
    gen_parser.add_argument("--api-key", default="ollama")
    gen_parser.add_argument("--model", default="qwen2.5:7b")
    gen_parser.add_argument("--ids", nargs="*", type=int)
    gen_parser.add_argument("--difficulty", choices=["easy", "medium", "hard"])
    gen_parser.add_argument("--count", type=int, default=1)
    gen_parser.add_argument("--temperature", type=float, default=0.8)
    gen_parser.add_argument("--output", default="data_derived/scenarios/generated.json")

    # evaluate
    eval_parser = sub.add_parser("evaluate", help="Оценить работу диспетчера")
    eval_parser.add_argument("--scenario", required=True, help="JSON файл сценария")
    eval_parser.add_argument("--actions", required=True, help="JSON файл действий диспетчера")
    eval_parser.add_argument("--timing", default='{}', help='JSON: {"ack_seconds": 15}')
    eval_parser.add_argument("--card", default='{}', help='JSON: заполненная карточка')
    eval_parser.add_argument("--api-url", default="http://localhost:11434/v1")
    eval_parser.add_argument("--api-key", default="ollama")
    eval_parser.add_argument("--model", default="qwen2.5:7b")
    eval_parser.add_argument("--no-llm", action="store_true")
    eval_parser.add_argument("--output", default=None)

    args = parser.parse_args()

    if args.command == "generate":
        gen = ScenarioGenerator(args.api_url, args.api_key, args.model)
        print(f"Генерация: модель={args.model}, классификатор={len(gen.classifier)} типов")
        scenarios = gen.generate_batch(args.ids, args.difficulty, args.count, args.temperature)
        gen.save(scenarios, args.output)
        print(f"\nГотово: {len(scenarios)} сценариев")

    elif args.command == "evaluate":
        with open(args.scenario, "r", encoding="utf-8") as f:
            scenario = json.load(f)
        with open(args.actions, "r", encoding="utf-8") as f:
            actions = json.load(f)
        timing = json.loads(args.timing) if isinstance(args.timing, str) else args.timing
        card = json.loads(args.card) if isinstance(args.card, str) else args.card

        evaluator = DispatcherEvaluator(args.api_url, args.api_key, args.model)
        result = evaluator.evaluate(scenario, actions, timing, card, use_llm=not args.no_llm)
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
    else:
        parser.print_help()
