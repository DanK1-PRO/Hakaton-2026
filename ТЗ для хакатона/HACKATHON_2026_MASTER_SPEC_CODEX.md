# HACKATHON 2026 — MASTER SPECIFICATION AND CODEX EXECUTION BRIEF

## 0. Status and purpose of this file

This file is the single operational specification for Codex when working inside the local folder `Хакатон 2026`.

It consolidates:
- the customer requirements and customer-provided source materials;
- the latest team-wide execution plan prepared by captain Kirill;
- Danil's current responsibility area;
- the required technology stack;
- the interface reference priority;
- the simulation architecture;
- the ML integration boundaries;
- repository/file-management rules;
- the 14-day sprint plan;
- the first implementation priorities for Days 1–2;
- links and external references already collected by the team;
- rules for resolving conflicts between sources without inventing requirements.

The captain's latest detailed plan is the **team implementation baseline** and must be followed unless it directly contradicts an explicit customer requirement.

The customer materials remain the **domain source of truth** for what the simulator is supposed to model.

Use this distinction throughout the project:

> **Customer materials define WHAT must be correct in the product and domain.**
>
> **Captain Kirill's current specification defines HOW the team currently implements it, in what order, with what stack, and with what task ownership.**

Do not silently replace the captain's current plan with a different architecture, stack, UI framework, database, authentication approach, or sprint structure.

---

# 1. Mandatory behavior for Codex

Apply these instructions before doing any work:

> Do not hallucinate. Use the Statement of Work (SoW), customer materials, interface methodics, classifier, ticket/scenario materials, and the captain's latest specification as the primary sources. For every non-obvious requirement, identify where it came from. If information is missing, contradictory, or ambiguous, mark it as `UNKNOWN`, `TEAM_PROPOSAL`, or `NEEDS_CONFIRMATION` and ask Danil instead of inventing a rule. Do not write generic introductions or conclusions in generated technical documents unless requested.

Additional mandatory rules:

1. Work only inside the project root `Хакатон 2026`.
2. Do not modify or delete the original customer source files.
3. Do not remove original captain/team files.
4. Do not execute destructive Git operations.
5. Do not delete suspected duplicates automatically.
6. Before any destructive reorganization:
   - produce a proposed move/rename plan;
   - list suspected duplicates;
   - wait for explicit confirmation from Danil.
7. Preserve Russian filenames when they are official source names.
8. Keep source-derived facts separate from team architecture decisions.
9. Never treat an ML output as a normative source of truth.
10. Do not invent UI fields, statuses, scoring weights, routing rules, time limits, permissions, or incident categories.
11. If a requirement can be traced to a customer file, store the exact filename and page/section where possible.
12. If a requirement exists only in captain/team materials, label it as a team implementation decision.
13. If a requirement comes from customer Q&A/video, label it as `CUSTOMER_QA`, preserve the date/context, and record whether it clarifies or conflicts with written materials.
14. Keep the product runnable even if ML components are unavailable.
15. Prefer an MVP that demonstrates the real dispatcher workflow over broad but shallow feature coverage.

---

# 2. Expected initial project state

The project root may initially contain only two major input areas:

```text
Хакатон 2026/
├── Данные заказчика/
└── ТЗ для хакатона/
    └── HACKATHON_2026_MASTER_SPEC_CODEX.md   <- this file
```

Treat both folders as **inputs**.

`Данные заказчика/` is a source archive.

`ТЗ для хакатона/` contains the operational specification for implementation.

Codex is allowed to create the actual working repository structure after inventorying the existing files.

Recommended working structure after inventory:

```text
Хакатон 2026/
├── Данные заказчика/              # immutable originals
├── ТЗ для хакатона/               # this master spec and captain/team specs
│
├── backend/
├── frontend/
├── ml/
├── config/
├── migrations/
├── tests/
├── docs/
├── infra/
├── scripts/
├── data_derived/
└── docker-compose.yml
```

Do not force this exact structure if an already initialized repository has a sensible compatible layout. Reuse the existing repository conventions where possible.

Never relocate active code only for cosmetic reasons.

---

# 3. Source priority model

There are two parallel priority systems.

## 3.1. Priority A — product/domain truth

Use this order when deciding how the simulator should behave.

### P0 — official customer Statement of Work

Primary file:

```text
9. Деп Обороны и ЧС.pdf
```

Use it for:
- product purpose;
- role definitions;
- deployment/locality requirements;
- performance requirements;
- information security requirements;
- admin/instructor/operator requirements;
- expected subsystem composition;
- documentation expectations;
- load requirements;
- local infrastructure constraints;
- system-level acceptance constraints.

Known important customer constraints include:
- local network operation;
- Russian-language UI;
- resilience to short network failures;
- approximately 100+ users / team target of up to 110 active users;
- local operation of practical training;
- local database and local model serving;
- no dependency of training workflow on external cloud services;
- PostgreSQL-class persistent storage is compatible with the captain plan;
- simulator/interface response target from the customer material must be respected where applicable.

If the captain plan and the SoW conflict, log the conflict and preserve the customer requirement.

### P1 — exact DDS training workflow

Highest-priority workflow source:

```text
Работа с АРМ-112 для ДДС от ОКр_ГСИ.pdf
```

This document is particularly important because the target trainee is a **DDS dispatcher**, not a 112 call-center operator.

Use it for:
- DDS reaction workflow;
- dispatcher actions after receiving a card/message;
- reaction statuses;
- comments;
- service interaction;
- time-related behavior;
- frequent workflow mistakes;
- what the DDS trainee actually has to do.

This file must be read fully before implementing the DDS training flow.

### P2 — incident classification and service routing

Primary file:

