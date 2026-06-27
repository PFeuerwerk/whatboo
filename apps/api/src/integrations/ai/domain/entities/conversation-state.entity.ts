export type ConversationStatus =
  | 'new'
  | 'collecting_data'
  | 'waiting_date'
  | 'waiting_time'
  | 'waiting_guests'
  | 'ready_to_book'
  | 'booking_created'
  | 'cancelled';

export interface ConversationState {
  phoneNumber: string;
  restaurantId: string;
  currentIntent:
    | 'reservation'
    | 'modify'
    | 'cancel'
    | 'availability'
| 'check_reservation'
    | 'unknown';

  guests: number | null;
  date: string | null;
  time: string | null;

  lastMessage: string | null;
  missingFields: string[];

  status: ConversationStatus;

  pendingAction:
    | 'none'
    | 'availability_alternative'
    | 'confirm_cancel'
    | 'modify_reservation';

  alternativeSlots: string[];

  pendingCancellationCode: string | null;

  pendingModificationCode: string | null;


  confirmationCode: string | null;


  createdAt: Date;
  updatedAt: Date;
}