# Business Requirements

## Supported Actions

The system must support:

* Create reservation
* Modify reservation
* Cancel reservation
* Check reservation status
* Request restaurant information
* Receive reminders

## Reservation Information

Required fields:

* Customer name
* Customer phone
* Reservation date
* Reservation time
* Number of guests

Optional fields:

* Notes
* Allergies
* Birthday celebration
* Anniversary celebration
* High chair
* Wheelchair access
* Preferred seating area
* Terrace
* Indoor
* Window seat

## Reservation States

* PENDING
* CONFIRMED
* REJECTED
* CANCELLED
* COMPLETED
* NO_SHOW

## Business Rules

* Reservations must respect restaurant opening hours.
* Reservations cannot exceed restaurant capacity.
* Duplicate reservations must be prevented.
* Restaurants may configure minimum notice time.
* Restaurants may configure maximum party size.
* Large reservations may require manual approval.
* Reservation modifications must preserve availability rules.

## Reminders

Automatic reminders:

* 24 hours before reservation
* 2 hours before reservation

## Waitlist

If availability is not found:

* Offer alternative times
* Offer waitlist registration