```text
Классификатор_происшествий_v_046_24_корректировка_МВД_+_Департамент.xlsx
```

Use it for:
- incident type identifiers;
- incident categories;
- incident attributes;
- routing/notification logic;
- destination service mapping;
- dropdown contents;
- validation/reference data.

Do not replace this with a hand-written list such as "fire / police / ambulance".

Do not create competing routing tables in frontend, backend, and ML.

Create one normalized derived routing layer and reuse it everywhere.

### P3 — training scenario seeds / tickets

Primary file:

```text
Билеты- задачи по C 112 . АГС_ГСИ.pdf
```

Use it for:
- seed scenarios;
- training examples;
- scenario generation constraints;
- test scenarios;
- reference cases where applicable;
- initial difficulty analysis.

Do not consume all tickets for ML training.

Reserve part of them as a validation/gold set that the generator and evaluator cannot memorize.

### P4 — UI/UX and ARM workflow reference

Primary visual/interaction reference:

```text
Руководство диспетчера АРМ ЕДДС.pdf
```

Use it for:
- overall visual language;
- cards/tables;
- incident list structure;
- card status representation;
- location block;
- DDS panel;
- history;
- telephone panel;
- filters;
- workflow sequencing;
- familiar workstation behavior.

The product must not become an unrelated generic SaaS dashboard.

However, remember:

> This old ARM guide is a UI/workflow reference. It must not override the DDS-specific training logic in `Работа с АРМ-112 для ДДС от ОКр_ГСИ.pdf`.

### P5 — customer clarification / Q&A

Known video link:

```text
https://drive.google.com/file/d/1qpYkmGuSVKPBrBQgC_WB5luTcDzr0ZW9/view?usp=drive_link
```

When the video/transcript becomes locally available:
1. extract questions and answers;
2. create a structured Q&A summary;
3. map each clarification to the current specification;
4. classify it as:
   - clarification,
   - new requirement,
   - implementation freedom,
   - conflict with written material,
   - non-binding suggestion;
5. do not silently override the written SoW;
6. add conflicts to `docs/OPEN_QUESTIONS.md`.

A useful extraction format:

```text
Question:
Customer answer:
Requirement impact:
Affected module:
Priority:
Conflicts with:
Action for team:
Source timestamp:
```

### P6 — derived team reference materials

Examples:
- `выжимка.docx`
- additional data package / summary documents;
- verified legislation and professional standards;
- derived schemas, mappings and indexes.

These help formalize the design, but they must not be allowed to become an independent source that contradicts the original customer files.

---

## 3.2. Priority B — implementation/execution truth

For actual development order, architecture baseline and team responsibilities, the current captain specification is the top source.

Priority order:

1. latest captain message / latest detailed sprint plan;
2. captain's team-wide generated technical specification;
3. captain's original planning prompt;
4. older architecture ideas;
5. suggestions from other LLMs.

Relevant team files currently known:

```text
Вставленная уценка.md
Составленное ТЗ на основе промта командира(Так же прислал командир).txt
Промт командира для составления ТЗ.txt
```

If the same detail differs between these files, the most recent explicit captain instruction wins for implementation.

Examples:
- the latest stack is mandatory;
- the current 14-day sprint is the execution baseline;
- Danil's explicit FastAPI skeleton assignment is current;
- Day 1–2 deliverables have priority over speculative long-term refactoring.

---

# 4. Captain's current team-wide execution baseline

Do not drift away from this plan.

## 4.1. 14-day sprint

### Days 1–2 — A + C
Goal: Architecture & Prototype.

Required:
- finalize high-level architecture diagram;
- finalize initial data contract;
- scaffold FastAPI;
- scaffold React application;
- initial pages:
  - Login;
  - Incident List;
- Docker Compose environment;
- local run verification.

### Days 3–5 — E
Required:
- implement scenario/ticket Generator;
- parse `Билеты- задачи ...` PDF into structured JSON;
- start/train local Whisper-based speech/dialogue recognition path if applicable;
- build evaluation engine skeleton:
  - diff;
  - error flags;
  - result structure.

### Days 6–8 — C + D
Required:
- finish React incident creation UI;
- VoIP controls — mock only for MVP;
- role-based authentication;
- API routes;
- instructor dashboard routes;
- case list;
- live monitoring skeleton.

### Days 9–10 — B + E
Required:
- import classifier XLSX into PostgreSQL;
- apply pgcrypto where sensitive fields are persisted;
- finish evaluation engine logic;
- expose evaluation endpoint.

### Days 11–12 — A + D
Required:
- end-to-end integration tests;
- flow:
  `login -> call/message -> incident/card -> submit -> evaluate`;
- API profiling;
- uvicorn/gunicorn/uvloop configuration;
- Swagger/OpenAPI;
- README.

### Day 13 — B + C
Required:
- production container image;
- local server deployment;
- smoke tests.

### Day 14 — everyone
Required:
- bug fixing;
- regression fixes;
- final documentation;
- deployment guide;
- demonstration readiness.

---

# 5. Team responsibility map

Captain's current assignment is more important than generic role labels.

Known allocation:

- Kirill:
  - B;
  - E;
  - backend/data/deployment logic plus ML participation.

- Maksim:
  - D;
  - E;
  - backend auth/router/error-handling participation plus ML.

- Nikita:
  - A;
  - C;
  - architecture + frontend.

- Sanek:
  - C;
  - frontend.

- Danil:
  - A;
  - C;
  - **explicitly responsible for the FastAPI skeleton**;
  - architecture participation;
  - frontend participation;
  - checking implementation against the specification;
  - avoiding unnecessary scope creep.

Do not infer unassigned responsibilities beyond what the captain explicitly stated.

