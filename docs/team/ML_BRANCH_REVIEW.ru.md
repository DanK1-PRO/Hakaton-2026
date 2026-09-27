# Проверка ML-веток и release модели

Дата: 2026-09-27. База проверки: `ui/danil-integration-review` после UI-интеграции, offline GIS и уточнений заказчика по ДДС.

## Что проверено

| Источник | Head / tag | Итог |
|---|---:|---|
| `origin/ml/scoring-experiment` | `37ef873` | Основная ML-ветка. Runtime-кандидат: `ml/evaluator_service.py`, генератор сценариев и инструкции. Интегрируется выборочно, без старого frontend/backend дерева. |
| `origin/ml_end` | `37ef873` | Дубликат `ml/scoring-experiment`; отдельного merge не требует. |
| `origin/model` | `e5294d3` | Указывает на старый `main`, кода модели не содержит. Используется как target release `modelURL`. |
| `origin/LocalAPI` | `cda033f` | Отдельный минимальный FastAPI-проект с in-memory auth и `501 Not implemented` для incident CRUD. В runtime не включается, чтобы не заменить основной API. |
| `origin/hht` | `89c0fae` | Отдельный ML-скелет: `src/evaluate.py`, `src/generate.py`, `src/classifier.py` являются stub-файлами. В runtime не включается. |
| Release `modelURL` / `vModel` | tag `modelURL` | Pre-release с 7 GGUF assets `GigaChat3.1-10B-A1.8B-q4_K_M.part01..part07`, суммарно около 6.03 GB. В репозиторий не скачивается. |

## Почему не выполнен прямой merge всех деревьев

`LocalAPI`, `hht` и старая база `ml/scoring-experiment` не основаны на текущей UI/API-сборке. Прямой merge этих деревьев приводит к удалению текущего frontend, backend, документации, offline-карты и проверенных тестов. Поэтому применён безопасный интеграционный режим:

1. В рабочую сборку переносится ML-модуль и derived-сценарии из `ml/scoring-experiment`.
2. Backend остаётся единственным API. React продолжает обращаться только к FastAPI backend.
3. ML работает за `ml_gateway` через HTTP contract `/v1/evaluate`.
4. Веса GGUF остаются внешним локальным артефактом release, не частью Git checkout.
5. `ML_MODE=mock` остаётся обязательным regression path.

## Что вошло в runtime

- `ml/evaluator_service.py` — локальный evaluator service contract v1.
- `ml/scenario_generator.py` — генератор сценариев и формульный evaluator.
- `ml/run_generator.py`, `ml/start_and_generate.py`, `ml/local_server.py` — вспомогательные launch/LLM scripts.
- `ml/PROMPT_TEMPLATE.md`, `ml/SETUP_GUIDE.md`, `ml/requirements.txt` — инструкции и зависимости ML-контура.
- `data_derived/scenarios/classifier_scenarios.json` — сценарии, производные от классификатора, для будущего расширения каталога.
- Backend contract test `backend/tests/test_ml_evaluator_service.py`.

## Оставшиеся стыки для финального Astra-прохода

- Проверить качество сценариев `classifier_scenarios.json`: сейчас это автоматическая производная классификатора, а не утверждённый заказчиком сценарный корпус.
- Решить, нужно ли UI-переключение сложности/каталога сценариев в MVP или оставить как backend/ML capability.
- Проверить реальную сборку GGUF частей из release `modelURL` на машине с достаточным диском/RAM/GPU. Код проекта не должен зависеть от скачивания весов для обычного запуска.
- Уточнить официальную балльную методику: текущий evaluator даёт формульный score, но customer-approved scoring rubric пока отсутствует.
