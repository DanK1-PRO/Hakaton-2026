# Протокол Проверки

## 28.09.2026 — финальный интеграционный проход Astra

Этот раздел описывает текущую сборку; сведения ниже сохранены как история.
UI-ветки и выбранные ML runtime-модули уже объединены в `main`.

| Проверка | Фактический результат |
|---|---|
| `ruff check backend ml scripts` | Passed |
| `pytest backend/tests -q` | 33 passed; 2 upstream warnings |
| `npm run build` (frontend) | Passed; предупреждение о размере vendor/MapLibre chunks |
| `npm test` (frontend, mock regression) | 22 passed, desktop + mobile, 1.8m |
| `python scripts/export_contracts.py` | OpenAPI и JSON schemas обновлены |
| `python scripts/verify_local_ml.py` | Local evaluator, concurrent finish и fallback passed |
| `python scripts/verify_local_ml.py --real-llm` | Реальный GGUF: local + fallback passed, model_assessed; 10.42s весь проверочный цикл |
| Windows `start-ml.ps1` / `stop-ml.ps1` | Отдельная `.venv-ml`, model 8091 + evaluator 8090; запуск и освобождение портов проверены |
| Генератор с локальным GGUF, тип 681 | Создан 1 сценарий; dry-run импортера прошёл; в БД не импортирован без проверки преподавателем |
| Офлайн GIS | Локальные PMTiles/glyphs; тест блокирует внешние HTTP-запросы; desktop/mobile passed |

Release `modelURL` скачан, части проверены по опубликованным SHA-256 и собраны.
Файл: 6 474 702 976 байт, SHA-256
`68a8732fb5cee04f83ebffd7924e15c534d4442c5a43d2ba9e2041fe310b8deb`.
Фактический стенд: Windows, RTX 4060 8 GB, RAM 16 GB, llama.cpp b11223.
Это подтверждение работы на одном стенде, не гарантия задержек на другом оборудовании.

Доказательства: [реальный ML](evidence/real-ml-integration.json),
[локальный evaluator/fallback](evidence/ml-integration.json),
[аудит исправлений и остаточных ограничений](FINAL_INTEGRATION_AUDIT.ru.md),
[воспроизводимый запуск](LOCAL_ML_RUN.ru.md).
GitHub CI нового коммита проверяется после публикации; старые зелёные запуски
не считаются доказательством этой ревизии.

Не заявляются: автоматическое дообучение по JSONL, полноценный ASR/TTS/VoIP,
точный адресный геокодер/роутинг, утверждённая заказчиком балльная методика,
нагрузочная или нормативная сертификация. Первая установка зависимостей и
модельных артефактов требует подготовки до переноса в закрытый контур.

## 27.09.2026 — интеграция ML-веток и release `modelURL`

Объект: проверка завершённых ML-веток Кирилла/Максима и безопасное подключение
runtime-части к текущему UI/API-контуру. Проверены `origin/ml/scoring-experiment`,
`origin/ml_end`, `origin/model`, `origin/LocalAPI`, `origin/hht` и GitHub release
`vModel` / tag `modelURL`.

Решение по merge:

| Источник | Решение |
|---|---|
| `ml/scoring-experiment` / `ml_end` | Взят runtime ML-модуль: evaluator service, generator scripts, prompt/setup docs, classifier-derived scenarios. Старое frontend/backend дерево не мержилось, чтобы не удалить текущую UI-сборку. |
| `LocalAPI` | Не включён в runtime: отдельный мини-FastAPI с in-memory auth и `501 Not implemented` для incident CRUD. |
| `hht` | Не включён в runtime: отдельный ML-скелет, ключевые `src/*` файлы являются stub. |
| Release `modelURL` | Зафиксирован как внешний локальный model artifact: 7 GGUF parts GigaChat 3.1, около 6.03 GB. В Git checkout не скачивался. |

Правки:

| Область | Изменения |
|---|---|
| ML runtime | Добавлен `ml/evaluator_service.py` с `/health` и `/v1/evaluate`, `ml/scenario_generator.py`, launch/import scripts и `ml/requirements.txt` |
| Contract | `backend/tests/test_ml_evaluator_service.py` проверяет совместимость результата с `app.schemas.EvaluationResult`, `mode=local`, `schema_version=1.0`, `session_id` и 3-минутный норматив первой записи |
| Gateway evidence | `scripts/verify_local_ml.py` теперь запускает `ml.evaluator_service:app`, затем проверяет потерю сервиса и fallback |
| Docs | README: `.venv` local run; `docs/ML_INTEGRATION.md`: evaluator service и model release; `docs/team/ML_BRANCH_REVIEW.ru.md`: разбор всех ML/non-UI веток |

| Проверка | Фактический результат |
|---|---|
| `git fetch --all --tags --prune` | Получены `origin/ml_end`, `origin/model`, tag `modelURL`; список веток обновлён |
| GitHub release API `modelURL` | Pre-release `vModel`, 7 assets `GigaChat3.1-10B-A1.8B-q4_K_M.part01..part07.gguf` |
| `ruff check backend ml scripts` | Passed после hygiene-правок ML scripts |
| `PYTHONPATH=backend pytest backend/tests/test_ml_evaluator_service.py -q` | 2 passed |
| `PYTHONPATH=backend pytest backend/tests -q` | 20 passed, 2 warnings Starlette/httpx/AnyIO |
| `PYTHONPATH=backend python scripts/verify_local_ml.py` | Passed: `observed_modes=["local", "fallback"]`, concurrent finish idempotent |

Ограничения: GGUF-веса не скачивались и не запускались в этом проходе; проверен
локальный evaluator service и contract/fallback path. Автоматически сгенерированные
`classifier_scenarios.json` требуют методического отбора перед демонстрацией как
официального сценарного корпуса. Балльная методика остаётся командной формулой,
не утверждённой заказчиком.

## 27.09.2026 — интеграция неформальных ответов заказчика по ДДС

Объект: перенос уточнений заказчика из сообщения Даниила в UI/backend-контур без
касания ML-веток. Новый рабочий источник сохранён в
`docs/customer/CUSTOMER_INFORMAL_ANSWERS_2026_09_27.ru.md`.

Правки:

| Область | Изменения |
|---|---|
| Нормативы | Добавлен `first_response_seconds` и `first_response_deadline_seconds=180` в evaluation timing; mock/fallback evaluator даёт критическое замечание при отсутствии первой статусной записи с текстом или превышении 3 минут |
| UI ДДС | На карточке добавлен индикатор «Первая запись … / 3 мин»; help-дrawer описывает цикл ДДС, 30с/3мин, телефонный маршрут через руководителя/старшего группы реагирования |
| ДДС vs 112 | В модальном «Редактирование карточки» добавлено пояснение: диспетчер ДДС не контролирует исходную карту заявителя 112; главная работа MVP — статусы, комментарии, телефонная связь |
| Службы | Справочник служб описан как ручной выбор по району обслуживания и подчинённости, без фактического оповещения |
| Документы | Обновлены SOURCE_OF_TRUTH, REQUIREMENTS_TRACEABILITY, OPEN_QUESTIONS, DATA_CONTRACT |

| Проверка | Фактический результат |
|---|---|
| `.\.venv\Scripts\ruff.exe check backend\app\routers\api.py backend\app\ml_gateway\gateway.py backend\tests\test_flow.py` | Passed |
| `.\.venv\Scripts\pytest.exe backend\tests` | 18 passed, 2 warnings Starlette/httpx/AnyIO |
| `npm run build` в `frontend` | Passed; Vite warning о крупных MapLibre/vendor chunks сохраняется |
| `scripts/windows/start-app.ps1` + `/health` | DB/API/UI подняты; `ml_mode=mock`, UI HTTP 200 |
| `npm test` в `frontend` | 22 passed, 1.8m; ARM/flow/admin/results/mobile + offline GIS |
| `PYTHONPATH=backend python scripts/export_contracts.py` | Exported OpenAPI and four JSON schemas |