---

# 6. Danil's current responsibility

This section is operationally important.

Danil must be able to work independently without waiting for ML weights.

Danil's current work scope:

## 6.1. FastAPI skeleton — explicit captain assignment

Create and maintain the initial backend application skeleton.

Baseline files:

```text
backend/
└── app/
    ├── main.py
    ├── routers/
    │   ├── auth.py
    │   └── incidents.py
    ├── schemas/
    ├── models/
    ├── services/
    ├── db/
    ├── common/
    └── ml_gateway/
```

If the repository is already organized differently, adapt the names without breaking the agreed concepts.

Minimum backend responsibilities for Danil's skeleton:
- FastAPI app creation;
- router registration;
- `/health`;
- versioned API prefix if the team agrees;
- auth route stub;
- incident route stubs;
- Pydantic request/response models;
- configuration loading;
- DB dependency placeholder;
- ML gateway placeholder;
- consistent exception handling;
- automatic OpenAPI;
- no actual model dependency required.

## 6.2. Architecture

Danil participates in the high-level architecture:
- frontend -> FastAPI;
- FastAPI -> PostgreSQL;
- FastAPI -> simulation/domain services;
- FastAPI -> ML gateway;
- ML gateway -> mock adapters or local ML service;
- frontend never directly calls model code.

## 6.3. Frontend participation

Danil works together with Nikita and Sanek on C.

Priority frontend work:
- Login page;
- Incident List page;
- incident/card creation;
- DDS workstation-like UI;
- role badge;
- mock VoIP/communication control;
- frontend API client;
- no direct model integration in React.

## 6.4. Specification guardrail

Danil should compare the implementation against:
1. captain's current sprint plan;
2. customer SoW;
3. DDS workflow reference;
4. interface references.

If Codex proposes extra services, Kubernetes, cloud dependencies, Twilio SaaS, a different frontend framework, a different state manager, or major scope expansion, Codex must stop and explain why it is necessary.

---

# 7. Mandatory technology stack

Use the captain's current stack unless an already initialized repository makes a minor compatible adjustment unavoidable.

## Backend

```text
Python 3.11
FastAPI
SQLAlchemy 2.x
Alembic
Pydantic
OAuth2PasswordBearer / JWT
PyTest
pytest-asyncio
```

## Frontend

```text
React 18
TypeScript
Ant Design
Redux Toolkit
react-router-dom
```

## Database

```text
PostgreSQL 15
pgcrypto
```

## Runtime / serving

```text
uvicorn
Gunicorn
uvloop
```

## Containerization

```text
Docker
Docker Compose
```

## ML

Primary team direction:

```text
Python
PyTorch
local model inference
local fine-tuning
Whisper-family ASR path where actually needed
```

Do not make PyTorch a dependency of the main FastAPI application process if it can be isolated behind an ML adapter/service boundary.

## CI / quality

Preferred if time allows:

```text
GitHub Actions
ruff or flake8
mypy / pyright
pytest
frontend lint/typecheck
```

Do not let tooling work block the Day 1–2 MVP.

---

# 8. UI implementation priority

The UI must be familiar to a dispatcher and reflect the source materials.

Do not create a random modern dashboard from imagination.

Before implementing the detailed DDS workspace, inspect:

```text
Работа с АРМ-112 для ДДС от ОКр_ГСИ.pdf
Руководство диспетчера АРМ ЕДДС.pdf
```

Create these internal design documents:

```text
docs/ui/UI_SOURCE_MAP.md
docs/ui/SCREEN_MAP.md
docs/ui/UI_COMPONENT_INVENTORY.md
docs/ui/UI_BEHAVIOR.md
```

For each relevant screen/feature record:

```text
screen_id
screen_name
source_file
source_page_or_section
visible_blocks
fields
controls
statuses
transitions
notes
confidence
```

Use these confidence labels:

```text
CONFIRMED_CUSTOMER
CONFIRMED_CAPTAIN
TEAM_PROPOSAL
UNKNOWN
```

## 8.1. Required initial UI from captain plan

The Day 1–2 prototype must provide:

### Login
Captain baseline:
- email;
- password;
- login button;
- remember-me control;
- forgot-password link placeholder if required by the current guideline;
- role after login.

### Incident List
Captain baseline:
- paginated table;
- columns:
  - #;
  - Caller #;
  - Name;
  - Address;
  - Type;
  - Status;
  - Created At;
- sorting;
- filtering by type/status.

However, because the final product trains DDS dispatchers, the terminology and final list contents must later be reconciled with the DDS-specific source.

### Incident/Create Card
Captain baseline:
- caller number;
- name;
- address;
- incident type;
- situational comments;
- validation;
- incident type from classifier source.

### VoIP mock
Captain baseline:
- mock only;
- start call action;
- modal/control;
- timer;
- submit/record action as appropriate.

Do not integrate a cloud telephony provider.

## 8.2. ARM-like workspace evolution

After the skeleton is working, evolve the UI toward:
- incident/card list;
- selected card detail;
- caller/message context;
- incident information;
- location block;
- service/DDS assignment/status block;
- history/timeline;
- action buttons;
- communication/telephone block;
- clear status indicators;
- operator/instructor context.

The final layout should be based on actual source screenshots/description rather than generic dashboard patterns.

---

# 9. Important role correction: DDS trainee, not generic 112 operator

This is a critical product interpretation.

The target trainee is a **DDS dispatcher**.

The system should simulate the educational environment around that role.

The old ARM 112 guide is useful because it gives:
- real card structure;
- familiar UI;
- status behavior;
- service panel;
- history;
- telephone controls.

But the training objective must follow the DDS material.

