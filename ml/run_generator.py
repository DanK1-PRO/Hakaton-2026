"""
Запуск генератора сценариев.

Варианты запуска:

1. С Ollama (бесплатно, локально):
   - Установите Ollama: https://ollama.com
   - ollama pull qwen2.5:7b
   - python ml/run_generator.py

2. С подготовленным локальным llama.cpp:
   - python -m ml.run_generator --api-url http://127.0.0.1:8091/v1 --model local-model

3. С LM Studio:
   - Запустите LM Studio, загрузите модель, включите сервер
   - python ml/run_generator.py --api-url http://localhost:1234/v1 --model local

Разрешены только HTTP API на loopback. Внешние сервисы не используются.
Актуальная подготовка модели: docs/LOCAL_ML_RUN.ru.md.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from ml.scenario_generator import ScenarioGenerator


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Запуск генератора сценариев DDS 112")
    parser.add_argument("--api-url", default="http://localhost:11434/v1",
                        help="URL LLM API (по умолчанию: Ollama)")
    parser.add_argument("--api-key", default="ollama",
                        help="API ключ (по умолчанию: ollama)")
    parser.add_argument("--model", default="qwen2.5:7b",
                        help="Модель LLM (по умолчанию: qwen2.5:7b)")
    parser.add_argument("--ids", nargs="*", type=int,
                        help="ID типов происшествий (если не указано — все)")
    parser.add_argument("--difficulty", choices=["easy", "medium", "hard"],
                        help="Целевая сложность")
    parser.add_argument("--count", type=int, default=1,
                        help="Сколько сценариев на каждый тип")
    parser.add_argument("--temperature", type=float, default=0.8,
                        help="Температура генерации (0.0-1.0)")
    parser.add_argument("--output", default="data_derived/scenarios/generated.json",
                        help="Путь для сохранения результата")
    parser.add_argument("--dry-run", action="store_true",
                        help="Показать промпт без вызова LLM")
    args = parser.parse_args()
    if args.count < 1:
        parser.error("--count must be positive")

    gen = ScenarioGenerator(
        api_url=args.api_url,
        api_key=args.api_key,
        model=args.model,
    )

    print("=" * 60)
    print("  ГЕНЕРАТОР СЦЕНАРИЕВ DDS 112")
    print("=" * 60)
    print(f"  Модель:     {args.model}")
    print(f"  API:        {args.api_url}")
    print(f"  Классификатор: {len(gen.classifier)} типов")
    print(f"  Few-shot:   {len(gen.example_scenarios)} примеров")
    print(f"  Сложность:  {args.difficulty or 'все'}")
    print(f"  Кол-во:     {args.count} на тип")
    print("=" * 60)

    if args.dry_run:
        if args.ids:
            incidents = [i for i in gen.classifier if i.get("id") in args.ids]
        else:
            incidents = gen.classifier[:3]
        for inc in incidents:
            from ml.scenario_generator import build_generation_prompt
            msgs = build_generation_prompt(inc, args.difficulty, gen.example_scenarios)
            print(f"\n--- Промпт для: {inc.get('name')} (ID={inc.get('id')}) ---")
            for m in msgs:
                print(f"\n[{m['role']}]:")
                print(m['content'][:500])
        return

    scenarios = gen.generate_batch(
        incident_ids=args.ids,
        target_difficulty=args.difficulty,
        count_per_type=args.count,
        temperature=args.temperature,
    )

    if not scenarios:
        raise SystemExit("No valid scenarios generated; output file was not changed.")
    gen.save(scenarios, args.output)

    # Статистика
    easy = sum(1 for s in scenarios if s.difficulty == "easy")
    medium = sum(1 for s in scenarios if s.difficulty == "medium")
    hard = sum(1 for s in scenarios if s.difficulty == "hard")
    print("\nСтатистика:")
    print(f"  Easy:   {easy}")
    print(f"  Medium: {medium}")
    print(f"  Hard:   {hard}")
    print(f"  Всего:  {len(scenarios)}")


if __name__ == "__main__":
    main()
