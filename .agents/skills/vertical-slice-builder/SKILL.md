---
name: vertical-slice-builder
description: Implement a complete DDS training path across API, React and persistence while preserving workflow invariants.
---

Trace the requested action from React through API authorization/domain state to SQLAlchemy and back. Use versioned DTOs and existing Redux Toolkit Query patterns.

Timestamps and transition validation belong on the server. Keep card reaction status separate from training-session completion. Record each accepted mutation with actor/time in the same transaction. Preserve unsaved form text on failed requests; do not optimistically declare success.

Verify the exact role and browser path. Include a negative case for authorization, terminal state or version conflicts when touched. Update the source/UI map for changed domain behavior.

