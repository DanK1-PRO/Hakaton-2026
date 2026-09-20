# Requirements Traceability

| ID | Requirement | Source | Code / proof |
|---|---|---|---|
| STACK | Agreed stack, ML-independent boot | master §§6-7,18 | backend/frontend/compose; build and tests |
| AUTH | Roles, own trainee data | master §12; SoW roles | auth.py; ownership tests |
| DDS-OPEN | Received on opening | memo p.21 | open route; flow test |
| DDS-TIME | Acknowledgement within 30s | memo pp.5,21 | timestamps; late acknowledgement test |
| DDS-REFUSE | Mandatory refusal comment | memo pp.21-26 | domain.react; refusal test |
| DDS-RECOVER | Rejected → accepted | memo p.25 | TRANSITIONS; recovery test |
| DDS-LOCK | Terminal edit lock | memo pp.22,32 | editable; final-state test |
| UI | List/card/phone/classification/services | memo pp.11-19; screenshot DOCX images5,10 | React; Playwright and screenshots |
| DATA | Source classifier | master P2 | build_classifier.py; 1,283 source rows |
| SIM | Full training cycle | master §34 | sessions/actions/evaluation; flow tests |
| EVAL | Explainable output and correction | master §§16-17 | gateway/feedback; correction test |
| ML | Local adapter and fallback | master §18 | gateway; unavailable-service test |
| PHONE | Mock only | captain §§4,21 | communication state machine; E2E |
| LOCAL | No cloud dependency at runtime | SoW physical p.7; master §22 | locally served UI/API/DB |
| RESILIENCE | Short interruption | SoW performance | persisted state/retry; browser interrupted-write test; no durable offline queue |
| DOC | Methods, architecture, installation | SoW physical p.18 | document register |
| PERFORMANCE | 100 users, <=2s UI, >=20 calls | SoW performance | full customer acceptance pending |
| CRYPTO | pgcrypto | captain days9-10 | extension provisioned; field encryption pending; synthetic data only |

