# Source Reading Notes

These notes are a compact cache from the first organizational pass. They are not a substitute for the sources when implementing a specific feature.

## Customer SoW

`9. Деп Обороны и ЧС.pdf` has 20 pages. Its table of contents includes:

- terms and definitions;
- company/task/service description;
- general service requirements;
- optional requirements;
- performance requirements;
- user requirements;
- roles: administrator, instructor, trainee;
- non-functional requirements;
- user scenarios;
- data sources and formats;
- solution, presentation, UX/UI, and evaluation requirements.

Implementation impact:

- local Russian training simulator;
- DDS trainee focus;
- instructor/admin/trainee roles;
- practical training on ARM-112 cards/actions;
- local system design and data safety matter.

## DDS ARM-112 Memo

`Датасет.zip::Работа с АРМ-112 для ДДС от ОКр_ГСИ.pdf` has 40 pages.

The first pages state that it is a practical memo for duty-dispatch services, based on real questions and difficulties during incident information handling and response organization. It explains why cards look different, why a service receives a card, who created/supplemented it, what marks in the card mean, and where to get additional information.

Implementation impact:

- this is the primary source for Danil's DDS workflow and UI behavior;
- read it before finalizing card statuses and DDS actions;
- use it to avoid accidentally building only a generic 112 operator interface.

## Card Creation Instruction

`Инструкция_по_заведению_карточки_2507ГСИ.docx` contains 462 paragraphs and one table.

Observed useful facts:

- login includes credentials and ARM number;
- telephony status appears on the main incident list;
- statuses include `доступен`, `недоступен`, `не подключен`, `ошибка`;
- `доступен` / `недоступен` can be toggled manually;
- status becomes unavailable while a card is open;
- after closing a card, unavailable persists briefly before auto-returning to available;
- incoming call opens a call window with a `Принять` action;
- after accepting, a new incident card opens and must be filled.

Implementation impact:

- MVP can model this with a mock call/event panel and timer;
- do not implement real telephony in the first pass;
- use Russian labels and workstation density.

## Screenshot DOCX Files

`СКРИНШОТ ДДСГСИ.docx` notes:

- system login for DDS;
- DDS working field;
- field with message rows;
- DDS card working field;
- status fill area;
- `ПРИНЯТО/НЕ ПРИНЯТО` status selection;
- later status updates through an edit/pencil action: `НАЧАЛО РЕАГИРОВАНИЯ`, `ОТКАЗ ОТ ВЫПОЛНЕНИЯ РАБОТ`, `РАБОТЫ ЗАВЕРШЕНЫ`, plus comments.

`СКРИНШОТ КАРТОЧКИ 112ГСИ.docx` notes:

- `ЧТО СЛУЧИЛОСЬ` selects a scenario;
- scenario-specific tags appear;
- selected information automatically pulls services, with manual additions possible;
- red field color can indicate card typing time exceeded.

Implementation impact:

- DDS UI must include status transition and comment controls;
- scenario/type selection and tags/services are derived from classifier/source data;
- use red overdue/timer state only as a UI behavior, not as an official scoring rule unless confirmed elsewhere.

## Classifier

Root classifier:

- file: `Классификатор_происшествий_v_046_11_ДТУ_15_11_2024_искл_пожар_задымление.xlsx`
- sheet: `Лист1`
- size observed: 1308 rows x 90 columns.

ZIP classifier:

- file: `Классификатор_происшествий_v_046_24_корректировка_МВД_+_Департамент.xlsx`
- sheet: `Лист1`
- size observed: 1310 rows x 104 columns.

Important columns visible near the top:

- generated number fields: `Г`, `п1`, `п2`, `п3`, `Номер`;
- group/statistics field;
- 112 incident signs: `112 - Признак.1`, `112-Признак.2`, `112-Признак.3`;
- additional signs;
- final incident type;
- service/system type columns.

Implementation impact:

- use a single normalized derived layer for incident types/routing;
- do not hardcode a separate list in frontend/backend/ML;
- compare root and ZIP classifiers and prefer the newer ZIP version if no contradiction is found.

## Tickets PDF

`Датасет.zip::Билеты- задачи по C 112 . АГС_ГСИ.pdf` has 32 pages.

Initial text extraction returned little/no text for early pages, so it may require rendering/OCR or manual visual extraction.

Implementation impact:

- do not block the MVP on complete ticket parsing;
- create one or two seed mock scenarios with clear `TEAM_PROPOSAL` status if ticket extraction is not ready;
- leave a parser/OCR task for the data/ML subagent.

## Customer Q&A File

`context_customer_answers_civil_defense.md` is intentionally cautious.

Confirmed:

- for VoIP/telephony, the customer will provide logs.

Not confirmed by that file:

- real SIP server;
- credentials;
- technical VoIP documentation;
- final scenario generation rules;
- final role split between 112 operator and DDS dispatcher;
- exact evaluation methodology;
- exact lifecycle/timer rules;
- cloud/local AI restrictions from the video alone.

Implementation impact:

- do not treat unanswered meeting questions as requirements;
- use written sources first;
- log unresolved questions.