Ограничения: официальный классификатор/назначение получателей/источник правильных данных
заказчик ещё уточняет. ML-модели Кирилла/Максима не подключались и не ревьюились.

## 27.09.2026 — Codex review после opencode UI handoff

Объект: проверка прохода opencode на `ui/danil-integration-review` по
`docs/ai/HANDOFF_OPENCODE_UI.md`. ML-ветки и `ml/scoring-experiment` не трогались;
проверялся текущий UI/backend/mock-контур Даниила.

| Проверка | Фактический результат |
|---|---|
| `git fetch origin --prune` + статус ветки | `ui/danil-integration-review` синхронизирована с `origin/ui/danil-integration-review` |
| `rg` по конфликт-маркерам/debug/Yandex/API key | Конфликт-маркеров, `console.log`, `debugger`, живого Yandex/key-flow в UI не найдено; оставшиеся упоминания только в docs/history |
| `npm run build` в `frontend` | Passed; Vite warning о крупных chunks сохраняется из-за MapLibre/vendor bundle |
| `.\.venv\Scripts\pytest.exe backend\tests` | 17 passed, 2 warnings Starlette/httpx/AnyIO |
| Первый `npm test` | 22 failed из-за остановленного локального API/UI (`ECONNREFUSED 127.0.0.1:5173`), не дефект приложения |
| `scripts/windows/start-app.ps1` | Поднял PostgreSQL/API/UI; `/health` вернул `status=ok`, `database=ok`, `ml_mode=mock`, UI вернул HTTP 200 |
| Повторный `npm test` в `frontend` | 22 passed, 1.7m; ARM/flow/results/admin/mobile + `map-gis.spec.ts` для локального PMTiles |
| `git diff --check` | Passed |

Итог: opencode UI pass принят как рабочая основа. Свежие Playwright screenshots
пересняты и сохранены в `docs/images/*`. Реальная ML-интеграция по-прежнему ожидает
ветки Максима/Кирилла; регрессионный режим `ML_MODE=mock` сохранён.

## 22.09.2026 (late evening) — закрытие C1 + снятие EPERM-блокировки билда

Объект: доведение вечернего прохода — справочник профиля ДДС на экране
«Учебные задания» (C1) и восстановление production-сборки после EPERM на
`frontend/dist/assets`.

Правки:

| Пробел | Изменения |
|---|---|
| C1 | `pages.tsx` `Training()`: импорт `DDS_PROFILES`/`DEFAULT_PROFILE_ID`, хелперы `loadProfileId`/`saveProfileId` (localStorage `dds_profile_id`), `<section data-testid="dds-profile-band">` с `<Select data-testid="dds-profile-select" aria-label="Выбрать профиль ДДС">`, панелью (зона/реагирование/отказ/на что обратить внимание) и сноской «Справочник вариантов · TEAM_PROPOSAL»; `styles.css` `.profile-band*` + адаптив ≤1100px/≤700px |
| EPERM | Найдены блокирующие процессы (`vite preview` PID 8868, npm preview PID 9560); dev-сервер 5173 (PID 17104) сохранён. Остановка сняла блокировку, `tsc -b && vite build` снова проходит |
| Тест | `flow.spec.ts`: `dds-profile-band` visible + `dds-profile-select` visible (локатор через testid — `getByLabel` давал strict mode violation из-за дубля aria-label на обёртке Ant Select и inner input) |

| Проверка | Фактический результат |
|---|---|
| `pytest` (backend, `.venv`) | 16 passed |
| Playwright (desktop+mobile) | 22 passed |
| `tsc --noEmit` | Passed |
| `vite build` | Passed (vendor >500 kB warning as before) |
| OPEN_QUESTIONS C1 | → `CLOSED` |
| PROJECT_STATE / TASK_QUEUE / SIMULATION_PLAYBOOK | Обновлены, расхождение PLAYBOOK:31/191 с кодом устранено |

## 22.09.2026 — закрытие пробелов B9/B10/C2/C3/C4 (команда без заказчика)