Do not accidentally build only:
"112 receives caller -> 112 creates card -> 112 chooses DDS".

The system should support the DDS trainee receiving/simulating the relevant task and practicing the appropriate DDS actions.

Where captain's early generic "Incident Management UI" plan uses simplified incident CRUD, treat it as the MVP software skeleton, not the final complete domain model.

---

# 10. Data contract

Captain's initial proposed contract:

```json
{
  "caller_number": "string",
  "name": "string",
  "address": "string",
  "incident_type_id": "int",
  "comments": "text"
}
```

Initial team proposals also mention:
- caller number in E.164-like format;
- comments maximum length 2048;
- incident type FK;
- initial users/incidents tables.

These details must be tagged as `TEAM_PROPOSAL` until verified against the customer source.

Do **not** turn a captain draft such as "unique caller number per incident" into an immutable domain rule without validation.

Create:

```text
config/data_contract.json
docs/data/DATA_CONTRACT.md
docs/data/DATA_CONTRACT_SOURCES.md
```

The contract should distinguish:
- fields required for MVP;
- fields observed in ARM/DDS references;
- backend-only metadata;
- ML-derived values;
- instructor reference values;
- evaluation fields.

Prefer a versioned contract.

Example:

```text
schema_version: 0.1
```

---

# 11. Initial database model

Captain baseline requires at minimum:

```text
users
incidents
incident_types
```

Initial conceptual fields:

```text
users:
- id
- email
- password_hash
- role

incidents:
- id
- caller_number
- name
- address
- incident_type_id
- comments
- status
- created_at
- updated_at

incident_types:
- id
- external_code
- name
- metadata/source fields
```

Add normalized tables only when supported by workflow needs.

Likely later tables:
- training_sessions;
- scenarios;
- scenario_assignments;
- instructor_groups;
- evaluations;
- evaluation_items;
- service_routes;
- incident_service_states;
- instructor_feedback;
- audit_events.

Do not create a huge speculative schema on Day 1.

Use Alembic from the start.

---

# 12. Authentication and roles

Three product roles:

```text
trainee/operator
instructor
administrator
```

The captain plan requires role-based auth and JWT.

Customer/team notes also mention two-factor authentication.

Implementation order:

1. Day 1–2:
   - JWT-based login skeleton;
   - role claim;
   - protected endpoint dependency;
   - simple local seed users.

2. Later:
   - role permissions matrix;
   - 2FA if required by the final source-confirmed scope;
   - instructor group permissions;
   - admin capabilities.

Do not hard-code role checks randomly across handlers.

Use centralized authorization dependencies/policies.

---

# 13. API baseline

The captain specifically requests auth and incident CRUD.

Minimum Day 1–2 routes can be:

```text
GET  /health

POST /auth/login

GET  /incidents
POST /incidents
GET  /incidents/{id}
PATCH /incidents/{id}
DELETE /incidents/{id}
```

If the team wants singular `/incident/*` paths to match the captain document, choose one convention once and document it. Do not expose duplicated endpoint families.

Later routes may include:

```text
POST /eval/run

GET  /instructor/cases
POST /instructor/cases
GET  /instructor/sessions
POST /instructor/feedback

POST /simulation/sessions
POST /simulation/sessions/{id}/start
POST /simulation/sessions/{id}/events
POST /simulation/sessions/{id}/finish

GET  /ml/status
POST /ml/transcribe
POST /ml/classify
POST /ml/evaluate
POST /ml/generate
```

The later route names are provisional integration contracts, not customer facts.

---

# 14. Simulation architecture

The simulator itself must not be implemented as a collection of unrelated frontend timers.

Create a distinct simulation/domain layer.

Recommended conceptual components:

```text
SimulationSession
Scenario
ScenarioState
IncidentCard
DDSReaction
TimerPolicy
EvaluationRequest
EvaluationResult
InstructorReference
```

The simulation engine should own:
- session state;
- scenario state;
- time tracking;
- event ordering;
- task completion state;
- card submission;
- evaluation trigger;
- instructor override/feedback.

ML should not be the only thing controlling simulation state.

Deterministic business rules should remain deterministic where possible.

---

# 15. Time constraints

Team/customer notes include several time constraints.

Known/mentioned values include:
- reaction to a new card/message around 30 seconds;
- card completion around 3 minutes;
- submission/transfer after completion around 30 seconds;
- one note mentions answering within up to 30 minutes, but this must be rechecked because it may be a transcription/context error.

Therefore:

1. do not hard-code every number from informal notes immediately;
2. verify each timer against:
   - customer SoW;
   - DDS memo;
   - Q&A/video;
3. centralize timer values in configuration;
4. store source reference for each confirmed timer.

Example:

```yaml
simulation:
  reaction_deadline_seconds: 30
  card_completion_deadline_seconds: 180
  post_completion_submit_deadline_seconds: 30
```

Only mark these as normative after source verification.

---

# 16. Evaluation engine

The evaluation model/system must compare the trainee's actions with a reference and produce explainable output.

Evaluation dimensions mentioned across project materials:
- correctness of card data;
- critical errors;
- address correctness;
- destination/service correctness;
- missing important information;
- reaction speed;
- task completion speed;
- comments clarity;
- grammar/syntax quality;
- compliance with expected actions.

Do not invent official scoring percentages.

There is no confirmed fixed normative formula such as:
`address = 30%, service = 25%, time = 15%`.

Use configurable scoring weights.

Recommended result shape:

```json
{
  "session_id": "...",
  "score": 0,
  "critical_errors": [],
  "field_errors": [],
  "missing_information": [],
  "timing": {},
  "routing_assessment": {},
  "comment_quality": {},
  "explanation": "",
  "model_version": "",
  "reference_version": ""
}
```

