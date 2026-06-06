# Coding Standards

## Purpose

Ensure consistent, scalable and maintainable code generation across all AI agents and developers.

---

# General Principles

Follow:

* Clean Architecture
* SOLID Principles
* DRY
* KISS
* Separation of Concerns
* Domain Driven Design (DDD)

Avoid:

* God Classes
* Business Logic in Controllers
* Hardcoded Values
* Circular Dependencies

---

# Backend Standards

Technology:

* NestJS
* TypeScript
* Prisma ORM

---

# Project Structure

src/

modules/

common/

config/

infrastructure/

domain/

application/

presentation/

---

# Layer Responsibilities

Presentation Layer

Controllers only.

No business logic.

---

Application Layer

Use Cases.

Business orchestration.

---

Domain Layer

Entities.

Business rules.

Domain services.

---

Infrastructure Layer

Database.

External APIs.

Redis.

WhatsApp.

---

# Naming Conventions

Classes:

PascalCase

Example:

ReservationService

---

Variables:

camelCase

Example:

reservationDate

---

Constants:

UPPER_SNAKE_CASE

Example:

MAX_GUESTS

---

Files:

kebab-case

Example:

reservation.service.ts

---

# DTO Rules

Every endpoint must use DTOs.

Validation required.

Use:

class-validator

class-transformer

---

# Validation Rules

Never trust client input.

Validate:

* Date
* Time
* Phone
* Guest Count
* Restaurant ID

At API boundary.

---

# Error Handling

Use typed exceptions.

Never return raw errors.

Use:

BadRequestException

NotFoundException

ConflictException

ForbiddenException

InternalServerErrorException

---

# Logging

Structured JSON logs only.

Required fields:

timestamp

requestId

restaurantId

module

action

duration

status

---

# Database Standards

Use migrations.

Never modify production schema manually.

All schema changes must be versioned.

---

# Prisma Rules

Use transactions for:

* Reservation Creation
* Reservation Modification
* Reservation Cancellation

Avoid N+1 queries.

Use indexes.

---

# API Standards

RESTful conventions.

Examples:

GET /reservations

POST /reservations

PATCH /reservations/:id

DELETE /reservations/:id

---

# Frontend Standards

Technology:

Angular

Angular Material

Signals

RxJS

---

# Component Rules

Maximum responsibility:

One feature per component.

Avoid giant components.

---

# State Management

Signals preferred.

RxJS only when reactive streams are required.

Avoid unnecessary global state.

---

# Accessibility

Must comply with WCAG AA.

Required:

* Keyboard navigation
* Screen reader support
* Color contrast validation

---

# Security Standards

Passwords:

Argon2

Never SHA256.

Never MD5.

---

Authentication:

JWT Access Token

JWT Refresh Token

---

Secrets:

Never stored in source code.

Use environment variables.

---

# Testing Standards

Minimum Coverage:

80%

Required:

Unit Tests

Integration Tests

E2E Tests

---

# Performance Standards

API Response:

< 300ms average

Dashboard Load:

< 2 seconds

Reservation Creation:

< 500ms

---

# Documentation Standards

Every public module must contain:

README.md

Architecture notes

Examples

Sequence diagrams when necessary
