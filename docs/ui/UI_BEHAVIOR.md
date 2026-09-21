# UI Behavior

Opening an owned incoming card registers received exactly once. Staff inspection does not impersonate the trainee. Status options come from server-provided allowed_statuses, derived from the DDS memo. Rejected offers accepted only. Terminal cards and finished sessions lock modifications.

A live acknowledgement display uses server created_at. A saved acknowledgement freezes its elapsed time. Evaluation timing is server-calculated. Normal form errors keep entered text; no successful-save notice is shown for failures.

Edit and reaction forms keep a local draft. If polling receives a newer card version while a modal is open, saving is disabled until the trainee explicitly reloads actual server data or keeps editing without overwrite. A cancel action with unsaved text asks for confirmation.

The ARM service dock shows the current training DDS service, last reaction time, source-like service history, route reference and full action history. Route reference is informational only; it does not mean that another service was actually notified.

Phone mock: idle→ring→answer→hangup, or ring→hangup. No outbound real call is made.
Search state has explicit filters, order and pagination. Reference data is shared via API, never duplicated by hand in React.

Reduced-motion preference disables animation. Dense tables scroll inside their own container on mobile; the page itself must not overflow horizontally.