Объект: вертикальный проход по API/React после UI-аудита. Заказчик больше не
предоставляет материалы; пробелы A1–A19, B1–B13, C1–C8, D*, E* переведены в
`TEAM_DECISION`/`CLOSED` в `docs/OPEN_QUESTIONS.md` (без выдуманных официальных
правил).

Правки:

| Пробел | Изменения |
|---|---|
| B9 | `views.py`: `event_view`/`feedback_view` + `actor_names` resolve; `incident_view`/`session_view` резолвят имена. Frontend `types.ts` `actor_name`/`author_name`, `ServiceDock` «оп. {name}», History, Alert «Комментарий преподавателя · {author}» |
| B10 | `domain.py` 422 «Укажите итог выполненных работ» для `completed`; правило формы в `workspace.tsx` включает `completed` |
| C2 | `api.py` `EXPECTED_HINTS` → `expected_hint` на `/scenarios` (список); `pages.tsx` блок `scenario-expected-hint` «Методподсказка · ожидаемая линия»; `styles.css` `.scenario-hint` |
| C3 | `ServiceDock`: «справочник · без оповещения», Tooltip, aria-label «Справочник маршрутов»; `workspace` Alert/заголовок drawer справочника |
| C4 | `workspace`: Tooltip на Select ЧС/ЧП и «Статус/Итог обращения» — «учебный контур vs боевая АРМ» |

| Проверка | Фактический результат |
|---|---|
| `pytest` (backend) | 16 passed |
| Playwright (desktop+mobile) | 22 passed |
| `tsc --noEmit` | Passed |
| `vite build` | Passed (vendor >500 kB warning as before) |
| `python scripts/export_contracts.py` | Exported OpenAPI + 4 JSON schemas |
| Тесты обновлены | `test_flow.py` (422 completed, expected_hint, actor_name), `arm.spec.ts` (новые атрибуты) |

## 22.09.2026 — полный UI-аудит: сходство с АРМ, мобильная версия, мелкие баги

Объект: проход по всему React UI сверке со скриншотами заказчика
(`СКРИНШОТ ДДСГСИ.docx`, `СКРИНШОТ КАРТОЧКИ 112ГСИ.docx`, `СЛУЖБЫ 112.docx`,
`КАРТОЧКА 112.docx`, памятка АРМ-112), проверка консоли, desktop/mobile.

Найденные дефекты и правки:

| Дефект | Источник сравнения | Правка |
|---|---|---|
| Мобильный service-dock сжимал плитки служб в вертикальный текст | mobile 390px vs `СЛУЖБЫ 112` | `arm.css`: min-width 148px, flex-basis, перенос строк |
| «Занятие завершено» переносилось по буквам на десктопе | desktop service bar | `arm-lock-note`: `flex: none`, min-width 118px |
| Адресная сетка без Объект/Стр/сокр/Квартира/Этаж/Код | Card-112 image1 (14 полей) | `addressParts()` расширен до 14 полей |
| Заголовок класса без «Класс.:» и «;» | DDS image10 | `Класс.: {type} ;` |
| Заголовок типа полным именем вместо кода | DDS image10 «Происшествие 101» | `Происшествие {external_code}` |
| Признаки без завершающей « .» | DDS image10 features | join + trailing `.` |
| Флаги Пострадавшие/Отказ/Заблокированные как жёлтые кнопки | DDS image10 — серые текстовые | `.arm-flag-text` |
| ЧП без оранжевого акцента | DDS image10 | `.arm-flag-emergency` |
| Нет карандаша редактирования признаков | DDS image10 | disabled pencil + tooltip |
| Нет select «Выберите статус»/«Итог обращения» у заявителя | DDS image10 | 2 disabled Select + tooltip |
| Нет таймера вызова/просрочки в identity-блоке | DDS image10 red/black timer | `.arm-timer-box` (call/late >30s) |
| Редактор статуса тёмно-синий | DDS image11/13/14 — светлый | reaction modal `#d5d8da`, белые inputs |
| Оператор дублировался в форме статуса | DDS image11 — без operator field | Form.Item «Оператор» удалён |
| Список: одна колонка «Поступило» | DDS image5 «Дата» + «Время» | split columns, scroll x=1100 |
| История службы без «оп. ДДС ·» | DDS image10 «оп. 0 ·» | ServiceDock history prefix |
| Описательный адрес без отдельной строки bold | DDS image10 | `.arm-description b` block |

