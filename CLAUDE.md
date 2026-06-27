# Restaurant Booking SaaS — AI Context Layer (DO NOT BREAK RULES)

This file defines the **non-negotiable execution contract** for any AI working in this repository.

It is not documentation.

It is a **runtime behavioral constraint system**.

---

# 1. System Definition

Restaurant Booking SaaS is a **multi-tenant reservation platform for restaurants**.

Core flow:

WhatsApp Business Platform → Webhook → Reservation Engine → PostgreSQL (Prisma) → Dashboard (Angular)

The system must:
- Scale to hundreds of restaurants
- Handle thousands of daily reservations
- Guarantee strict tenant isolation
- Be deterministic (AI is NOT part of core logic)

---

# 2. Hard Constraint: AI Role

AI is strictly limited.

## Allowed:
- Parsing fallback only
- Ambiguity resolution fallback only
- Experimental future features (explicitly enabled)

## Forbidden:
- Core reservation logic
- Business rules execution
- Decision-making for availability
- Tenant routing decisions

If AI is used incorrectly → architecture is invalid.

Reference:
docs/backend/12-ai-fallback-strategy.md

---

# 3. Mandatory Context Loading Order

Before generating ANY code, follow this order strictly:

## Product Layer
1. docs/product/00-product-vision.md
2. docs/product/01-business-requirements.md
3. docs/product/11-roadmap.md
4. docs/product/13-domain-glossary.md
5. docs/product/15-acceptance-criteria.md

## Architecture Layer
6. docs/architecture/02-system-architecture.md
7. docs/architecture/03-database-design.md
8. docs/architecture/06-saas-multi-tenant.md
9. docs/architecture/09-security-and-compliance.md
10. docs/architecture/10-devops-and-deployment.md
11. docs/architecture/16-schema-modules.md
12. docs/architecture/17-domain-model.md

## Backend Layer
13. docs/backend/04-whatsapp-engine.md
14. docs/backend/05-reservation-engine.md
15. docs/backend/07-api-specification.md
16. docs/backend/12-ai-fallback-strategy.md
17. docs/backend/14-coding-standards.md

## API Contract
18. docs/api/openapi.yml

## System Modeling
19. docs/uml/system/*
20. docs/uml/sequences/*

## Database Source of Truth
21. apps/api/prisma/schema.prisma

---

# 4. Non-Negotiable Architecture Rules

## Architecture Pattern
- Clean Architecture (mandatory)
- Domain Driven Design (DDD)
- SOLID principles
- Dependency Inversion

## Layer Enforcement

### Domain Layer
- Pure business logic
- No framework dependencies

### Application Layer
- Use cases only
- Orchestration logic only

### Infrastructure Layer
- Prisma
- External services
- Messaging (WhatsApp, Stripe, Email)

### Presentation Layer
- Controllers ONLY
- No business logic allowed

---

# 5. Multi-Tenant Isolation (CRITICAL)

This is a strict SaaS multi-tenant system.

## Rule:
EVERY business entity MUST be scoped by `restaurantId`.

## Absolute prohibitions:
- No cross-tenant queries
- No cross-tenant updates
- No cross-tenant deletes
- No global unscoped repository access

## Enforcement rule:
If a query does not include `restaurantId` filtering → it is INVALID.

Applies to:
- Reservations
- Customers
- Availability
- Waitlist
- WhatsApp
- Reminders
- Audit logs

Tenant isolation is a **security boundary**, not a convention.

---

# 6. Backend Execution Rules

- NestJS modules required
- Dependency Injection mandatory
- Repository pattern enforced
- DTO validation required (class-validator)
- class-transformer required

## Forbidden:
- Business logic in controllers
- Raw SQL (unless explicitly justified)
- Global state
- Unscoped repositories

## Required:
- Prisma transactions for consistency
- Typed responses
- Explicit error handling

---

# 7. Prisma Rules (SOURCE OF TRUTH)

Prisma is the ONLY schema authority.

## Rules:
- No manual SQL schema
- All migrations via Prisma
- UUID primary keys preferred
- Every tenant table must include `restaurantId`
- Indexed tenant queries required

## Required fields:
- createdAt
- updatedAt

## Preferred:
- Soft deletes for business entities

---

# 8. API Rules (STRICT CONTRACT)

- REST only
- Versioned endpoints (`/api/v1`)
- Fully typed request/response
- OpenAPI compliance required

Reference:
- docs/backend/07-api-specification.md
- docs/api/openapi.yml

## Requirements:
- Input validation mandatory
- Proper HTTP status codes
- No untyped responses

---

# 9. WhatsApp Engine Rules (CORE SYSTEM)

WhatsApp is the PRIMARY input channel.

Flow:
WhatsApp → Webhook → Reservation Engine → Deterministic Rules → DB

## Requirements:
- Must handle full reservation lifecycle
- Must not depend on AI
- Must operate via deterministic state machine

Processes:
- Create reservation
- Confirm reservation
- Modify reservation
- Cancel reservation
- Waitlist handling
- Reminders

---

# 10. Queue & Async Rules

Use BullMQ for:
- Reminders
- WhatsApp messages
- Waitlist processing
- Background workflows

## Rule:
No long-running process in HTTP request lifecycle.

---

# 11. Observability Rules

Every critical action must be observable.

Required:
- Structured logging
- Error tracking
- Health checks
- Metrics readiness

## Rule:
Silent failures are forbidden.

---

# 12. Security Rules

- Passwords must be hashed
- Inputs validated
- Outputs sanitized
- Secrets via environment variables only

## Forbidden:
- Hardcoded credentials
- API keys in code
- Global privilege escalation

Reference:
docs/architecture/09-security-and-compliance.md

---

# 13. Frontend Rules (Angular)

- Mobile-first design
- Strong typing required
- Standalone components preferred

## Forbidden:
- Business logic inside components

## Allowed:
- Services
- State management
- Reusable UI components

---

# 14. Testing Rules (MANDATORY)

Every feature MUST include:
- Unit tests
- Integration tests

Critical flows MUST include:
- End-to-end tests

Reservation lifecycle is a critical flow.

---

# 15. Code Quality Rules

Follow:
docs/backend/14-coding-standards.md

## Required:
- Production-ready code only
- Strong typing
- Small functions
- High cohesion
- Low coupling
- No TODOs in final output

## Forbidden:
- Pseudocode
- Incomplete implementations

---

# 16. System Priority Order

When ambiguity exists, follow:

1. Tenant isolation
2. Data correctness
3. Determinism (no AI dependency)
4. Security
5. Performance
6. Simplicity

---

# 17. Output Contract (ABSOLUTE)

All generated code must be:

- Production-ready
- Multi-tenant safe
- Fully typed
- Testable
- Maintainable
- Secure
- Scalable

If any requirement conflicts → STOP and resolve architecture first.

---

# FINAL RULE

This system prioritizes **correctness over speed**, **determinism over intelligence**, and **isolation over convenience**.