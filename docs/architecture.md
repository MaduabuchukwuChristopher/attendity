# Attendity architecture

Attendity is a TypeScript npm-workspaces monorepo. The public site and authenticated product are independently deployable React applications. The Express API owns business rules, tenant isolation, authentication, exports, audit events, notifications, and realtime delivery. MongoDB Atlas is the only supported production database.

```mermaid
flowchart LR
  User[University user] --> Edge[CDN / TLS ingress]
  Edge --> Landing[Landing React app]
  Edge --> Web[Authenticated React PWA]
  Web -->|Bearer access token + secure refresh cookie| API[Express API]
  Web <-->|Authenticated Socket.IO| API
  API --> Atlas[(MongoDB Atlas)]
  API --> Face[Optional face verification provider]
  API --> Mail[Notification delivery providers]
  API --> SMTP[Transactional account email]
```

## Request and tenancy boundary

```mermaid
sequenceDiagram
  participant Browser
  participant API
  participant Auth as Authentication middleware
  participant Service
  participant Atlas as MongoDB Atlas
  Browser->>API: HTTPS request + bearer token
  API->>API: Rate limit, sanitise, validate origin/body
  API->>Auth: Verify signed access JWT
  Auth->>Service: Actor with universityId and permissions
  Service->>Atlas: Tenant-scoped repository query
  Atlas-->>Service: Tenant-owned records only
  Service-->>Browser: Standard API envelope
```

Every tenant-owned schema includes `universityId`, timestamps, audit actor fields, and soft-deletion support. Controllers translate HTTP concerns; services enforce business rules; repositories own database access; Zod schemas validate external input.

## Core data model

```mermaid
erDiagram
  UNIVERSITY ||--o{ USER : owns
  UNIVERSITY ||--o{ DEPARTMENT : owns
  DEPARTMENT ||--o{ COURSE : offers
  USER ||--o{ COURSE : lectures
  USER ||--o{ COURSE_REGISTRATION : registers
  COURSE ||--o{ COURSE_REGISTRATION : has
  COURSE ||--o{ ATTENDANCE_SESSION : schedules
  ATTENDANCE_SESSION ||--o{ ATTENDANCE_RECORD : records
  USER ||--o{ ATTENDANCE_RECORD : marks
  COURSE_REGISTRATION ||--o{ CLEARANCE_REPORT : produces
  CLEARANCE_REPORT ||--o{ REPORT_ARCHIVE_EVENT : audits
  USER ||--o{ NOTIFICATION : receives
```

## Authentication flow

```mermaid
sequenceDiagram
  participant Client
  participant API
  participant Store as Refresh token store
  Client->>API: POST /auth/login
  API-->>Client: Short-lived access JWT + HttpOnly SameSite cookie
  Client->>API: API request with bearer token
  API-->>Client: Authorised response
  Client->>API: POST /auth/refresh + cookie + trusted Origin
  API->>Store: Revoke previous refresh token
  API-->>Client: Rotated refresh cookie + access JWT
  Client->>API: POST /auth/logout
  API->>Store: Revoke active refresh token
  Client->>API: Revoke one device or all sessions
  API->>Store: Revoke selected refresh-token records
```

## Attendance and QR flow

```mermaid
sequenceDiagram
  participant Lecturer
  participant API
  participant Student
  Lecturer->>API: Open attendance session
  API-->>Lecturer: Rotating encrypted and signed QR credential
  Student->>API: Resolve credential requirements
  API-->>Student: GPS/face requirements
  Student->>API: Credential + permitted verification evidence
  API->>API: Verify signature, expiry, nonce, registration, GPS, face, duplicate
  API-->>Student: Verified attendance record
  API-->>Lecturer: Realtime attendance update
```

## Eligibility and clearance flow

```mermaid
flowchart TD
  Records[Live attendance records] --> Eligibility[Eligibility engine]
  Registration[Approved course registration] --> Eligibility
  Settings[University threshold] --> Eligibility
  Eligibility -->|Eligible| Report[Versioned signed clearance report]
  Report --> QR[Opaque verification QR]
  QR --> Verify[Public server verification]
  Verify --> Integrity[Checksum + HMAC + current source hash]
  Integrity --> Result[Valid / expired / revoked / invalid]
```

Clearance decisions are never trusted from QR payloads or cached client state. Verification always occurs on the server against the signed report and current attendance source.