| Проверка | Фактический результат |
|---|---|
| `npm run typecheck` | Passed |
| `npm run build` | Passed (vendor >500 kB warning as before) |
| `E2E_BASE_URL=http://127.0.0.1:4173 npx playwright test` | 22 passed (desktop+mobile), 1.6m |
| `.venv\Scripts\python.exe -m pytest -q` | 15 passed → 16 after B10/C2/B9 tests |
| Консоль браузера (login/list/card/training/results, desktop+mobile) | 0 errors |
| `git diff --check` | Passed |

Скриншоты до/после: `docs/images/ui-audit-*.png`,
`docs/images/arm-reference-{desktop,mobile}.png`,
`docs/images/workspace-{desktop,mobile}.png`,
`docs/images/arm-reaction-{desktop,mobile}.png`.

Ограничения (намеренно не трогали): login остался учебным брендом ДДС, а не
городским экраном «112»; ЧС/ЧП/передача служб — disabled/справочные (C3/C4 закрыты
тултипами/подписями, API признаков нет);VoIP/SMS/аудио не подключены; ML по-прежнему mock.

## 22.09.2026 — offline GIS map: prod/preview fix

Объект: фикс загрузки OSM/PMTiles-карты в production-бандле (preview :4173).

Корень: Vite-плагин `maplibreWorkerAsset` копировал только `maplibre-gl-worker.mjs`,
но воркер импортирует `./maplibre-gl-shared.mjs`. На preview отсутствующий shared
отдавался SPA-fallback (`index.html`, `text/html`), воркер падал, тайлы оставались
`loading` без range-запросов; через 12s срабатывал SVG-fallback и тест
`map-gis.spec.ts` падал по `content-length > 17000`. На dev (5173) shared брался
из `node_modules`, поэтому dev был зелёным.

| Проверка | Фактический результат |
|---|---|
| `frontend/vite.config.ts` `closeBundle` | Копирует `maplibre-gl-worker.mjs` и `maplibre-gl-shared.mjs` в `dist/assets` |
| `window.__ddsMap` | Только при `import.meta.env.DEV` (диагностика prod убрана) |
| `npm run build` | Passed |
| `npm run typecheck` | Passed |
| `E2E_BASE_URL=http://127.0.0.1:4173 npx playwright test map-gis --project=desktop` | 1 passed, 1.7s |
| `npm test` (полный desktop+mobile) | 22 passed, 1.7m |
| `python -m pytest -q` | 15 passed |
| `git diff --check` | Passed |

## 21.09.2026 — ветка `ui/danil-integration-review`

Объект: интеграционная UI-ветка Даниила с приближением рабочего места ДДС к
скриншотам заказчика и защитой стыков перед ветками Сани/Никиты/ML. Локально:
Windows, PostgreSQL 15, API `127.0.0.1:8000`, UI `127.0.0.1:5173`, Chromium
Playwright desktop/mobile.

| Проверка | Фактический результат |
|---|---|
| `scripts/windows/start-app.ps1` | Успешно подняты DB/API/UI; `.env` сохранён |
| `npm run build` в `frontend` | TypeScript + Vite production build passed; остаётся предупреждение о vendor bundle >500 kB |
| `npx playwright test tests/arm.spec.ts` | 8 passed, 39.6s; ARM layout, локальная карта, история службы, conflict reload, отказ, lock, staff view |
| `npm test` в `frontend` | 20 passed, 1.6m; flow + ARM desktop/mobile, результаты/админка/фильтры Сани |
| `.\.venv\Scripts\pytest.exe backend\tests` | 15 passed, 2 warnings Starlette/httpx/AnyIO |
| `git diff --check` | Passed |

