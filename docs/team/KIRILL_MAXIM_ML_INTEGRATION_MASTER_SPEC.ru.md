# Мастер-ТЗ ML-команды: Кирилл и Максим

Версия: 2026-09-20. Репозиторий: https://github.com/DanK1-PRO/Hakaton-2026.git, public (с 29.09.2026).

Этот документ описывает, как подключать ML-модели к уже работающему тренажеру ДДС без поломки интерфейса, backend и демонстрационной сборки.

## 1. Что уже готово

В репозитории есть рабочая версия `v0.1.0`:

- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL 15, JWT/Argon2.
- Frontend: React 18, TypeScript, Ant Design, Redux Toolkit.
- Runtime: Docker Compose `api`, `ui`, `db`; Windows-скрипты для локального запуска.
- Данные: классификатор происшествий, три демонстрационных сценария, source provenance.
- ML-граница: mock/local/fallback gateway.
- Тесты: backend pytest, frontend Playwright, GitHub Actions.

Текущий GitHub: https://github.com/DanK1-PRO/Hakaton-2026.git

Перед началом ML-интеграции прочитать:

1. `AGENTS.md`
2. `docs/ai/PROJECT_STATE.md`
3. `docs/ML_INTEGRATION.md`
4. `config/data_contract.json`
5. `config/evaluation_request.schema.json`
6. `config/evaluation_result.schema.json`
7. `ml/example_service.py`
8. `scripts/verify_local_ml.py`

## 2. Главная цель ML-команды

Подключить реальные локальные модели как отдельный сервис, который реализует контракт `POST /v1/evaluate` и не требует переписывания React или основного FastAPI-приложения.

Правильная архитектура:

```text
React UI
  -> FastAPI API
    -> PostgreSQL
    -> backend/app/ml_gateway/gateway.py
      -> local ML HTTP service
```

Неправильная архитектура:

```text
React UI -> ML model
FastAPI imports torch/whisper/model weights directly
ML service writes directly to PostgreSQL
ML service changes session state
```

## 3. Зоны работы

### Зеленая зона ML-команды

Можно менять и добавлять:

- `ml/*`
- `docs/ML_INTEGRATION.md`
- `docs/team/KIRILL_MAXIM_ML_INTEGRATION_MASTER_SPEC.ru.md`
- `docs/team/KIRILL_MAXIM_ML_INTEGRATION_MASTER_SPEC.en.md`
- `scripts/verify_local_ml.py`
- новые файлы `ml/requirements*.txt`
- новые файлы `ml/Dockerfile`, если модель запускается отдельным контейнером
- новые тесты контракта в `backend/tests/*`, если они не ломают mock-режим
- примеры JSON в `docs/evidence/*`

### Желтая зона

Можно менять только после согласования с Даниилом:

- `backend/app/ml_gateway/gateway.py`
- `backend/app/schemas.py`
- `config/evaluation_request.schema.json`
- `config/evaluation_result.schema.json`
- `config/data_contract.json`
- `docker-compose.yml`
- `.github/workflows/*`
- `frontend/src/types.ts`
- `frontend/src/results.tsx`

### Красная зона

Не менять без отдельного решения всей команды:

- `frontend/src/workspace.tsx`, если изменение только ради модели.
- `backend/app/domain.py`, если ML пытается менять правила жизненного цикла карточки.
- `backend/app/models.py` и миграции БД.
- `backend/app/auth.py`.
- `data_derived/classifier/incident_types.json`.
- `Данные заказчика/*`.
- `.env`, `.runtime`, `.venv`, `node_modules`.

## 4. Контракт evaluator v1

ML-сервис должен реализовать:

```text
GET /health
POST /v1/evaluate
```

Запрос должен соответствовать `config/evaluation_request.schema.json`.

Ключевые поля запроса:

- `schema_version`: версия контракта, сейчас `1.0`.
- `session_id`: ID учебной сессии.
- `card`: карточка происшествия.
- `actions`: упорядоченная история действий.
- `reference`: эталон сценария и ожидаемые действия.
- `timing`: авторитетные временные метрики от backend.

Ответ должен соответствовать `config/evaluation_result.schema.json`.

Ключевые поля ответа:

- `schema_version`: `1.0`.
- `session_id`: обязан совпадать с запросом.
- `model_version`: версия модели или пакета.
- `reference_version`: версия эталонов/датасета.
- `mode`: для реальной локальной модели `local`.
- `score`: число или `null`. Если нет утвержденной шкалы, лучше `null`.
- `critical_errors`: список критических ошибок.
- `field_errors`: ошибки по полям карточки.
- `missing_information`: чего не хватило.
- `timing`: оценка временной реакции.
- `routing_assessment`: оценка маршрутизации.
- `comment_quality`: оценка комментариев.
- `explanation`: краткое русское объяснение результата.

## 5. Жесткие ограничения

ML не имеет права:

- Менять состояние сессии.
- Менять карточку происшествия.
- Менять роли и права доступа.
- Самостоятельно писать в PostgreSQL.
- Возвращать скрытый эталон обучающемуся.
- Требовать, чтобы React вызывал ML напрямую.
- Ломать `ML_MODE=mock`.
- Делать основной backend зависимым от тяжелых model libraries.

Backend обязан:

- Проверить JSON-схему ответа.
- Проверить совпадение `session_id`.
- Ограничить время ожидания.
- При ошибке вернуть fallback-результат и сохранить тренировку.

## 6. Как подключать модель

Минимальный путь:

1. Скопировать или заменить логику внутри `ml/example_service.py` либо создать новый сервис рядом, например `ml/evaluator_service.py`.
2. Запустить модель отдельным процессом.
3. Убедиться, что `GET /health` возвращает готовность.
4. Установить в `.env`:

```env
ML_MODE=local
ML_URL=http://127.0.0.1:8090
```

5. Перезапустить API.
6. Пройти полный сценарий в UI.
7. Запустить:

```powershell
.\.venv\Scripts\python.exe scripts\verify_local_ml.py
```

Для Docker модель лучше запускать отдельным сервисом, например `ml-evaluator`, и указывать `ML_URL=http://ml-evaluator:8090`.

## 7. Где будут стычки с интерфейсом

Потенциальные конфликты:

- Модель хочет больше полей, чем есть в карточке.
- Модель возвращает подробную оценку, которую UI пока не умеет красиво показать.
- Модель использует другую шкалу баллов.
- Модель хочет анализировать голос/ASR, а текущий тренажер использует учебный телефон без реального аудио.
- Модель хочет менять маршрутизацию, но маршрутизация сейчас хранится как reference data.

Решение:

- Если нужно новое поле карточки, сначала предложить изменение в `config/evaluation_request.schema.json` и `backend/app/schemas.py`.
- Если нужно новое поле результата, сначала предложить изменение в `config/evaluation_result.schema.json` и пример результата.
- Если UI должен показывать новые данные, открыть задачу для UI-команды и приложить пример JSON.
- Если нужна новая capability, например `asr` или `scenario_generator`, оформить контракт v1 отдельно, не смешивать с evaluator v1.

## 8. Что не делать сейчас

Не нужно:

- Переписывать весь backend под ML.
- Заменять PostgreSQL.
- Добавлять model weights в основной Docker image API.
- Ломать mock-режим.
- Утверждать точность модели без gold-set и методики проверки.
- Вводить официальный числовой скоринг без решения команды/заказчика.
- Делать генератор сценариев обязательным для программы-минимум.

## 9. GitHub-процесс

Основная ветка: `main`.

Ветки:

- `ml/evaluator-local-service`
- `ml/scoring-experiment`
- `ml/asr-contract-proposal`
- `ml/docker-service`

Перед PR:

1. Синхронизироваться с `origin/main`.
2. Проверить, что mock-режим не сломан.
3. Проверить локальную модель.
4. Приложить пример запроса/ответа.
5. Обновить `docs/ML_INTEGRATION.md`, если контракт или запуск изменился.

Минимальные проверки:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests
.\.venv\Scripts\python.exe scripts\verify_local_ml.py
```

Если менялся frontend:

```powershell
cd frontend
npm run build
npx playwright test
```

PR не мерджить, если GitHub Actions красный.

## 10. Definition of Done для ML-интеграции

ML-задача считается готовой, если:

- Модель запускается отдельным сервисом.
- `GET /health` работает.
- `POST /v1/evaluate` проходит JSON-схему.
- `session_id` совпадает с запросом.
- UI получает результат через FastAPI, а не напрямую.
- При падении модели тренировка завершается через fallback.
- `ML_MODE=mock` продолжает работать.
- Есть пример результата в документации или evidence.
- Есть инструкция запуска.
- Тесты проходят локально и в GitHub Actions.