The final evaluator must allow instructor correction.

Instructor correction becomes feedback data; it does not retroactively prove the model was correct.

---

# 17. Instructor requirements

The instructor must eventually be able to:
- create/manage training groups;
- assign cases;
- choose or influence difficulty;
- observe trainee work;
- view results;
- inspect evaluation explanations;
- correct model judgments;
- provide the correct/reference action;
- view trainee metrics;
- compare trainees;
- see recurring error types;
- support "follow the instructor" / guided mode;
- influence scenario generation;
- assign training by level.

For MVP, implement only the smallest routes/UI needed for the current sprint.

Do not block Day 1–2 on a full analytics dashboard.

---

# 18. ML architecture

At least two team members are assigned to ML in the current organization.

Current team plan places Kirill and Maksim in E-related work.

Do not tightly couple the core app to unfinished ML.

## 18.1. Mandatory ML boundary

Use an adapter/gateway boundary.

Concept:

```text
Frontend
   |
FastAPI main app
   |
Application/domain services
   |
ML Gateway
   |
Model adapters
   |---- mock generator
   |---- local generator
   |---- mock evaluator
   |---- local evaluator
   |---- optional ASR adapter
   |---- optional classifier
```

Frontend never imports ML code.

Backend domain logic never imports model weights directly.

## 18.2. Suggested interface

Framework-neutral concept:

```python
class ModelAdapter:
    name: str
    version: str

    async def health(self):
        ...

    async def predict(self, request):
        ...
```

Create a registry:

```text
capability -> active adapter
```

Examples:
- `scenario_generator`;
- `evaluator`;
- `asr`;
- `difficulty_classifier`;
- `dialogue_simulator`.

Each capability must be replaceable.

## 18.3. Graceful degradation

If ML is unavailable:
- app remains available;
- UI shows model unavailable;
- manual/reference scenario workflow remains usable;
- incident CRUD remains usable;
- instructor can still inspect sessions;
- `/health` reports degraded state rather than crashing the entire system.

---

# 19. Maksim's current ML workspace draft

The following current draft exists:

```text
hht/
├── data/
│   ├── raw/
│   ├── processed/
│   └── scenarios_96.json
├── models/
│   ├── base_model/
│   ├── lora_adapters/
│   └── difficulty_classifier/
├── src/
│   ├── preprocessing.py
│   ├── train.py
│   ├── generate.py
│   ├── evaluate.py
│   └── classifier.py
├── prompts/
│   └── templates.py
├── config/
│   └── training_config.yaml
└── requirements.txt
```

Treat this as a **draft ML workspace**, not the main application structure.

Keep it isolated under something like:

```text
ml/workspace/
```

or preserve the existing `hht/` repository if Maksim already has active work.

The main app should communicate through a stable contract.

Do not move model weights into the frontend/backend repository structure casually.

---

# 20. Scenario JSON

Current team draft example contains fields such as:

```text
id
category
difficulty
topic
dialogue[]
missing_info[]
key_dispatcher_actions[]
expected_keywords[]
```

This format is not final.

Issues already visible in draft examples:
- mixed languages/garbled characters;
- unnormalized role names;
- unclear service-routing references;
- no schema version;
- no source provenance;
- no explicit reference card;
- no timer policy;
- no evaluation rubric version.

Create a versioned schema before scaling the dataset.

Recommended direction:

```json
{
  "schema_version": "0.1",
  "id": "scenario-001",
  "source": {
    "type": "ticket",
    "file": "...",
    "page": null
  },
  "category": "...",
  "incident_type_id": null,
  "difficulty": "easy|medium|hard|very_hard",
  "presentation_mode": "audio|message|card|mixed",
  "prompt": "...",
  "dialogue": [],
  "facts": {},
  "missing_info": [],
  "expected_actions": [],
  "expected_services": [],
  "reference_card": {},
  "timers": {},
  "evaluation_tags": []
}
```

This is a team design proposal and should be reviewed by the ML/backend owners.

---

# 21. Speech/VoIP scope

Captain's sprint explicitly requires a **VoIP mock** for the early phase.

Do not build real carrier integration.

Do not use Twilio SaaS as the foundation.

The customer/team material points toward local simulation.

MVP can support:
- pre-recorded or synthetic local audio;
- incoming call/message event;
- timer;
- playback;
- response logging;
- optional simple voice input later.

Team notes indicate that full two-way generated caller dialogue is not mandatory for the earliest prototype.

Keep the abstraction so a richer dialogue model can be plugged in later.

---

# 22. Local-only requirement

The practical system must be able to operate locally.

Do not require:
- OpenAI API;
- cloud speech API;
- Twilio cloud;
- Firebase;
- cloud DB;
- external vector DB;
- internet-hosted model inference.

Development tools may be downloaded during development, but runtime must be designed for local deployment.

Create an environment switch if useful:

```text
APP_MODE=local
ML_MODE=mock|local
```

Default hackathon demo should work without external runtime dependencies.

---

# 23. Derived data layer

Create one reusable derived data area:

```text
data_derived/
├── classifier/
├── scenarios/
├── routing/
├── card_schema/
├── scoring/
└── dictionaries/
```

Goal:
- backend, frontend, ML and tests use the same source-derived data;
- no team member manually recreates a separate incident category list.

Important derived artifacts:

```text
routing/incident_to_services_v1.csv
routing/incident_features_v1.csv
routing/service_directory_v1.csv

scenarios/scenario_seed_v1.jsonl
scenarios/original_ticket_index_v1.csv
scenarios/train_validation_gold_split_v1.csv

card_schema/incident_card_schema_v1.json

scoring/evaluation_criteria_v1.yaml
```

