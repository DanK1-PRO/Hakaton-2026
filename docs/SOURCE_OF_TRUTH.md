# Source of Truth

Customer documents define domain correctness. The captain/master spec defines stack and team scope; current user instructions guide execution.

| Priority | Source | Use |
|---|---|---|
| P0 | 9. Деп Обороны и ЧС.pdf, physical pp.7-16,18 | Local runtime, roles, training, UX, delivery |
| P0 companion | ТЗ_ДГОЧСиПБ_финал_01092026ГСИ.docx | General/performance requirements |
| P1 | ZIP / Работа с АРМ-112 для ДДС от ОКр_ГСИ.pdf | pp.11-19 UI;21-26 reactions;27-32 examples |
| P2 | ZIP / Классификатор_происшествий_v_046_24_корректировка_МВД_+_Департамент.xlsx | 1,283 rows, features and conditional routes |
| P3 | ZIP / Билеты- задачи по C 112 . АГС_ГСИ.pdf | Image-based pages, reserved for ML team; not claimed parsed |
| P4 | СКРИНШОТ ДДСГСИ.docx | Inspected embedded images5,10: list and workstation |
| P4 | Инструкция_по_заведению_карточки_2507ГСИ.docx; СКРИНШОТ КАРТОЧКИ 112ГСИ.docx | Auxiliary card fields |
| P5 | context_customer_answers_civil_defense.md | VoIP logs promised; most oral answers unresolved |
| P5 update | docs/customer/CUSTOMER_INFORMAL_ANSWERS_2026_09_27.ru.md | Informal customer clarifications: DDS status cycle, 30s/3min timing, DDS vs 112 responsibility, phone-only MVP, manual DDS brigade choice |
| Implementation | HACKATHON_2026_MASTER_SPEC_CODEX.md | §§6-18,28,34-35 |

The standalone ARM EDDS guide is absent. Present DDS memo/screenshots provide direct evidence. Full pixel-identical reproduction is not claimed.

Original files are immutable and excluded from Git. Run scripts/build_classifier.py with the customer ZIP to reproduce derived data. Import IDs are source row numbers; external_code is retained separately because uniqueness across source revisions is not assumed.

Scenarios adapt memo pp.30-31. Added addresses/names, difficulty and expected action lists are TEAM_PROPOSAL. Ticket PDF remains unconsumed for an independent future validation/gold set.

