export interface RestaurantSettings {
  id?: string;
  maxCapacity: number;
  defaultReservationDuration: number;
  slotIntervalMinutes: number;
  bufferTimeMinutes: number;
  autoConfirm: boolean;
  allowWaitlist: boolean;
}

export interface Zone {
  id: string;
  name: string;
  priority: number;
  active: boolean;
}

export interface Table {
  id?: string;
  name: string;
  capacity: number;
  zoneId: string;
  active: boolean;
}

export interface Reservation {
  id: string;
  customerName: string;
  pax: number;
  timeSlot: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  tableId?: string;
}