All derived files must include source metadata.

---

# 24. Source provenance

Every generated knowledge/contract artifact should support:

```text
source_type:
source_file:
source_page_or_section:
source_note:
status:
```

`status` must be one of:

```text
CONFIRMED_CUSTOMER
CUSTOMER_QA
CONFIRMED_CAPTAIN
TEAM_PROPOSAL
UNKNOWN
NEEDS_CONFIRMATION
```

For code comments, do not spam every line with provenance.

Use provenance in:
- technical docs;
- schema docs;
- routing tables;
- UI map;
- scoring config;
- open questions.

---

# 25. Conflict-resolution rules

When two sources disagree:

## Case A — captain architecture vs customer requirement
Customer requirement wins for product correctness.

Do not silently change the captain architecture.

Record:

```text
Conflict:
Customer source:
Captain source:
Impact:
Proposed compatible resolution:
Decision needed from:
```

## Case B — old ARM guide vs DDS-specific memo
DDS-specific memo wins for training behavior.

Old ARM guide remains UI/workflow reference.

## Case C — captain old plan vs captain latest plan
Latest explicit captain plan wins.

## Case D — AI suggestion vs any source
Source wins.

## Case E — instructor feedback vs evaluator
Store instructor feedback as authoritative training feedback for that educational judgment, but retain model output and version for audit.

---

# 26. File and folder management rules for Codex

Before editing code:

1. inventory every file;
2. identify customer source files;
3. identify team specs;
4. identify code repositories;
5. identify generated artifacts;
6. identify potential duplicates by hash/content;
7. create a manifest.

Recommended:

```text
docs/PROJECT_MAP.md
docs/SOURCE_OF_TRUTH.md
docs/CURRENT_STATUS.md
docs/DECISIONS.md
docs/OPEN_QUESTIONS.md
docs/REQUIREMENTS_TRACEABILITY.md
docs/CHANGELOG.md
docs/FILE_MANIFEST.csv
```

For potential duplicate cleanup:

```text
docs/DUPLICATE_CANDIDATES.csv
docs/PROPOSED_MOVES.csv
```

Do not delete until Danil confirms.

Prefer moving obsolete generated files to:

```text
archive/
```

instead of immediate deletion.

---

# 27. Day 1 implementation checklist

Follow this order.

## Step 1 — inventory
Inspect the full `Хакатон 2026` folder.

Output:
- what files exist;
- where the customer documents are;
- where team specs are;
- whether code already exists;
- whether the classifier XLSX exists;
- whether the DDS memo exists;
- whether tickets PDF exists;
- whether ARM guide exists.

## Step 2 — identify source hierarchy
Create `docs/SOURCE_OF_TRUTH.md`.

## Step 3 — inspect required domain documents
Read:
- `9. Деп Обороны и ЧС.pdf`;
- `Работа с АРМ-112 для ДДС от ОКр_ГСИ.pdf`;
- `Билеты- задачи по C 112 . АГС_ГСИ.pdf`;
- classifier XLSX;
- ARM guide.

Extract only the fields/workflows needed for the first prototype.

## Step 4 — architecture
Create:
- `docs/architecture.md`;
- Mermaid diagram;
- component responsibilities;
- failure boundaries.

Required baseline:

```text
React
  |
FastAPI
  |------ PostgreSQL
  |------ Simulation service/domain layer
  |------ ML Gateway -> mock/local ML service
```

## Step 5 — data contract
Create:
- `config/data_contract.json`;
- `docs/data/DATA_CONTRACT.md`.

Mark draft-only rules clearly.

## Step 6 — database
Create initial Alembic migration.

Minimum:
- users;
- incidents;
- incident_types.

## Step 7 — acceptance for Day 1
Architecture, contract, migration can be read by the whole team.

No ML weights required.

---

# 28. Day 2 implementation checklist

## FastAPI

Required:
- `main.py`;
- auth router;
- incidents router;
- JWT skeleton;
- role extraction;
- Pydantic models;
- `/health`;
- API Dockerfile.

## React

Required:
- React 18 + TypeScript;
- Ant Design;
- Redux Toolkit;
- routing;
- Login;
- Incident List.

## Docker Compose

Required services:

```text
api
ui
db
```

The captain wording originally says "two services (api, ui)" in one summary, but the detailed Day 2 plan explicitly includes `api`, `ui`, and `db`. Use the detailed plan.

Optional future service:

```text
ml
```

Do not require it for Day 2.

## Verification

Must pass:

```bash
docker compose up --build
```

Then:
- UI opens;
- API health works;
- login returns JWT;
- protected incidents endpoint accepts token;
- incident list returns valid JSON;
- frontend can call API;
- DB persists;
- ML absence does not crash application.

---

# 29. Days 3–5 requirements for ML team

The main app must already provide contracts they can target.

ML work:
- parse/normalize ticket scenarios;
- scenario generator;
- dialogue recognition path if needed;
- evaluator skeleton.

Backend must supply mock endpoints/adapters if real models are not ready.

Define request/response DTOs early so Danil/frontend do not wait on models.

---

# 30. Days 6–8 requirements

UI/backend:
- incident/card create flow;
- DDS-relevant controls;
- mock communication/VoIP;
- RBAC;
- instructor case routes;
- monitoring skeleton.

Do not overbuild analytics.

---

# 31. Days 9–10 requirements

- classifier import into PostgreSQL;
- normalized routing data;
- pgcrypto-sensitive fields where applicable;
- evaluator integration;
- `/eval/run` or agreed equivalent;
- model/version metadata.

---

# 32. Days 11–12 requirements

Required end-to-end test:

