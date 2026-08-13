# Institution configuration

Attendity preserves the existing `University` collection and `universityId` tenant key for data and API compatibility. The user-facing product treats that key as an institution identifier and resolves display language through a centralized terminology map.

## Supported institution types

The configuration supports universities, polytechnics, colleges of education, technical colleges, vocational or skills training centres, institutes, academies, nursing or health sciences schools, seminaries, military or paramilitary academies, and a generic configurable post-secondary institution.

Authenticated users can read the safe display configuration from `GET /api/v1/settings/institution`. Administrators with `settings:read` and `settings:write` can manage identity, locale, terminology, and attendance defaults through the institution settings page and `PUT /api/v1/settings`.

## Managed academic structure

The `/app/academic-structure` workspace provides governed, tenant-scoped management for campuses,
faculties or schools, programmes, levels, academic sessions, semesters or terms, and venues. Records
support parent relationships, active/inactive lifecycle states, period dates, and current-session or
current-term selection. They remain separate from historical attendance data, and records with active
children cannot be deactivated until their hierarchy has been resolved.

The API is available at `GET` and `POST /api/v1/academic/structure` plus `PATCH` and `DELETE
/api/v1/academic/structure/{structureId}`. List requests support kind, status, search, and pagination.

## Backward compatibility

Existing records are not renamed or moved. Existing clients may continue sending the original attendance settings fields; newly introduced institution fields are optional on updates and retain their stored values when omitted. A blank `logoUrl` explicitly removes the configured logo.

For a database created before institution configuration was introduced, run the idempotent compatibility migration during a controlled maintenance window:

```powershell
$env:ALLOW_INSTITUTION_CONFIG_MIGRATION='true'
npm run migrate:institution-config -w @qr/api
```

The migration only supplies values that are currently absent. It also creates compatible academic
structure entries from distinct campus, faculty, programme, and level values already used by people and
departments, plus the configured current academic session and semester. It does not rewrite existing
references. Review institution type, country, time zone, date format, terminology, and academic structure
in the administration interface after it completes.

## Terminology

Presets affect presentation only. They do not change permissions, tenant identifiers, collection names, or historical records. Custom terminology overrides are validated, tenant-scoped, and returned with the resolved terminology so every client can render consistent labels.
