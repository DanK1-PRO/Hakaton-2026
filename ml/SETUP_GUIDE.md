# ML Система DDS 112: Полная инструкция запуска

## Архитектура системы

```
┌─────────────────────────────────────────────────────────────────┐
│                        ПОЛЬЗОВАТЕЛЬ                             │
│                                                                 │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │ Frontend  │────▶│   Backend    │────▶│   ML Gateway     │    │
│  │ React UI  │     │  FastAPI     │     │ gateway.py       │    │
│  │ :5173     │     │  :8000       │     │                  │    │
│  └──────────┘     └──────┬───────┘     └────────┬─────────┘    │
│                          │                      │               │
│                          ▼                      ▼               │
│                   ┌─────────────┐      ┌──────────────────┐    │
│                   │ PostgreSQL  │      │  Evaluator       │    │
│                   │ :55432      │      │  Service :8091   │    │
│                   └─────────────┘      └────────┬─────────┘    │
│                                                  │               │
│                                                  ▼               │
│                                         ┌──────────────────┐    │
│                                         │  Local LLM       │    │
│                                         │  LM Studio :1234 │    │
│                                         │  GigaChat 3.1    │    │
│                                         └──────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 ML Pipeline (ml/)                         │  │
│  │                                                           │  │
│  │  Классификатор ──▶ ScenarioGenerator ──▶ Сценарий        │  │
│  │  (1283 типа)      (LLM генерация)      (JSON)            │  │
│  │                                                           │  │
│  │  Сценарий + Действия ──▶ DispatcherEvaluator ──▶ Оценка │  │
│  │                           (Формула + LLM)      (0-10)    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Потоки данных

```
ПОТОК 1: ГЕНЕРАЦИЯ СЦЕНАРИЯ
═══════════════════════════════════════════════════════

incident_types.json ──┐
                      ├──▶ build_generation_prompt() ──▶ LLM ──▶ JSON сценария
demo.json (few-shot) ─┘                                    │
                                                           ▼
                                              calculate_difficulty()
                                                           │
                                                           ▼
                                              generated.json (сценарий + сложность)


ПОТОК 2: ОЦЕНКА ДИСПЕТЧЕРА
═══════════════════════════════════════════════════════

Сценарий (reference) ────┐
Действия диспетчера ─────┤
Время (timing) ──────────┼──▶ calculate_dispatcher_score() ──▶ Score: 0-10
Заполненная карточка ────┘         │
                                   ├──▶ Штрафы: -3.0 ... -1.0
                                   ├──▶ Бонусы: +0.5 ... +1.0
                                   │
                                   ▼
                          build_evaluation_prompt() ──▶ LLM ──▶ Комментарий
                                   │
                                   ▼
                          EvaluationResult (балл + ошибки + комментарий)
```

### Файловая структура

```
Hakaton-2026/
├── ml/
│   ├── scenario_generator.py    # ГЛАВНЫЙ: генератор + оценщик
│   ├── evaluator_service.py     # FastAPI API оценки (:8091)
│   ├── run_generator.py         # CLI обёртка
│   ├── local_server.py          # LLM сервер (llama-cpp-python)
│   ├── start_and_generate.py    # Быстрый запуск
│   ├── PROMPT_TEMPLATE.md       # Универсальный промпт
│   ├── example_service.py       # Пример контракта
│   ├── import_from_excel.py     # Импорт из Excel
│   ├── import_scenarios.py      # Импорт из JSON
│   └── requirements.txt         # Зависимости
│
├── data_derived/
│   ├── classifier/
│   │   └── incident_types.json  # 1283 типа происшествий
│   └── scenarios/
│       ├── demo.json            # 3 учебных сценария
│       ├── classifier_scenarios.json  # 1283 из классификатора
│       └── generated.json       # Сгенерированные LLM
│
├── backend/
│   └── app/
│       └── ml_gateway/
│           └── gateway.py       # Шлюз к ML-сервису
│
└── config/
    ├── evaluation_request.schema.json
    └── evaluation_result.schema.json