```text
login
-> receive/start training task
-> open/create card
-> fill fields
-> submit
-> evaluate
-> view result
```

Additional tests:
- invalid login;
- unauthorized role;
- invalid incident type;
- DB unavailable;
- ML unavailable;
- evaluation timeout/failure;
- UI degraded state.

Performance:
- profile before optimizing;
- do not blindly fix worker count to 4 if the deployment hardware suggests otherwise;
- preserve captain plan but document any measured adjustment.

---

# 33. Day 13–14 requirements

Day 13:
- production image;
- deployment on local test environment;
- smoke test.

Day 14:
- regressions;
- demo cleanup;
- deployment docs;
- API docs;
- architecture image;
- short demo scenario;
- video/screen demonstration if useful.

---

# 34. Definition of MVP

The hackathon MVP is not "all features mentioned in every document".

The MVP must convincingly show the core learning loop:

1. User logs in as trainee.
2. Trainee receives or starts a training case.
3. System simulates an incoming DDS-related task/message/call.
4. Trainee works in an ARM-like interface.
5. Trainee fills/submits an incident/card or DDS response.
6. System records timing/actions.
7. Evaluator compares the work with the reference.
8. Result includes mistakes/critical errors/timing.
9. Instructor can inspect the result and correct the evaluation.
10. System remains usable if ML is temporarily unavailable.

If this works reliably, then expand.

---

# 35. Acceptance criteria for Danil's current work

Danil's current milestone is accepted when:

- FastAPI skeleton exists;
- project starts;
- `/health` works;
- auth route exists;
- JWT/role skeleton exists;
- incidents CRUD stubs exist;
- data models are versioned/documented;
- Swagger works;
- no ML model is required to boot the app;
- React Login page exists;
- React Incident List exists;
- Redux store exists;
- frontend API client exists;
- Docker Compose runs api + ui + db;
- PostgreSQL starts;
- source references are documented;
- implementation is consistent with captain's current plan.

---

# 36. What Codex must NOT do right now

Do not:
- switch React to Vue/Svelte/Next without approval;
- switch FastAPI to Django/Node;
- replace PostgreSQL with MongoDB;
- use cloud Firebase;
- use Twilio SaaS as required runtime;
- add Kubernetes as a sprint prerequisite;
- implement microservices for every small module;
- create a huge speculative database;
- download model weights without an agreed model manifest;
- commit multi-GB models to Git;
- use random internet incident taxonomies;
- create scoring weights and call them "official";
- recreate the classifier manually;
- implement full telephony before the mock is complete;
- spend Day 1–2 on polishing analytics;
- change captain's sprint because another architecture seems more elegant.

---

# 37. Presentation/deadline notes

Existing hackathon note:

- slides 7–11 of the official presentation template are mandatory and should keep their original design/structure;
- other slides are more flexible;
- submission deadline noted in the team material:
  **29 September, 23:59 Moscow time**.

Relevant file:

```text
ЛЦТ2026 Шаблон презентации.pptx
```

Do not modify the mandatory slide structure when presentation work begins.

---

# 38. Useful external references already collected

These are supplementary references, not higher priority than customer files.

Federal/system references:

```text
https://government.ru/docs/all/137483/
https://government.ru/docs/all/137483/?page=2
https://government.ru/docs/all/137747/
https://publication.pravo.gov.ru/
```

Professional standard / qualification references:

```text
https://mintrud.gov.ru/docs/mintrud/orders/2118
https://base.garant.ru/412410722/53f89421bbdaf741eb2d1ecc4ddb4c33/
https://nok-nark.ru/pk/detail/12.00200.08
```

Moscow address data reference:

```text
https://data2.apicrafter.ru/packages/datamos-addressreestr
```

Additional reference mentioned:

```text
https://www.nalog.gov.ru/rn27/news/smi/16140978/
```

Customer Q&A video:

```text
https://drive.google.com/file/d/1qpYkmGuSVKPBrBQgC_WB5luTcDzr0ZW9/view?usp=drive_link
```

External references should be used only when the customer files do not already answer the question or when the team needs formal validation.

---

# 39. Recommended derived reference package

If the necessary files are already present, do not redownload them.

Potential verified supplemental sources:
- Federal Law 488-FZ;
- Government Decree No. 1931;
- Government Decree No. 2071;
- relevant Moscow regulations;
- 149-FZ;
- 152-FZ;
- professional standard / Ministry of Labour order;
- NARK qualification requirements;
- Moscow address register.

Keep these as supplementary reference, not as the main sprint spec.

---

# 40. Decision log requirements

Every important project change should be recorded.

`docs/DECISIONS.md` format:

```text
## DEC-XXX — title

Date:
Status:
Decision:
Reason:
Sources:
Alternatives:
Impact:
Owner:
```

Examples requiring a decision record:
- route naming;
- final incident/card schema;
- exact UI layout;
- scoring weights;
- model choice;
- ASR model;
- two-factor auth implementation;
- timer interpretation;
- service boundary;
- Docker service split.

---

# 41. Open questions that Codex should surface instead of guessing

Examples:
- Does `Interface Guidelines v1.0 – Section 3` exist as a real file, or is it only a label used in the captain-generated plan?
- What exact fields from the customer documents are mandatory for the first DDS card?
- Which timers are normative and which were informal Q&A notes?
- Is 2FA mandatory for the hackathon MVP or final target only?
- Does the DDS trainee create a new incident card, update an incoming card, or both in the target simulation?
- Which DDS types are mandatory for MVP?
- Which incident categories should be demonstrated first?
- What is the final scenario JSON schema?
- What evaluator scoring weights should be used initially?
- What local hardware will run the ML model?
- Which local ASR/TTS model will be selected?
- Which instructor actions are needed for the demo?
- Does the product need WebSocket for the early VoIP mock, or is REST + frontend timer enough for Day 2?

