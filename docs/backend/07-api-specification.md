# 07-api-specification.md

# API Specification

## Purpose

This document defines the REST API contract for the Restaurant Booking SaaS Platform.

The API serves:

* Restaurant Dashboard
* Internal Workers
* Future Mobile Applications
* Internal Administration Tools

All APIs must be:

* RESTful
* Versioned
* Multi-tenant safe
* OpenAPI compatible
* Fully documented
* Production ready

Base URL:

```text
/api/v1
```

---

# API Standards

## Content Type

Request:

```http
Content-Type: application/json
```

Response:

```http
Content-Type: application/json
```

---

## Authentication

Authentication uses JWT.

```http
Authorization: Bearer <access_token>
```

---

## Tenant Isolation

Restaurant scope is derived from the authenticated user.

Clients must NEVER send:

```text
restaurantId
```

in requests.

Tenant context is resolved server-side.

---

## Correlation ID

Every request must include:

```http
X-Correlation-Id
```

If not provided, backend generates one.

Used for:

* Logging
* Tracing
* Debugging
* Auditability

---

## API Versioning

Current version:

```text
v1
```

Example:

```http
/api/v1/reservations
```

---

# Response Standards

## Success Response

```json
{
  "success": true,
  "data": {}
}
```

---

## Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Guest count is required"
  }
}
```

---

# Authentication Module

## POST /auth/login

Authenticate user.

Request

```json
{
  "email": "owner@restaurant.com",
  "password": "password"
}
```

Response

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt",
    "refreshToken": "jwt",
    "expiresIn": 3600,
    "user": {
      "id": "uuid",
      "email": "owner@restaurant.com",
      "role": "OWNER"
    }
  }
}
```

---

## POST /auth/refresh

Refresh access token.

---

## POST /auth/logout

Logout current session.

---

## GET /auth/me

Get authenticated user.

---

# Restaurant Module

## GET /restaurants/current

Current restaurant information.

---

## PATCH /restaurants/current

Update restaurant profile.

Fields:

* name
* phone
* email
* timezone
* address

---

## GET /restaurants/current/settings

Restaurant settings.

---

## PATCH /restaurants/current/settings

Update settings.

Examples:

* reservation duration
* reminder configuration
* waitlist configuration

---

# User Module

## GET /users

Paginated users.

Filters:

* role
* active

---

## GET /users/:id

Get user.

---

## POST /users

Create user.

Roles:

```text
OWNER
MANAGER
STAFF
```

---

## PATCH /users/:id

Update user.

---

## DELETE /users/:id

Deactivate user.

Soft delete only.

---

# Customer Module

## GET /customers

Paginated customers.

Filters:

* phone
* fullName

Sort:

* createdAt
* totalReservations

---

## GET /customers/:id

Customer details.

---

## GET /customers/:id/reservations

Reservation history.

---

## GET /customers/:id/metrics

Customer metrics.

Response

```json
{
  "totalReservations": 12,
  "completedReservations": 10,
  "cancelledReservations": 1,
  "noShows": 1
}
```

---

# Reservation Module

## GET /reservations

Paginated reservations.

Filters:

* status
* date
* dateFrom
* dateTo
* customerId
* guestCount

Sort:

* reservationDate
* createdAt

---

## GET /reservations/:id

Reservation details.

---

## POST /reservations

Create reservation.

---

## PATCH /reservations/:id

Modify reservation.

---

## DELETE /reservations/:id

Cancel reservation.

Status:

```text
CANCELLED
```

---

## POST /reservations/:id/confirm

Confirm reservation.

---

## POST /reservations/:id/reject

Reject reservation.

---

## POST /reservations/:id/complete

Mark completed.

---

## POST /reservations/:id/no-show

Mark no-show.

---

## GET /reservations/:id/timeline

Reservation lifecycle.

Response:

```json
{
  "events": [
    {
      "type": "CREATED",
      "createdAt": "2026-06-01T12:00:00Z"
    }
  ]
}
```

