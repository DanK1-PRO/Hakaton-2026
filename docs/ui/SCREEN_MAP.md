# Screen Map

| Route | Screen | Roles | Main transition |
|---|---|---|---|
| unauthenticated | Вход | All | Login → incidents |
| /incidents | Поиск происшествий | All | Open/create/filter |
| /training | Учебные задания | All authenticated | Start → card |
| /incidents/:id | Карточка ДДС | Owner or staff | React → finish → result |
| /results | Мои результаты / Контроль занятий | All, role-filtered | Inspect, staff feedback/export |
| /users | Пользователи | Administrator | Add account |

State coverage: loading, empty, validation, request error, stale version, locked card, finished training, unavailable ML. Read polling never overwrites the open edit form.

