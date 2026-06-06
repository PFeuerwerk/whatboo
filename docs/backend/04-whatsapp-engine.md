# WhatsApp Automation Engine

## Purpose

Automatically process incoming WhatsApp messages.

## Supported Intents

### Create Reservation

Keywords:

* reserve
* reservation
* book
* booking
* table

### Modify Reservation

Keywords:

* modify
* change
* reschedule

### Cancel Reservation

Keywords:

* cancel
* cancellation

### Check Reservation

Keywords:

* reservation status
* my reservation

## Conversation States

* WAITING_NAME
* WAITING_DATE
* WAITING_TIME
* WAITING_GUESTS
* WAITING_CONFIRMATION
* COMPLETED

## Extraction Rules

Extract:

* customer name
* date
* time
* guests

Examples:

Message:
"I want a table for 4 tomorrow at 21:00"

Result:
guests=4
date=tomorrow
time=21:00

Message:
"Reservation for John Smith on Saturday at 20:30 for 2"

Result:
name=John Smith
date=Saturday
time=20:30
guests=2

## Response Templates

Use predefined templates only.

Responses must be deterministic.

No AI generation during MVP.