Финальная UI-интеграция 21.09.2026: в `ui/danil-integration-review` объединены
ветки `ui/sanya-results-admin` и `ui/nikita-card-flow`. Конфликты разрешены так:
screenshots пересняты после общего merge; flow-тесты Сани сохранены и адаптированы;
ARM workspace Даниила оставлен основой; из Никиты перенесены loading/empty states,
Timeline colors и locked-state проверка; старый visual layer с gradients/radius/shadows
отклонён. Карта переведена в полностью локальный режим: встроенная схема Москвы,
детерминированная точка происшествия по адресу и учебный маршрут службы; ключи/API
и внешнее геокодирование не используются. Проверки после UI merge: `npm run build` passed,
`npx playwright test tests/arm.spec.ts` 8 passed, `npm test` 20 passed,
`.venv\Scripts\pytest.exe backend\tests` 15 passed, `git diff --check` passed.

Финальный offline-map pass 21.09.2026: Yandex/API key flow удалён из UI и
документов. `MapPanel` теперь работает как локальная схема Москвы с округами,
маршрутом службы и маркером адреса; будущий точный слой должен подключаться из
локальных OSM/PMTiles/MBTiles-файлов. Проверки после pass: `npm run build` passed,
`npx playwright test tests/arm.spec.ts` 8 passed, `npm test` 20 passed,
`.venv\Scripts\pytest.exe backend\tests` 15 passed, `git diff --check` passed.

Дополнительный UI/map pass 21.09.2026 после добавления заказчиком `КАРТОЧКА 112.docx`
и `СЛУЖБЫ 112.docx`: extractor теперь кэширует embedded media из всех customer DOCX;
из новых файлов локально извлечено 39 и 55 PNG соответственно. Рабочая карточка получила
frontend-only адресную сетку в стиле Card-112, оранжевую активную service/action bar
`#ec653b`, кнопку `карта` и локальный `MapPanel`. Реальный онлайн-провайдер карт
отменён по требованию закрытого контура: адрес происшествия не передаётся наружу,
внешние API не вызываются, ключи карт в UI не запрашиваются. `scripts/extract_sources.py` в текущей backend `.venv` passed с честным skip
PDF/XLSX частей до установки `scripts/requirements-tools.txt`, при этом DOCX media cache
обновлён. Проверки этого прохода: `npm run build` passed, `npx playwright test
tests/arm.spec.ts` 8 passed, `npm test` 16 passed, `.venv\Scripts\pytest.exe backend\tests`
15 passed, `.venv\Scripts\ruff.exe check scripts\extract_sources.py` passed,
`git diff --check` passed.

Повторный визуальный проход по `Работа с АРМ-112 для ДДС от ОКр_ГСИ.pdf` и
`СКРИНШОТ ДДСГСИ.docx` выполнен 21.09.2026 после коммита `af05611`.
Изменения: более плотная ARM-сетка, реальные source-colors, справочные плитки
служб ЕКП, нижний синий редактор статуса, учебные подсказки вынесены из основного
поля. Проверки после прохода: `npm run build` passed, `npx playwright test
tests/arm.spec.ts` 8 passed, `npm test` 16 passed, backend pytest 15 passed.
Контрольные computed colors совпали с source-палитрой для canvas/panel/service/
active/classification блоков.

Новые скриншоты: `docs/images/arm-reference-desktop.png`,
`docs/images/arm-reference-mobile.png`, `docs/images/arm-reaction-desktop.png`,
`docs/images/arm-reaction-mobile.png`. Снимки содержат синтетические учебные данные.

Зафиксированное ограничение: это учебное приближение к АРМ ДДС, не полная копия
всех служебных панелей. Реализована одна ДДС, mock-связь и справочный список
маршрутов без фактической передачи другим службам.

Интеграционная проверка ветки Сани `origin/ui/sanya-results-admin`:
ветка меняет `frontend/src/pages.tsx`, `frontend/src/results.tsx`,
`frontend/src/styles.css`, `frontend/tests/flow.spec.ts`, docs/images. Прямого
конфликта с `workspace.tsx`/`frontend/src/arm/*` нет, но перед общим merge нужно
обновить тест `frontend/tests/flow.spec.ts:149`: локатор `.workspace-heading`
устарел после нового ARM-экрана Даниила.

