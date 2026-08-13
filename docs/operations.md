# Operations, backup, and recovery

## Health and monitoring

- `/api/v1/health/live` confirms that the process event loop can serve requests.
- `/api/v1/health/ready` returns `200` only while Mongoose is connected to Atlas.
- Every response carries `X-Request-Id`; structured logs use the same value and redact tokens, cookies, passwords, and face captures.
- Configure platform alerts for readiness failures, HTTP 5xx rate, p95 latency, process restarts, Atlas connection saturation, storage growth, and notification worker failures.

Container logs are written to standard output. Retention and rotation belong to the deployment platform; retain security and audit logs according to university policy.

## Database backup

Atlas continuous backups are the primary production mechanism. The repository script provides an independently restorable archive when MongoDB Database Tools are installed:

```bash
npm run backup -w @qr/api
```

The script creates `backups/<timestamp>/mongodb.archive.gz` and a manifest. Store the archive in encrypted object storage with restricted access, retention rules, and an off-site copy. Include Cloudinary media, deployment environment configuration from the secret manager, and generated institutional exports in the wider recovery policy.

## Restore drill

Restores are destructive and deliberately require two explicit inputs:

```bash
ALLOW_DATABASE_RESTORE=true RESTORE_ARCHIVE=backups/<timestamp>/mongodb.archive.gz npm run restore -w @qr/api
```

The script accepts only archives under the repository `backups` directory and invokes `mongorestore --drop`. Always restore first into an isolated Atlas project, validate counts, tenant isolation, authentication, attendance totals, clearance signatures, and indexes, then schedule the production recovery with institutional approval.

Recommended targets: recovery point objective of 24 hours or better and recovery time objective of 4 hours or better, adjusted to the university service agreement.

## Seed data

Demo data is idempotent and uses realistic Nigerian university records. It must never be run against a production database. Set a dedicated non-production Atlas URI and then run:

```bash
ALLOW_DEMO_SEED=true SEED_ACCOUNT_PASSWORD='a-long-demo-only-passphrase' npm run seed -w @qr/api
```

The seed creates one university, three faculties represented through four departments, multiple lecturers and students, administrators, an examiner, courses, registrations, closed sessions, attendance records, and university settings.
