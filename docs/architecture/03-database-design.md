# Database Design

## Purpose

This document defines the database architecture for the Restaurant Booking SaaS platform.

The database must support:

- Multi-tenant SaaS architecture
- Hundreds of restaurants from day one
- Thousands of restaurants in the future
- High reservation volume
- Full auditability
- WhatsApp-first workflows
- Future AI integrations
- Subscription billing

PostgreSQL is the primary relational database.

Prisma ORM is the single source of truth for schema management.

---

# Database Principles

## Principle 1 - Multi-Tenant First

The platform is a strict multi-tenant SaaS.

Every business entity belongs to exactly one restaurant.

Tenant isolation is mandatory.

All business queries must be scoped by:

```text
restaurantId
```

Cross-tenant access is prohibited.

---

## Principle 2 - UUID Identifiers

All primary keys use UUIDs.

Example:

```text
id UUID
```

Benefits:

- Globally unique
- Safe for distributed systems
- Future microservice compatibility

---

## Principle 3 - Auditability

Business actions must be traceable.

Critical operations must generate audit logs.

Examples:

- Reservation created
- Reservation modified
- Reservation cancelled
- Waitlist promotion
- User login
- Billing changes

---

## Principle 4 - Soft Deletes

Business entities should use soft deletes whenever historical information may be required.

Example:

```text
deletedAt TIMESTAMP NULL
```

Applies to:

- Customers
- Reservations
- Users
- Tables

---

## Principle 5 - UTC Storage

All timestamps are stored in UTC.

Restaurant timezone is stored separately.

Example:

```text
Europe/Madrid
America/New_York
```

Display conversion occurs in application layer.

---

# Database Engine

## Primary Database

PostgreSQL

Minimum Version:

```text
PostgreSQL 16+
```

---

# Prisma Strategy

Prisma is the only schema management tool.

Schema changes must occur through:

```text
Prisma Schema
Prisma Migrations
```

Manual SQL schema changes are prohibited.

---

# Schema Modularization

Prisma schema is divided into modules.

Location:

```text
apps/api/prisma/schema
```

Modules:

```text
00-generator.prisma
01-datasource.prisma

auth.prisma
restaurants.prisma
customers.prisma
reservations.prisma
availability.prisma
reminders.prisma
whatsapp.prisma
subscriptions.prisma
feature-flags.prisma
audit.prisma
```

Generated schema:

```text
apps/api/prisma/schema.prisma
```

---

# Core Entities

## Restaurant

Represents a SaaS tenant.

Fields:

- id
- name
- slug
- phone
- email
- timezone
- address
- status
- createdAt
- updatedAt

Relationships:

- Users
- Customers
- Reservations
- Tables
- Opening Hours
- Waitlist
- WhatsApp Configuration
- Subscription

---

## User

Restaurant staff member.

Fields:

- id
- restaurantId
- email
- passwordHash
- role
- active
- lastLoginAt
- createdAt
- updatedAt

Roles:

- OWNER
- MANAGER
- STAFF

---

## Customer

Restaurant customer.

Fields:

- id
- restaurantId
- fullName
- phone
- email
- notes
- totalReservations
- noShowCount
- createdAt
- updatedAt

---

## Reservation

Central business entity.

Fields:

- id
- restaurantId
- customerId
- reservationDate
- reservationTime
- guestCount
- status
- source
- notes
- confirmationCode
- createdAt
- updatedAt

Status:

```text
PENDING
CONFIRMED
WAITLISTED
CANCELLED
COMPLETED
NO_SHOW
```

Source:

```text
WHATSAPP
WEB
PHONE
MANUAL
```

---

## Restaurant Table

Physical table definition.

Fields:

- id
- restaurantId
- name
- capacity
- active

---

## Opening Hours

Restaurant schedule.

Fields:

- id
- restaurantId
- dayOfWeek
- openTime
- closeTime

---

## Blocked Date

Date where reservations are not allowed.

Fields:

- id
- restaurantId
- date
- reason

Examples:

- Holiday
- Private Event
- Maintenance

---

## Waitlist Entry

Stores waitlisted customers.

Fields:

- id
- restaurantId
- customerId
- requestedDate
- requestedTime
- guestCount
- status
- priority
- createdAt

---

## Reminder

Scheduled notifications.

Fields:

- id
- restaurantId
- reservationId
- scheduledAt
- sentAt
- status

---

## WhatsApp Message

Stores WhatsApp communication.

Fields:

- id
- restaurantId
- customerId
- direction
- messageType
- content
- whatsappMessageId
- status
- createdAt

Direction:

```text
INBOUND
OUTBOUND
```

---

## Conversation State

Tracks automated conversations.

Fields:

- id
- restaurantId
- customerPhone
- state
- metadata
- updatedAt

Examples:

```text
AWAITING_NAME
AWAITING_DATE
AWAITING_TIME
AWAITING_GUEST_COUNT
```

---

## Subscription

Restaurant billing information.

Fields:

- id
- restaurantId
- plan
- status
- billingCycle
- currentPeriodStart
- currentPeriodEnd

Plan:

```text
STARTER
PRO
ENTERPRISE
```

Status:

```text
ACTIVE
PAST_DUE
CANCELLED
TRIAL
```

---

## Feature Flag

Tenant-specific features.

Fields:

- id
- restaurantId
- feature
- enabled

Examples:

- AI_FALLBACK
- ADVANCED_REPORTS
- PREMIUM_REMINDERS

---

## Audit Log

Stores critical system actions.

Fields:

- id
- restaurantId
- userId
- entityType
- entityId
- action
- oldValues
- newValues
- createdAt

---

# Indexing Strategy

Every business table must include:

```text
restaurantId
```

and be indexed.

Examples:

```sql
INDEX (restaurantId)
INDEX (restaurantId, reservationDate)
INDEX (restaurantId, status)
INDEX (restaurantId, createdAt)
```

Critical indexes:

Reservations:

```sql
(restaurantId, reservationDate)
(restaurantId, status)
(customerId)
```

Customers:

```sql
(restaurantId, phone)
```

WhatsApp Messages:

```sql
(restaurantId, createdAt)
(whatsappMessageId)
```

---

# Data Retention

Audit logs:

Minimum:

```text
24 months
```

WhatsApp messages:

Minimum:

```text
12 months
```

Reservations:

Never automatically deleted.

---

# Scalability Strategy

Phase 1

Up to:

```text
100 restaurants
```

Single PostgreSQL instance.

---

Phase 2

Up to:

```text
1,000 restaurants
```

Read replicas.

Redis cache.

BullMQ workers.

---

Phase 3

Up to:

```text
10,000+ restaurants
```

Partitioning.

Advanced caching.

Dedicated analytics infrastructure.

---

# Database Security

Requirements:

- Encrypted backups
- SSL connections
- Principle of least privilege
- Separate database users per environment

Never expose database credentials in source code.

Secrets must be stored in environment variables.

---

# Future Extensions

The schema must allow future support for:

- AI reservation parsing
- Multi-location restaurant groups
- CRM functionality
- Loyalty programs
- Online payments
- POS integrations
- Reporting and analytics
- Multi-language support

No breaking schema redesign should be required for these features.