# Context Policy

Hot: AGENTS.md plus current user request.
Warm: PROJECT_STATE.md, TASK_QUEUE.md, relevant contract/source/UI map.
Cold: customer originals, raw extraction cache and historical chat.

Do not reload full PDFs/chats on every continuation. Query the source index and inspect only a disputed/changed rule with page/row provenance. Persist decisions with reason/evidence rather than narrative logs.

Before resuming inspect actual files, Git state and tests. Memory is a locator, not authoritative proof. After a major step write current verified state, failed/unrun checks and next action. Never erase user changes to restore a remembered state.

