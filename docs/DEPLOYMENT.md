# Развёртывание / Deployment

## Docker Compose

Требования: Docker Engine/Desktop с Compose v2, свободные порты 8080 и 8000. Сборке нужен интернет для зависимостей; после сборки mock-режим работает локально.

1. Клонировать публичный репозиторий: `git clone https://github.com/DanK1-PRO/Hakaton-2026.git`
   (авторизация GitHub не требуется).
2. Выполнить `python scripts/init_local.py`. Скрипт создаёт .env со случайными секретами и сохраняет существующий файл.
3. Выполнить `docker compose up --build -d --wait`.
4. Открыть http://localhost:8080 и http://localhost:8000/docs.
5. Проверка: `docker compose ps`, `docker compose logs api`, GET /health.

DATABASE_URL из .env предназначен для нативного Windows-запуска; Compose сам задаёт внутренний адрес db:5432. Пароли PostgreSQL и JWT передаются через .env. DEMO_PASSWORD применяется только при создании отсутствующих учётных записей, а не меняет существующие пароли.

Остановка: `docker compose down`. Том postgres_data сохраняется. Не используйте удаление томов для обычной остановки.

## Windows без Docker

Нужны Python 3.11/3.12, Node.js 22 и npm.

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
npm.cmd ci --prefix frontend
npm.cmd ci --prefix scripts/windows
.\.venv\Scripts\python.exe scripts/init_local.py
powershell -ExecutionPolicy Bypass -File scripts/windows/start-app.ps1
```

UI: http://127.0.0.1:5173. PostgreSQL: 127.0.0.1:55432. API: 127.0.0.1:8000.
Если Python 3.11 не установлен, допустим 3.12 для локальной разработки; контейнер/CI остаётся 3.11.

Скрипт использует PostgreSQL 15 из npm-пакета @embedded-postgres/windows-x64. Системная служба не устанавливается. Данные находятся в .runtime/pgdata. При кириллице в пути используется свободный псевдодиск P:, указывающий на ту же папку. Это не копия репозитория и не новый раздел диска: Windows показывает тот же каталог под ASCII-буквой, потому что PostgreSQL initdb на Windows нестабилен с кириллицей в пути. Занятый чужой P: не перезаписывается. Для такой ситуации используйте ASCII-путь клона или Docker.

Остановка приложения и БД:
`powershell -ExecutionPolicy Bypass -File scripts/windows/stop-app.ps1`.
Если P: был создан launcher-ом и указывает именно на этот проект, stop-скрипт снимает его автоматически. Для ручной проверки используйте `subst`; для ручного снятия после остановки приложения можно выполнить `subst P: /D`.
Логи: .runtime/api-error.log, ui-error.log, postgres.log. Фоновые процессы запускаются со скрытым окном.

## GitHub Codespaces

Репозиторий содержит `.devcontainer/devcontainer.json` (Python 3.11, Node 22,
Docker-in-Docker, порты 8000/8080/5173), поэтому его можно открыть в облачном окружении
GitHub без локальной установки: **Code → Codespaces → Create codespace on main** или
`https://codespaces.new/DanK1-PRO/Hakaton-2026`. Нужен только аккаунт GitHub; инвайт
в репозиторий не требуется. После создания окружения выполните `python scripts/init_local.py` и
`docker compose up --build -d --wait`, затем пробросьте порт 8080. Лимиты бесплатного
тарифа и статус «временное окружение, не боевой сервер» описаны в
[инструкции для заказчика](CUSTOMER_GUIDE.ru.md).

## Ручной запуск на другой ОС

1. Создать PostgreSQL15 БД/пользователя и .env с DATABASE_URL.
2. Установить backend/requirements.txt в виртуальное окружение.
3. `PYTHONPATH=backend alembic -c backend/alembic.ini upgrade head`.
4. `PYTHONPATH=backend python -m app.seed`.
5. `PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8000`.
6. В frontend: `npm ci`, `npm run dev`.

## Резервирование

Для Compose: `docker compose exec -T db pg_dump -U dds -d dds -Fc > backup.dump`.
Восстановление проверяется на отдельной тестовой БД через pg_restore, не поверх текущих учебных результатов без согласования. Храните резервную копию отдельно от тома и исходного кода.

## Учебная сеть

Loopback выбран по умолчанию. Для согласованного LAN-развёртывания настройте адрес публикации, TLS reverse proxy, индивидуальные учётные записи и ограничения доступа. Отдельно согласуйте аппаратные ресурсы и нагрузочную проверку. Docker host.docker.internal нужен только при подключении ML, находящегося на хосте; на Linux используйте сервис Compose или согласованное имя хоста.
