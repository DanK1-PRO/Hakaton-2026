# Запуск локальной модели

Сначала выполните базовую подготовку из [DEPLOYMENT](DEPLOYMENT.md).
Команды запуска ниже не скачивают зависимости. Подготовка выполняется до переноса в закрытый контур.

## Подготовка Windows

```powershell
.\.venv\Scripts\python.exe -m venv .venv-ml
.\.venv-ml\Scripts\python.exe -m pip install -r ml/requirements.txt
.\.venv\Scripts\python.exe scripts/prepare_model.py
```

Скрипт модели скачивает публичный release (авторизация GitHub опциональна),
проверяет размеры/SHA-256 всех частей и сохраняет `.runtime/models/manifest.json`.
Нужно около 13 GB свободного диска на части и собранный GGUF. Повторный запуск
использует уже проверенные части. Нативные GGUF shards скрипт склеивать откажется.

Проверенный runtime: [llama.cpp b11223](https://github.com/ggml-org/llama.cpp/releases/tag/b11223).
Распакуйте два официальных архива в `.runtime/llama-b11223`:

| Архив | SHA-256 |
|---|---|
| llama-b11223-bin-win-cuda-12.4-x64.zip | `469c7fe904021e825369a4567ead94a4bf08784d319947512c0242dbea0c3aca` |
| cudart-llama-bin-win-cuda-12.4-x64.zip | `8c79a9b226de4b3cacfd1f83d24f962d0773be79f1e7b75c6af4ded7e32ae1d6` |

В текущем стенде окружение, runtime и модель уже подготовлены. Файлы не включены в Git.

## Запуск и остановка

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/start-ml.ps1
powershell -ExecutionPolicy Bypass -File scripts/windows/start-app.ps1 -LocalML
```

Если UI/API уже запущены, сначала выполните `scripts/windows/stop-app.ps1`.
UI: http://127.0.0.1:5173. API: http://127.0.0.1:8000/docs.
Evaluator: 8090. LLM: 8091. Для CPU используйте `start-ml.ps1 -GpuLayers 0`;
производительность CPU не измерена. Параметры `-ModelPath` и `-ServerPath` задают другие локальные пути.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/stop-app.ps1
powershell -ExecutionPolicy Bypass -File scripts/windows/stop-ml.ps1
```

`start-ml.ps1 -FormulaOnly` запускает формулу без GGUF. Обычный `start-app.ps1`
с `ML_MODE=mock` в `.env` сохраняет независимый учебный режим.

## Ручной запуск / Linux

Запустите официальный `llama-server` с `--model <local.gguf> --host 127.0.0.1
--port 8091 --alias local-model --ctx-size 4096 --parallel 1`.
Отдельный evaluator запускается из корня проекта:

```sh
DDS_LLM_URL=http://127.0.0.1:8091/v1 DDS_LLM_TIMEOUT=40 \
  .venv-ml/bin/python -m uvicorn ml.evaluator_service:app --host 127.0.0.1 --port 8090
```

Настройки API: `ML_MODE=local`, `ML_URL=http://127.0.0.1:8090`, `ML_TIMEOUT=45`.
Для Docker loopback хоста отличается от loopback контейнера. Включён host-gateway;
host-side evaluator должен слушать доступный контейнеру интерфейс. Ограничьте доступ
к нему локальной сетью контейнеров. Нативный loopback-прогон модели проверен; GPU Compose-профиль не поставляется.

## Проверка и новые задания

```powershell
# Остановить evaluator launcher; сохранить/запустить LLM отдельно на 8091.
.\.venv\Scripts\python.exe scripts/verify_local_ml.py --real-llm
# Генерация в файл, без изменения БД:
.\.venv-ml\Scripts\python.exe -m ml.run_generator --api-url http://127.0.0.1:8091/v1 --model local-model --ids 681 --count 1 --output .runtime/generated.json
.\.venv\Scripts\python.exe scripts/import_reviewed_scenarios.py .runtime/generated.json
# Только после фактической проверки преподавателем:
.\.venv\Scripts\python.exe scripts/import_reviewed_scenarios.py .runtime/generated.json --reviewer "Имя преподавателя"
```

Сквозной verifier сам использует порты 8001 и 8090 и останавливает свои процессы.
Проверенные заключения выгружаются в кабинете преподавателя кнопкой
«Проверенные заключения» или `GET /api/v1/instructor/dataset.jsonl` с JWT staff.
Свободные комментарии могут содержать введённые человеком сведения: перед будущим обучением нужен просмотр выгрузки.

С 29.09.2026 тот же цикл доступен из интерфейса: кабинет преподавателя → кнопка
«Генерация сценариев» → выбор типа/сложности/количества → предпросмотр →
«Импортировать выбранные». UI ходит только через API
(`POST /api/v1/instructor/scenarios/generate` и `.../import`), валидация пакетов та же,
что у `scripts/import_reviewed_scenarios.py`, поэтому CLI-путь остаётся рабочей
альтернативой без браузера.
