"""
Быстрый запуск: локальный сервер + генератор сценариев.

Использование:
    1. Открой терминал в папке Hakaton-2026
    2. python ml/start_and_generate.py
    3. Жди пока модель загрузится (~30 сек)
    4. Сценарии появятся в data_derived/scenarios/generated.json
"""

import subprocess
import sys
import time
import httpx
from pathlib import Path

ROOT = Path(__file__).parent.parent
PY = sys.executable


def wait_for_server(url="http://127.0.0.1:8091/v1/models", timeout=120):
    """Ждёт пока сервер поднимется."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = httpx.get(url, timeout=2)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(2)
    return False


def main():
    print("=" * 60)
    print("  ЗАПУСК: Локальный LLM + Генератор сценариев DDS 112")
    print("=" * 60)

    # 1. Запускаем сервер в фоне
    print("\n[1/3] Запускаю локальный LLM-сервер...")
    server_proc = subprocess.Popen(
        [PY, str(ROOT / "ml" / "local_server.py")],
        cwd=str(ROOT),
    )

    # 2. Ждём пока поднимется
    print("[2/3] Жду загрузку модели (~30-60 сек)...")
    if not wait_for_server():
        print("ОШИБКА: Сервер не запустился. Проверьте путь к модели в local_server.py")
        server_proc.terminate()
        return

    print("  Сервер готов!")

    # 3. Запускаем генератор
    print("[3/3] Генерирую сценарии...")
    print()

    gen_proc = subprocess.run(
        [PY, str(ROOT / "ml" / "run_generator.py"),
         "--api-url", "http://127.0.0.1:8091/v1",
         "--api-key", "local",
         "--model", "local-model",
         "--ids", "5", "100", "200",
         "--count", "1"],
        cwd=str(ROOT),
    )
    if gen_proc.returncode != 0:
        print(f"ОШИБКА: Генератор завершился с кодом {gen_proc.returncode}")
        server_proc.terminate()
        return

    print()
    print("=" * 60)
    print("  ГОТОВО!")
    print("  Результат: data_derived/scenarios/generated.json")
    print("=" * 60)

    # Останавливаем сервер
    print("\nОстанавливаю сервер...")
    server_proc.terminate()
    server_proc.wait(timeout=5)
    print("Готово.")


if __name__ == "__main__":
    main()