Store unresolved items in:

```text
docs/OPEN_QUESTIONS.md
```

---

# 42. Codex first-run procedure

When Codex receives access to `Хакатон 2026`, do not immediately rewrite the project.

Perform this sequence:

## Phase 0 — inspect

1. Print the root tree.
2. Identify the two input folders.
3. Find all customer files.
4. Find all team/captain specs.
5. Find any existing code.
6. Find duplicate copies by hash.
7. Find archives that contain relevant source files.
8. Find whether the named DDS memo, ticket PDF and classifier XLSX are present.
9. Find the ARM guide.
10. Find the presentation template.

## Phase 1 — report

Create/update:

```text
docs/PROJECT_MAP.md
docs/SOURCE_OF_TRUTH.md
docs/CURRENT_STATUS.md
docs/OPEN_QUESTIONS.md
```

Before moving or deleting anything, show Danil:
- proposed repository structure;
- proposed file moves;
- duplicate candidates;
- risks.

Wait for confirmation for destructive operations.

## Phase 2 — establish skeleton

After structure is agreed:
- backend skeleton;
- frontend skeleton;
- DB;
- Compose;
- data contract;
- docs.

## Phase 3 — verify

Run:
- backend tests;
- frontend typecheck/build;
- compose build;
- smoke test.

## Phase 4 — summarize changes

Provide:
- files created;
- files changed;
- commands run;
- test results;
- blockers;
- open questions;
- what Danil should review next.

---

# 43. Required code quality conventions

Backend:
- type hints;
- Pydantic DTOs;
- routers thin;
- domain/service logic outside routers;
- DB sessions via dependency;
- configuration from environment;
- secrets not committed;
- `.env.example`;
- structured logging;
- centralized errors.

Frontend:
- typed API client;
- no business truth hardcoded into components;
- Redux slices for auth and incident/session state;
- reusable table/form components;
- loading/error/degraded states;
- Russian UI labels where applicable.

Tests:
- backend route tests;
- service tests;
- integration smoke test;
- no test dependence on real ML.

---

# 44. Failure isolation

The captain requires modular failure behavior.

Do not wrap every endpoint in arbitrary `try/except` blocks just to return 502.

Instead use:
- service boundaries;
- explicit domain/application exceptions;
- FastAPI exception handlers;
- health/readiness endpoints;
- DB error handling;
- ML adapter timeouts;
- circuit/degraded state where useful.

If ML crashes:
- show "model unavailable";
- preserve non-ML flow.

If DB is unavailable:
- do not pretend durable incident creation succeeded.
- If the team later implements a local queue, make it explicit and test it.
- Do not invent offline persistence behavior that is not implemented.

---

# 45. Security baseline

- local deployment;
- no production secrets in repo;
- password hashing;
- JWT expiry/configuration;
- RBAC;
- database user/password via environment;
- pgcrypto for selected sensitive fields if confirmed by team design;
- audit events where useful;
- synthetic data for demo;
- avoid real citizen PII.

Do not spend MVP time implementing enterprise security controls that are not required for the demo, but keep architecture compatible.

---

# 46. Data privacy

For development/demo:
- synthetic names;
- synthetic phone numbers;
- synthetic addresses where possible, or non-personal public address data;
- synthetic audio;
- customer-provided training materials.

Do not scrape or import real 112 caller data.

---

# 47. ML truth boundary

Critical rule:

> The neural network is not the source of domain truth.

Use:
- customer classifier;
- customer DDS workflow;
- confirmed rules;
- instructor reference;
- validated derived schema.

Use ML for:
- variation/generation;
- semantic extraction;
- classification assistance;
- free-text analysis;
- error explanation;
- difficulty estimation;
- optional speech recognition;
- evaluation assistance.

Do not let ML invent service routing that conflicts with the classifier.

---

# 48. Source-to-feature traceability

Create `docs/REQUIREMENTS_TRACEABILITY.md`.

Recommended table columns:

```text
REQ_ID
Requirement
Source type
Source file
Page/section
Priority
Module
Implementation status
Test
Notes
```

Example requirement groups:
- AUTH;
- ROLE;
- INCIDENT;
- DDS;
- UI;
- TIMER;
- VOIP;
- EVAL;
- INSTRUCTOR;
- ML;
- LOCAL;
- PERFORMANCE;
- SECURITY.

---

# 49. Recommended first vertical slice

Build one complete narrow scenario before expanding.

Suggested vertical slice:

```text
Trainee login
-> one predefined training case
-> incoming mock event
-> open ARM-like card
-> fill required fields
-> choose/confirm incident type
-> submit
-> store result
-> mock evaluator returns structured result
-> instructor can see result
```

Then replace mock evaluator with real evaluator.

This demonstrates integration without waiting for ML training.

---

# 50. Final instruction to Codex

Follow the captain's current implementation plan closely.

The immediate target is **not** to redesign the project.

The immediate target is to make Days 1–2 deliverables real, clean and extensible:

```text
Architecture
+ data contract
+ FastAPI skeleton
+ React skeleton
+ PostgreSQL
+ Docker Compose
+ Login
+ Incident List
+ initial card flow
+ ML isolation layer
```

The interface work must be grounded in the customer DDS/ARM materials.

Danil is currently responsible for the FastAPI skeleton and participates in architecture/frontend, so keep the initial backend simple enough for him to understand and maintain.

Do not wait for the neural network.

Provide mocks/adapters so the team can integrate later.

When uncertain, ask Danil with the exact conflict and filenames involved instead of guessing.

