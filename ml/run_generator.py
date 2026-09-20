"""
Запуск генератора сценариев.

Варианты запуска:

1. С Ollama (бесплатно, локально):
   - Установите Ollama: https://ollama.com
   - ollama pull qwen2.5:7b
   - python ml/run_generator.py

2. С OpenAI API:
   - python ml/run_generator.py --api-key sk-... --model gpt-4o

3. С LM Studio:
   - Запустите LM Studio, загрузите модель, включите сервер
   - python ml/run_generator.py --api-url http://localhost:1234/v1 --model local

4. С другими OpenAI-совместимыми API:
   - python ml/run_generator.py --api-url http://your-server/v1 --model model-name
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

    gen.save(scenarios, args.output)

    # Статистика
    easy = sum(1 for s in scenarios if s.difficulty == "easy")
    medium = sum(1 for s in scenarios if s.difficulty == "medium")
    hard = sum(1 for s in scenarios if s.difficulty == "hard")
    print(f"\nСтатистика:")
    print(f"  Easy:   {easy}")
    print(f"  Medium: {medium}")
    print(f"  Hard:   {hard}")
    print(f"  Всего:  {len(scenarios)}")


if __name__ == "__main__":
    main()
