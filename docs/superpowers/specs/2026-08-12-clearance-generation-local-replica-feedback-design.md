# Clearance Generation and Course-Scoped Feedback Design

## Problem

Student eligibility loads from the local database, but generating an approved clearance fails. The local MongoDB server reports itself as a standalone writable server without a replica-set name. Attendity's clearance repository uses a multi-document transaction to expire an earlier valid report, create the new signed report, and record its archive event. Standalone MongoDB does not support this transaction.

The clearance page also stores one global feedback string, so generation and export messages appear outside the course card that initiated the action.

## Approved Solution

### Local database topology

Convert the existing local MongoDB service into a single-node replica set and initialise it in place. Preserve the current database path and records. Do not replace, reseed, delete, or migrate user data. Confirm the replica set has a writable primary before testing Attendity.

This keeps local development aligned with MongoDB Atlas and preserves the existing atomic clearance transaction. Attendity will not add a non-transactional fallback.

### Clearance feedback state

Replace the page-wide feedback string with feedback keyed by course ID for course-card actions. Each entry records a success or error tone and a user-safe message.

- Generation success reveals Download PDF and Print PDF inside that course card.
- Generation failure displays the API's safe response message inside that course card.
- Download and print success or failure also display inside the same course card.
- Archive-level download, print, and share actions may retain archive-level feedback because they are not initiated from an eligibility card.
- Starting a new action clears only the feedback for the affected course.

### Error handling

Use the established API error-message utility to extract the server's sanitized message. Do not expose stack traces, MongoDB errors, internal identifiers, or transaction details in the interface. The generic retry message remains the fallback when the server provides no safe message.

## Data and security guarantees

- Existing clearance report transaction and unique-valid-report constraint remain unchanged.
- Report signing, checksum generation, audit logging, archive events, authorization, and eligibility checks remain unchanged.
- Local MongoDB data is preserved.
- The MongoDB service is restarted only as required to activate replica-set configuration.

## Verification

1. Confirm MongoDB reports a replica-set name and writable primary.
2. Run the existing clearance API tests.
3. Add a frontend regression test proving API errors appear only in the initiating course card.
4. Add a frontend regression test proving successful generation reveals Download PDF and Print PDF inside the initiating card.
5. Run focused clearance frontend tests, API/web typechecks, lint, and formatting checks.
6. Exercise generation against the local MongoDB-backed API and confirm a clearance report and archive event are created.

## Scope

This repair changes only local MongoDB transaction capability and clearance-card feedback. It does not weaken transaction semantics, alter eligibility calculations, reseed data, or redesign unrelated dashboard pages.
