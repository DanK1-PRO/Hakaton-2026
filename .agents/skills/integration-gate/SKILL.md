---
name: integration-gate
description: Verify a DDS delivery against functional flow, source fidelity and documented deployment evidence.
---

Read docs/ACCEPTANCE.md and the changed modules. Run backend tests/lint, frontend build and affected browser scenarios. Validate migrations against PostgreSQL, not SQLite alone. Inspect desktop/mobile screenshots for clipping and overlap.

Test mock mode without real ML and local adapter failure. Check contracts match code and generated source provenance remains present. Verify fresh-start commands and GitHub CI when available.

Write actual commands/results/limitations in docs/VERIFICATION.md and refresh compact memory. Passing narrow tests does not prove full customer load/security/ML acceptance. Do not declare completion while required delivery gates remain unverified.