```

---

## Инструкция запуска: от А до Я

### Шаг 1. Установить зависимости

```cmd
cd C:\Users\Пользователь\PycharmProjects\hht\Hakaton-2026
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.venv\Scripts\python.exe -m pip install fastapi uvicorn pydantic httpx
```

### Шаг 2. Скачать модель GigaChat

**Вариант А: Через LM Studio (рекомендуется)**

1. Скачай LM Studio: https://lmstudio.ai
2. Открой LM Studio
3. Нажми **🔍** (поиск моделей) в левой панели
4. В поиске напиши: `GigaChat3.1-10B`
5. Скачай вариант **q4_K_M** (6 ГБ) или **q3_K_M** (4 ГБ, для GPU 4 ГБ)
6. Дождись скачивания

**Вариант Б: Через Ollama**

```cmd
ollama pull ai-sage/GigaChat3.1-10B-A1.8B:q4_K_M
```

### Шаг 3. Запустить LLM-сервер

**Вариант А: LM Studio**

1. Открой LM Studio
2. Слева нажми **▶** (Chat) → выбери модель `GigaChat3.1-10B-A1.8B-q4_K_M`
3. Слева нажми **<>** (Server) → **Start Server**
4. Сервер запустится на `http://localhost:1234/v1`
5. Проверь: открой `http://localhost:1234/v1/models` в браузере

**Вариант Б: Ollama**

```cmd
ollama serve
```

Сервер: `http://localhost:11434/v1`

**Вариант В: llama-cpp-python**

```cmd
.venv\Scripts\python.exe ml\local_server.py
```

Сервер: `http://localhost:8080/v1`

### Шаг 4. Проверить сервер

```cmd
.venv\Scripts\python.exe -c "import httpx; print(httpx.get('http://localhost:1234/v1/models').json())"
```

Должен вернуть список моделей.

### Шаг 5. Запустить генерацию сценариев

```cmd
.venv\Scripts\python.exe ml\run_generator.py --api-url http://localhost:1234/v1 --model local-model --ids 5 100 --count 1
```

Результат: `data_derived/scenarios/generated.json`

### Шаг 6. Запустить evaluator service (API оценки)

```cmd
set PYTHONPATH=backend
.venv\Scripts\python.exe -m uvicorn ml.evaluator_service:app --host 127.0.0.1 --port 8091
```

Проверь: `http://127.0.0.1:8091/health`

### Шаг 7. Запустить весь стек (backend + frontend + ML)

```cmd
# Терминал 1: PostgreSQL
powershell -ExecutionPolicy Bypass -File scripts\windows\start-db.ps1

# Терминал 2: Backend API
set PYTHONPATH=backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Терминал 3: Frontend
node frontend\node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173

# Терминал 4: ML Evaluator
.venv\Scripts\python.exe -m uvicorn ml.evaluator_service:app --host 127.0.0.1 --port 8091
```

---

## Формулы

### Формула сложности сценария

```
Базовый балл: 1.0

+ Вес типа происшествия:
  пожар = +2.5, ДТП = +2.0, взрыв = +3.0, обрушение = +3.0,
  утечка газа = +2.5, запах газа = +1.5, авария = +2.0

+ Вес признаков:
  открытое пламя = +1.5, пострадавшие = +2.5, погибшие = +3.0,
  эвакуация = +2.0, опасный груз = +2.0, нет доступа = +1.5

+ Вес места:
  на улице = +1.0, жилой дом = +2.0, метро = +2.5,
  транспорт = +1.5, объект = +2.0

Итог: min(10, max(1, сумма))
Пороги: ≤3.0 = easy, ≤6.0 = medium, >6.0 = hard
```

### Формула оценки диспетчера

```
Начальный балл: 10.0

Штрафы:
  Неправильное поле карточки:           -2.0
  Пропущенное действие:                 -1.5
  Критическая ошибка:                   -3.0
  Медленное подтверждение (>30 сек):     -1.0
  Очень медленное (>60 сек):            -2.0
  Неправильный вызов службы:            -2.5
  Не зафиксирован адрес:                -1.5

Бонусы:
  Быстрое подтверждение (<10 сек):      +0.5
  Правильная маршрутизация:             +1.0
  Уточняющие вопросы:                   +0.5

Итог: min(10, max(0, балл))
```

---

## Использование

### Генерация сценариев

```cmd
# Все типы, 1 сценарий на тип
python ml\run_generator.py --api-url http://localhost:1234/v1

# Конкретные типы, 3 сценария
python ml\run_generator.py --ids 5 100 200 --count 3

# Только easy
python ml\run_generator.py --difficulty easy --count 5
```

### Оценка диспетчера

```cmd
# Только по формуле (без LLM)
python ml\run_generator.py evaluate --scenario s.json --actions a.json --no-llm

# Формула + LLM-комментарий
python ml\run_generator.py evaluate --scenario s.json --actions a.json
```

### API (evaluator service)

```cmd
# Health check
curl http://localhost:8091/health

# Оценка
curl -X POST http://localhost:8091/v1/evaluate -H "Content-Type: application/json" -d @request.json
```
