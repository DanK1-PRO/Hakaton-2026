# ARM DDS Visual Reference Pass

Date: 2026-09-21. Branch: `ui/danil-integration-review`.

## Sources Studied

- `data_derived/raw/Работа с АРМ-112 для ДДС от ОКр_ГСИ.txt`, pages 11-19, 21-26, 32.
- `data_derived/raw/СКРИНШОТ ДДСГСИ.txt`.
- `data_derived/raw/СКРИНШОТ ДДСГСИ_image5.png`: incident list / message rows.
- `data_derived/raw/СКРИНШОТ ДДСГСИ_image10.png`: DDS card workspace.
- `data_derived/raw/СКРИНШОТ ДДСГСИ_image11.png`, `image13.png`, `image14.png`: bottom status editor and service history variants.
- `data_derived/raw/СКРИНШОТ КАРТОЧКИ 112ГСИ_image1.png` and new `КАРТОЧКА 112_image*.png`: card-112 address grid, orange action bar and incident feature chips.
- `data_derived/raw/СЛУЖБЫ 112_image*.png`: service dock/history variants and status editor patterns.

## Source Measurements Used

All screenshots are 1920x1080. The simulator copies the application-area colors and block order, not the browser chrome.

| Source element | Reference color |
|---|---|
| Card canvas | `#c9ced1` |
| Data panels | `#efefef` |
| Service bar | `#49555d` |
| Card-112 action/service bar | `#ec653b` |
| Active service/history | `#157dbd` |
| Classification header | `#303335` |
| Incident list canvas | `#838f97` |
| Dark incident/list rows | `#2f353a` |
| Dimmed reaction background | `#797b7d` / `#8d8d8d` family |
| Reaction editor blue | `#1b5173` family |

## UI Changes Implemented

- The training card page now uses a denser ARM-like shell: compact top controls, grey canvas, flat rectangular fields and source-like spacing.
- Phone fields, caller data, supplied/place phone placeholders, incident number and operator are aligned in a single top strip.
- Address/description stay on the left, while victims/ambulance refusal/blocked/CHS/CHP, incident type, features, class and VIS class stay on the right.
- Unknown fields remain visibly `Нет данных` instead of being invented.
- The address block was expanded into a Card-112-like field grid: country, subject, settlement, district, street, house, корпус, подъезд and descriptive address. It remains frontend-only until the backend schema is extended.
- The `карта` control now opens a fully local training `MapPanel`: built-in Moscow scheme, incident marker and service route. It does not request API keys and does not send addresses to Yandex or any external provider. A future real offline map layer should be connected from local OSM/PMTiles/MBTiles files, not from an internet API.
- The service dock now shows the real training DDS service plus reference service tiles from EKP routes. Only the training DDS tile is active; route tiles open the route reference and do not imply real notification.
- The active service/action bar uses the Card-112 orange source color while locked/staff service variants preserve the darker DDS service style.
- The reaction editor is styled as a bottom ARM work panel with dark-blue source-like colors instead of a generic white Ant Design dialog.
- Training explanations are moved behind the `?` panel and a small `Учебное расширение` note, so the main field placement stays close to the real ARM.
- Tooltips no longer intercept clicks on mobile, which matters for touch-like training use.

## Verification Evidence

- DOM computed colors after the pass:
  - `.arm-scene`: `rgb(201, 206, 209)`.
  - `.arm-field`: `rgb(239, 239, 239)`.
  - `.arm-service-bar` in active own card: `rgb(236, 101, 59)`.
  - `.arm-service-tile`: `rgb(21, 125, 189)`.
  - `.arm-type`: `rgb(48, 51, 53)`.
- `npm run build`: passed.
- `npx playwright test tests/arm.spec.ts`: 8 passed.
- `npm test`: 16 passed.
- `backend/tests`: 15 passed.
- `ruff check scripts/extract_sources.py`: passed through local `.venv\Scripts\ruff.exe`.

## Remaining Limits

This is a high-fidelity training approximation, not a legally exact certified clone of the production ARM. The backend currently models one DDS service, mock phone events and route references. Independent multi-service state, real VoIP/audio/SMS, true VIS classification fields, production-grade offline GIS packages, actor directory lookup and all official search filters remain future integration work.
