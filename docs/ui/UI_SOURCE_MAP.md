# UI Source Map

| Screen | Source / locator | Visible blocks | Confidence |
|---|---|---|---|
| Login | master §8.1; DDS memo p.11 | Email/password/remember; role after login | CONFIRMED_CAPTAIN |
| Incident list | DDS memo pp.11-14,35-40; DDS screenshot DOCX image5 | Search, filters, rows, description expansion, pagination | CONFIRMED_CUSTOMER |
| DDS card | DDS screenshot DOCX image10; memo pp.15-19,23-25 | Grey ARM canvas; phone top; address/description left; classification right; blue/dark service response/history below | CONFIRMED_CUSTOMER, TRAINING_APPROXIMATION |
| Card-112 reference | `СКРИНШОТ КАРТОЧКИ 112ГСИ.docx` images1-9; `КАРТОЧКА 112.docx` extracted images | Orange action/service bar, detailed address grid, incident scenario tags, save/action buttons | CONFIRMED_CUSTOMER_FOR_112, DO_NOT_AUTOMATICALLY_TRANSFER_TO_DDS |
| Service-112 reference | `СЛУЖБЫ 112.docx` extracted images | Service dock/history/status editor variants; blue service history, dark locked bar and orange active controls | CONFIRMED_CUSTOMER_FOR_112, DDS_TRANSFER_REQUIRES_SOURCE_CHECK |
| Local map | Danil request; Card-112 address control evidence | `MapPanel` opens a local mock map from the card address; external Yandex geocoding is locked pending explicit approval and key | TEAM_PROPOSAL_SAFE_LOCAL_ONLY |
| Reaction modal | memo pp.21-26; screenshot DOCX images11,13,14 | Bottom editor: status, operator, comment, save/cancel | CONFIRMED_CUSTOMER, TRAINING_APPROXIMATION |
| Training catalogue | master §34 | Scenarios/difficulty/start | TEAM_PROPOSAL visual layout |
| Results | master §§16-17,34 | Findings/timing/instructor correction | TEAM_PROPOSAL visual layout |

Observed reference layout is preserved as functional bands and source-measured colors where practical: card canvas `#c9ced1`, panels `#efefef`, services `#49555d`, active service/history `#157dbd`, Card-112 orange `#ec653b`, list canvas `#838f97`, classification header `#303335`, reaction editor `#1b5173` family. Details of the latest visual pass are in `docs/ui/ARM_VISUAL_REFERENCE_PASS.md`. Mobile stacks the same blocks. No claim of a pixel-perfect production ARM replica. No actual telephone numbers from the source screenshots appear in the demo.
