# Domain Glossary

## Purpose

This document defines the ubiquitous language used throughout the system.

All developers, AI agents, product managers and stakeholders must use the same terminology.

---

# Restaurant

A business entity that uses the platform to manage reservations.

A restaurant owns:

* Tables
* Reservations
* Users
* Settings
* WhatsApp Number
* Availability Rules

Each restaurant is a tenant.

---

# Tenant

An isolated customer environment.

In this platform:

Tenant = Restaurant

No tenant can access data belonging to another tenant.

Every business record must contain:

restaurant_id

---

# Customer

A person making a reservation.

Customer information:

* Name
* Phone Number
* Reservation History

A customer may have multiple reservations.

---

# Reservation

A booking made by a customer for a specific date and time.

Required:

* Date
* Time
* Guest Count
* Customer

Optional:

* Notes
* Allergies
* Seating Preferences

---

# Reservation Status

PENDING

Reservation received but not processed.

CONFIRMED

Reservation accepted.

REJECTED

Reservation rejected.

CANCELLED

Reservation cancelled.

COMPLETED

Customer attended.

NO_SHOW

Customer did not attend.

---

# Availability

The ability of the restaurant to accept reservations.

Availability is determined by:

* Opening Hours
* Capacity
* Existing Reservations
* Table Allocation Rules
* Blocked Dates

---

# Table

Physical seating resource.

Properties:

* Capacity
* Zone
* Availability

Examples:

Table 1
Table 2
Terrace Table 5

---

# Waitlist

List of customers waiting for availability.

Waitlist entries may be automatically promoted when space becomes available.

---

# Conversation

A WhatsApp interaction between customer and restaurant.

Conversation State determines current booking progress.

---

# Conversation State

Current step in reservation workflow.

Examples:

WAITING_NAME

WAITING_DATE

WAITING_TIME

WAITING_GUESTS

WAITING_CONFIRMATION

COMPLETED

---

# WhatsApp Session

Incoming and outgoing message exchange handled by the platform.

---

# Business Rules Engine

Deterministic system responsible for:

* Intent detection
* Data extraction
* Reservation validation
* Availability checks
* Response generation

No AI involvement during MVP.

---

# AI Fallback

Secondary processing layer.

Only invoked when deterministic rules fail.

Must never replace the rule engine.

---

# Dashboard

Restaurant management interface.

Capabilities:

* View reservations
* Manage reservations
* View occupancy
* Manage settings
* Manage users

---

# Occupancy

Percentage of available capacity currently reserved.

Formula:

Occupied Capacity / Total Capacity

---

# Audit Log

Immutable history of actions performed in the system.

Every important action must be auditable.

---

# Multi-Tenant

Architecture where multiple restaurants share infrastructure while maintaining complete data isolation.

---

# Source

Origin of reservation.

Examples:

WHATSAPP
WEB
PHONE
MANUAL

Current MVP uses:

WHATSAPP