Дата: 20.09.2026. Объект: DDS-2026 v0.1.0, программа-минимум Даниила.
Локально Windows, Python 3.12, PostgreSQL 15.18 (изолированный переносимый запуск),
Chromium Playwright. Python 3.11 проверен в CI/контейнере.

| Проверка | Фактический результат |
|---|---|
| `python -m pytest -q` | 15 passed, 6.54s после обновления FastAPI/Starlette/JWT |
| `ruff check backend ml scripts` | Passed |
| `npm run build` | TypeScript + production build; предупреждение о размере vendor bundle |
| `npm test` | 8 passed, 44.1s; desktop 1440px и mobile 390px; задержанный GET после звонка |
| `pip-audit -r backend/requirements.txt` | No known vulnerabilities found |
| `npm audit` | 0 vulnerabilities |
| Полный stop/start API/UI/PostgreSQL | 2 ранее сохранённые оценки совпали после запуска |
| Отдельный local ML, затем остановка ML | mode=local, затем mode=fallback; сессии завершены |
| Два одновременных запроса завершения в PostgreSQL | Один сохранённый результат, оба ответа совпали |
| GitHub Compose smoke | Passed: api/ui/db, миграции/seed, HTML UI и health через nginx |
| GitHub Linux integration | Passed: Python 3.11, PostgreSQL 15, pytest, Ruff, build, 8 browser tests |

Успешный запуск: [GitHub Actions #35509118528](https://github.com/DanK1-PRO/Hakaton-2026/actions/runs/35509118528).
Проверенный код: `9d0227c8a45f7aa03961ee8255e71732262ce41a`.
Последующий коммит фиксации протокола/памяти/PDF не меняет приложение.

Первый запуск CI был остановлен после обнаружения HEAD-проверки GET-маршрута.
Следующий выявил реальный конфликт версии после телефонного действия.
Обе причины исправлены; финальный прогон прошёл без автоматических повторов тестов.
Регрессия воспроизводится искусственной двухсекундной задержкой GET-ответов.

## Что Проверяют Тесты

Сервер: неверный пароль/JWT, доступ только к своим карточкам, невозможность записи
преподавателем в чужую карточку, переходы статусов и отказ с обязательным комментарием,
терминальная блокировка, конфликт версии, просрочка подтверждения, повторный старт/
завершение, порядок телефонных событий, закрытие разговора, сохранение исходной
оценки при заключении преподавателя, недоступность БД, неверные DTO/идентификатор ML,
тайм-аут и HTTP-ошибка ML.

Браузер: русский рабочий цикл с реальным API/PostgreSQL, классификация, редактирование,
телефон, статусы, итог и перезагрузка, поиск карточки, создание пользователя администратором,
ввод заключения преподавателем, скачивание CSV, неверный пароль, сохранение введённой формы
при сетевой ошибке. Проверяется отсутствие ошибок JavaScript и общего горизонтального
переполнения; широкие таблицы имеют собственную прокрутку.

## Воспроизводимость

- [Методика испытаний](ACCEPTANCE.md), [запуск](DEPLOYMENT.md).
- `scripts/check_persistence.py before`, остановка/запуск, затем `after`.
- `scripts/verify_local_ml.py` требует свободные порты 8001/8090; собственные процессы останавливает.
- [Сохранность](evidence/persistence.json), [ML](evidence/ml-integration.json),
  [Python audit](evidence/python-audit.json).
- Фактические снимки находятся в `docs/images/`, Playwright HTML/trace остаются
  локально или в артефакте GitHub Actions.

## Ограничения Доказательств

Функциональные тесты не доказывают 100 одновременных пользователей, реальный VoIP,
полную отказоустойчивость и официальное соответствие ГОСТ. Unit-тесты используют SQLite;
браузер, миграции и интеграционный запуск используют PostgreSQL.
Два предупреждения устаревшего API приходят из Starlette TestClient/httpx/AnyIO;
ошибок тестов нет. Отдельная приёмка общего командного проекта ещё требуется.
