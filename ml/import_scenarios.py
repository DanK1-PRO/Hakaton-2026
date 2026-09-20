"""
Импорт сценариев из Excel-классификатора в формат проекта.

Преобразует training_scenarios.json в формат data_derived/scenarios/demo.json
"""

import json
from pathlib import Path
from typing import List, Dict

# Пути
SOURCE_PATH = Path(__file__).parent.parent.parent / "data" / "training_scenarios.json"
OUTPUT_PATH = Path(__file__).parent.parent / "data_derived" / "scenarios" / "from_classifier.json"
CLASSIFIER_PATH = Path(__file__).parent.parent / "data_derived" / "classifier" / "incident_types.json"


def load_source_scenarios() -> List[Dict]:
    """Загружает исходные сценарии из hht/data"""
    if not SOURCE_PATH.exists():
        print(f"[WARNING] Source file not found: {SOURCE_PATH}")
        print("Creating empty output")
        return []
    
    with open(SOURCE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    return data.get("scenarios", [])


def load_classifier() -> Dict[int, Dict]:
    """Загружает классификатор и индексирует по ID"""
    if not CLASSIFIER_PATH.exists():
        return {}
    
    with open(CLASSIFIER_PATH, "r", encoding="utf-8") as f:
        classifier = json.load(f)
    
    # Индексируем по id и external_code
    index = {}
    for inc in classifier:
        if "id" in inc:
            index[inc["id"]] = inc
        if "external_code" in inc:
            try:
                index[int(inc["external_code"])] = inc
            except ValueError:
                pass
    
    return index


def convert_difficulty(difficulty: str) -> str:
    """Конвертирует уровень сложности"""
    mapping = {
        "лёгкая": "easy",
        "нормальная": "medium", 
        "сложная": "hard",
        "easy": "easy",
        "medium": "medium",
        "hard": "hard"
    }
    return mapping.get(difficulty.lower(), "medium")


def scenario_to_project_format(scenario: Dict, classifier_index: Dict) -> Dict:
    """Конвертирует сценарий в формат проекта"""
    
    # Определяем incident_type_id из классификатора
    incident_type_id = None
    incident_name = scenario.get("incident_type", "")
    
    # Ищем в классификаторе по имени
    for inc_id, inc_data in classifier_index.items():
        if inc_data.get("name", "").lower() == incident_name.lower():
            incident_type_id = inc_id
            break
    
    # Если не нашли, используем category_code
    if incident_type_id is None:
        incident_type_id = scenario.get("id", 1)
    
    # Формируем карточку
    card = {
        "caller_number": f"+7000000{scenario.get('id', 1):04d}",
        "name": f"Заявитель {scenario.get('id', 1)}",
        "address": f"г. Москва, {scenario.get('location', 'ул. Тестовая')}, д. {scenario.get('id', 1)}",
        "incident_type_id": incident_type_id,
        "comments": f"{incident_name}. {scenario.get('sign', '')}"
    }
    
    # Формируем эталон
    reference = {
        "version": "1.0-classifier",
        "address": card["address"],
        "incident_type_id": incident_type_id,
        "expected_actions": ["accepted", "responding", "completed"]
    }
    
    # Формируем сценарий в формате проекта
    return {
        "schema_version": "1.0",
        "id": f"classifier_{scenario.get('id', 0)}",
        "title": incident_name or "Происшествие из классификатора",
        "difficulty": convert_difficulty(scenario.get("difficulty", "medium")),
        "service": scenario.get("service", "ДДС учебного района"),
        "prompt": f"Происшествие типа: {incident_name}. Место: {scenario.get('location', 'неизвестно')}.",
        "briefing": [
            f"Категория: {scenario.get('category', 'неизвестна')}",
            f"Подтип: {scenario.get('subcategory', 'неизвестен')}",
            f"Служба: {scenario.get('service', 'неизвестна')}"
        ],
        "card": card,
        "source": {
            "type": "classifier_import",
            "file": "Классификатор_происшествий_v_046_24_корректировка_МВД_+_Департамент.xlsx",
            "row": scenario.get("source_row", 0),
            "status": "CLASSIFIED",
            "note": f"Автоматический импорт из классификатора. Сложность: {scenario.get('difficulty', 'medium')}"
        },
        "reference": reference,
        # Дополнительные поля из ML
        "ml_metadata": {
            "category": scenario.get("category"),
            "category_code": scenario.get("category_code"),
            "subcategory": scenario.get("subcategory"),
            "difficulty_factors": scenario.get("missing_info", []),
            "key_actions": scenario.get("key_dispatcher_actions", []),
            "dialogue_template": scenario.get("dialogue", [])
        }
    }


def main():
    """Основная функция импорта"""
    print("=" * 60)
    print("ИМПОРТ СЦЕНАРИЕВ ИЗ КЛАССИФИКАТОРА")
    print("=" * 60)
    
    # Загружаем данные
    source_scenarios = load_source_scenarios()
    classifier_index = load_classifier()
    
    print(f"\nЗагружено сценариев: {len(source_scenarios)}")
    print(f"Загружено типов из классификатора: {len(classifier_index)}")
    
    # Конвертируем
    project_scenarios = []
    for scenario in source_scenarios:
        try:
            converted = scenario_to_project_format(scenario, classifier_index)
            project_scenarios.append(converted)
        except Exception as e:
            print(f"[ERROR] Scenario {scenario.get('id')}: {e}")
    
    print(f"\nКонвертировано сценариев: {len(project_scenarios)}")
    
    # Статистика по сложности
    difficulties = {}
    for s in project_scenarios:
        d = s.get("difficulty", "unknown")
        difficulties[d] = difficulties.get(d, 0) + 1
    
    print("\nПо сложности:")
    for d, count in sorted(difficulties.items()):
        print(f"  {d}: {count}")
    
    # Сохраняем
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(project_scenarios, f, ensure_ascii=False, indent=2)
    
    print(f"\nСохранено в: {OUTPUT_PATH}")
    print("=" * 60)
    
    return project_scenarios


if __name__ == "__main__":
    main()
