"""
Прямой импорт из Excel-классификатора в формат проекта.
Читает Excel и создает сценарии для evaluator v1.
"""

import json
import sys
from pathlib import Path

# Добавляем родительскую директорию для pandas
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

try:
    import pandas as pd
except ImportError:
    print("Установите pandas: pip install pandas openpyxl")
    sys.exit(1)

# Пути
EXCEL_PATH = Path(__file__).parent.parent.parent / "Классификатор_происшествий_v_046_24_корректировка_МВД_+_Департамент.xlsx"
OUTPUT_PATH = Path(__file__).parent.parent / "data_derived" / "scenarios" / "classifier_scenarios.json"

# Маппинг категорий
CATEGORY_MAP = {
    '1': 'Пожар', '2': 'ДТП', '3': 'Взрыв', '4': 'Угроза взрыва/теракта',
    '5': 'Обрушение', '6': 'Угроза обрушения', '7': 'Природная стихия',
    '8': 'Экология', '9': 'Гидроавария', '10': 'Авария на опасном объекте',
    '11': 'Выброс опасных веществ', '12': 'Авария воздушного транспорта',
    '13': 'Запах газа', '14': 'Массовое отключение', '15': 'Нарушение правопорядка',
    '16': 'Дорожное движение', '17': 'Человек в опасности', '18': 'Ребенок в опасности',
    '19': 'Труп, констатация смерти', '20': 'Социальная помощь', '21': 'Животные',
    '22': 'Медицинская помощь', '23': 'Прочие происшествия', '24': 'БПЛА'
}

SERVICE_MAP = {
    'MCHS': 'МЧС', 'Police': 'Полиция', 'AMBULANCE': 'Скорая помощь',
    'METRO': 'Метро', 'MOSGAZ': 'Мосгаз', 'MOESK': 'МОЭСК',
    'MOSVODOCANAL': 'Мосводоканал', 'MOEK': 'МОЭК', 'MGTS': 'МГТС'
}


def classify_difficulty(row_data):
    """Классификация сложности на основе данных строки"""
    text = f"{row_data.get('what', '')} {row_data.get('sign', '')} {row_data.get('type', '')}".lower()
    
    hard_indicators = ['опасный груз', 'ахов', 'погибш', 'пострадавш', 'нож', 'оружие',
                       'пьян', 'без сознани', 'горит', 'взрыв', 'теракт', 'бпла',
                       'труп', 'убийств', 'катастроф', 'авария', 'химическ']
    
    easy_indicators = ['мусор', 'трава', 'пух', 'сигнализ', 'справк', 'консультац',
                       'благодар', 'трениров', 'парков', 'брошен']
    
    hard_score = sum(1 for kw in hard_indicators if kw in text)
    easy_score = sum(1 for kw in easy_indicators if kw in text)
    
    if hard_score >= 2:
        return 'hard'
    elif easy_score >= 2:
        return 'easy'
    else:
        return 'medium'


def main():
    """Основная функция"""
    print("=" * 60)
    print("ИМПОРТ СЦЕНАРИЕВ ИЗ EXCEL-КЛАССИФИКАТОРА")
    print("=" * 60)
    
    # Проверяем existence Excel
    if not EXCEL_PATH.exists():
        print(f"[ERROR] Excel not found: {EXCEL_PATH}")
        return []
    
    print(f"\nЧтение Excel: {EXCEL_PATH}")
    df = pd.read_excel(EXCEL_PATH)
    print(f"Загружено строк: {len(df)}")
    
    scenarios = []
    scenario_id = 1
    
    # Обрабатываем строки (начиная с 3, пропуская заголовки)
    for i in range(3, len(df)):
        val0 = str(df.iloc[i, 0]).strip() if pd.notna(df.iloc[i, 0]) else ''
        if not val0.isdigit():
            continue
        
        val5 = str(df.iloc[i, 5]).strip() if pd.notna(df.iloc[i, 5]) else ''
        val6 = str(df.iloc[i, 6]).strip() if pd.notna(df.iloc[i, 6]) else ''
        val7 = str(df.iloc[i, 7]).strip() if pd.notna(df.iloc[i, 7]) else ''
        val8 = str(df.iloc[i, 8]).strip() if pd.notna(df.iloc[i, 8]) else ''
        val10 = str(df.iloc[i, 10]).strip() if pd.notna(df.iloc[i, 10]) else ''
        val12 = str(df.iloc[i, 12]).strip() if pd.notna(df.iloc[i, 12]) else ''
        
        if not val6 and not val7 and not val10:
            continue
        
        # Данные для классификации
        row_data = {'what': val7, 'sign': val8, 'type': val10}
        difficulty = classify_difficulty(row_data)
        category = CATEGORY_MAP.get(val0, f'Категория {val0}')
        service = SERVICE_MAP.get(val12, val12)
        
        # Формируем сценарий
        incident_name = val10 if val10 else val7
        address = f"г. Москва, {val6 if val6 else 'ул. Тестовая'}, д. {scenario_id}"
        
        scenario = {
            "schema_version": "1.0",
            "id": f"classifier_{scenario_id}",
            "title": incident_name,
            "difficulty": difficulty,
            "service": service,
            "prompt": f"{category}: {incident_name}. Место: {val6}",
            "briefing": [
                f"Категория: {category}",
                f"Подтип: {val6}",
                f"Служба: {service}"
            ],
            "card": {
                "caller_number": f"+7000000{scenario_id:04d}",
                "name": f"Заявитель {scenario_id}",
                "address": address,
                "incident_type_id": scenario_id,
                "comments": f"{incident_name}. {val8}"
            },
            "source": {
                "type": "classifier_import",
                "file": "Классификатор_происшествий_v_046_24_корректировка_МВД_+_Департамент.xlsx",
                "row": i + 1,
                "status": "CLASSIFIED",
                "note": f"Автоматический импорт. Сложность: {difficulty}"
            },
            "reference": {
                "version": "1.0-classifier",
                "address": address,
                "incident_type_id": scenario_id,
                "expected_actions": ["accepted", "responding", "completed"]
            },
            "ml_metadata": {
                "category": category,
                "category_code": val0,
                "subcategory": val6,
                "incident_type": val10,
                "location": val6,
                "object": val7,
                "sign": val8,
                "difficulty_score": 1.0 if difficulty == 'easy' else (5.0 if difficulty == 'medium' else 8.0)
            }
        }
        
        scenarios.append(scenario)
        scenario_id += 1
    
    # Статистика
    difficulties = {}
    categories = {}
    for s in scenarios:
        d = s['difficulty']
        c = s['ml_metadata']['category']
        difficulties[d] = difficulties.get(d, 0) + 1
        categories[c] = categories.get(c, 0) + 1
    
    print(f"\nСконвертировано сценариев: {len(scenarios)}")
    print("\nПо сложности:")
    for d, count in sorted(difficulties.items()):
        print(f"  {d}: {count}")
    print("\nПо категориям (топ-10):")
    for c, count in sorted(categories.items(), key=lambda x: -x[1])[:10]:
        print(f"  {c}: {count}")
    
    # Сохраняем
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(scenarios, f, ensure_ascii=False, indent=2)
    
    print(f"\nСохранено в: {OUTPUT_PATH}")
    print("=" * 60)
    
    return scenarios


if __name__ == "__main__":
    main()
