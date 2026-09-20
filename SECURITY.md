# Security / Безопасность

This repository is a local training prototype, not an emergency dispatch production system.

- Default network exposure is loopback. Use TLS and individual accounts before a LAN deployment.
- JWT secret and database password are generated into ignored .env. Do not commit .env.
- Seed credentials are demo-only and configurable before first seeding.
- Passwords use Argon2. Authorization verifies database role and incident ownership on the server.
- PostgreSQL pgcrypto is provisioned; field-level PII encryption is not implemented. Only synthetic training data belongs here.
- Report security issues privately to the repository owner using GitHub's private reporting facilities when enabled. Do not post secrets or real caller data in issues.
- Model outputs are untrusted data and cannot override deterministic workflow rules.

Known scope limits: no 2FA, no external identity provider, no production instructor-group isolation or account lockout policy. These need agreement for the integrated deployment.

