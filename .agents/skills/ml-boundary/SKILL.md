---
name: ml-boundary
description: Integrate a teammate's local DDS ML package through the versioned gateway with bounded failure handling.
---

Read docs/ML_INTEGRATION.md and only the relevant config/*schema.json. Keep weights and model libraries outside the main API environment. React never calls a model service.

Validate schema_version, session_id, output shape and model/reference versions. Bound call duration. Service failure must return explicit fallback mode while preserving training data. Model output cannot control permissions, routing rules or state transitions.

Run the included local contract service before attaching weights, then test unavailable, malformed and mismatched responses. Preserve instructor corrections as separate audit records.

