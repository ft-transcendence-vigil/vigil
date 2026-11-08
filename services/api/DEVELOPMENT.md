# API development notes

These items were migrated from `notes.txt`. They are historical follow-ups, not verified current defects or completed features.

## Follow-ups to verify

- Investigate the previously noted test issues involving secure cookies and HTTPS.
- Review API-key environment configuration and the deployment's website-name configuration.
- Check whether the proposed admin-only `GET /api/config/keys` endpoint returning `api_key` and `ingestion_key` is still required. Review secret-exposure implications before implementing it.

## Account safety

Normal user operations must never delete or reset the password of the API backing account (`mustbe@api.email`). The CLI's explicitly confirmed, fixed-account recovery may create a missing account or restore its admin role while preserving an existing ID and password hash. See [API administration](HEYADMIN.md).

## Previously noted specification differences

- A notifications table with entity, DTOs, service, controller, and WebSocket support.
- Alert-history status stored on the entity, with a PATCH operation to update it.

Verify these historical notes against the current implementation and specification before treating them as outstanding work.
