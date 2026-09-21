# Протокол Проверки

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