---

# Availability Module

## GET /availability

Check availability.

Query Parameters:

```http
date
time
guestCount
```

Response

```json
{
  "available": true,
  "alternativeSlots": [
    "20:00",
    "20:30",
    "22:00"
  ]
}
```

---

# Table Management Module

## GET /tables

List tables.

---

## GET /tables/:id

Table details.

---

## POST /tables

Create table.

---

## PATCH /tables/:id

Update table.

---

## DELETE /tables/:id

Deactivate table.

---

# Waitlist Module

## GET /waitlist

List waitlist entries.

---

## POST /waitlist

Create waitlist entry.

---

## PATCH /waitlist/:id

Update waitlist entry.

---

## DELETE /waitlist/:id

Remove waitlist entry.

---

## POST /waitlist/:id/promote

Convert waitlist entry into reservation.

---

# Reminder Module

## GET /reminders

List reminders.

---

## POST /reminders/:id/send

Manual send.

---

## PATCH /reminders/:id

Update reminder.

---

# WhatsApp Module

## GET /whatsapp/messages

Paginated message history.

Filters:

* customer
* direction
* date

---

## GET /whatsapp/messages/:id

Message details.

---

## GET /whatsapp/templates

List approved templates.

---

## POST /whatsapp/templates/sync

Synchronize Meta templates.

---

## GET /whatsapp/numbers

Connected numbers.

---

## POST /whatsapp/numbers

Register number.

---

## POST /whatsapp/webhook

Meta inbound webhook.

Internal endpoint.

No authentication.

---

## GET /whatsapp/webhook

Meta verification endpoint.

---

# Dashboard Module

## GET /dashboard/summary

Dashboard KPIs.

Response

```json
{
  "todayReservations": 52,
  "tomorrowReservations": 38,
  "occupancyPercentage": 81,
  "cancelledToday": 2,
  "noShows": 1,
  "waitlistEntries": 4
}
```

---

## GET /dashboard/occupancy

Occupancy analytics.

---

## GET /dashboard/revenue

Future revenue analytics.

---

# Feature Flags Module

## GET /feature-flags

List flags.

---

## PATCH /feature-flags/:id

Update flag.

---

# Subscription Module

## GET /subscriptions/current

Current subscription.

---

## GET /subscriptions/history

Billing history.

---

## GET /subscriptions/invoices

Invoices.

---

# Audit Module

## GET /audit-logs

Paginated logs.

Filters:

* user
* action
* entity
* date

---

# Health Module

## GET /health

Health check.

---

## GET /health/readiness

Readiness probe.

---

## GET /health/liveness

Liveness probe.

---

# Pagination Standard

Request

```http
?page=1&pageSize=20
```

Response

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

Maximum:

```text
pageSize=100
```

---

# Sorting Standard

Request

```http
?sortBy=createdAt&sortOrder=desc
```

Values:

```text
asc
desc
```

---

# Idempotency

Required for:

* Reservation Creation
* Reservation Modification
* Waitlist Promotion

Header:

```http
Idempotency-Key
```

---

# Rate Limiting

Authenticated APIs:

```text
100 requests/minute
```

Webhook APIs:

```text
Configured separately
```

---

# HTTP Status Codes

Success:

```text
200 OK
201 Created
204 No Content
```

Client Errors:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
```

Server Errors:

```text
500 Internal Server Error
503 Service Unavailable
```

---

# RBAC Rules

OWNER

* Full access

MANAGER

* Operational access

STAFF

* Reservation management only

---

# Security Requirements

All protected endpoints require:

```http
Authorization: Bearer <token>
```

Exceptions:

```text
/auth/login
/auth/refresh
/whatsapp/webhook
/health
```

---

# API Design Principles

* RESTful
* Stateless
* OpenAPI-first
* Swagger-generated
* Multi-tenant safe
* Strongly typed
* Backward compatible
* Audit-friendly
* Production ready
