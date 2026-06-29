import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ReservationHttpService } from '../../../../core/services/reservation-http.service';
import { Reservation, RestaurantTable } from '../../../../core/models/restaurant.interfaces';

@Component({
  selector: 'app-reservations-grid',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.css']
})
export class GridComponent {
  private readonly reservationHttpService = inject(ReservationHttpService);

  public readonly tables = input<RestaurantTable[]>([]);
  public readonly reservations = input<Reservation[]>([]);
  public readonly onGridUpdated = output<Reservation>();

  public readonly timelineHours = [
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
  ];

  public readonly tablePage = signal<number>(0);
  private readonly pageSize = 5;

  public readonly paginatedTables = computed(() => {
    const start = this.tablePage() * this.pageSize;
    return this.tables().slice(start, start + this.pageSize);
  });

  public readonly totalPages = computed(() => Math.ceil(this.tables().length / this.pageSize) || 1);

  public nextTables(): void {
    if (this.tablePage() < this.totalPages() - 1) this.tablePage.update(page => page + 1);
  }

  public prevTables(): void {
    if (this.tablePage() > 0) this.tablePage.update(page => page - 1);
  }

  public getReservationsForSlot(tableId: string, hour: string): Reservation[] {
    return this.reservations().filter(reservation => {
      return this.getAssignedTableId(reservation) === tableId && this.toSlot(reservation.reservationStart) === hour;
    });
  }

  public onDrop(event: CdkDragDrop<string>, tableId: string, hour: string): void {
    const reservation = event.item.data as Reservation;
    if (!reservation?.id) return;

    const reservationStart = this.withSlot(reservation.reservationStart, hour);

    this.reservationHttpService.updateReservation(reservation.id, {
      reservationStart,
      tableId
    }).subscribe({
      next: updated => this.onGridUpdated.emit(updated),
      error: err => console.error('Error al reasignar mesa/reserva:', err)
    });
  }

  public displayCustomerName(reservation: Reservation): string {
    const first = reservation.customer?.firstName ?? '';
    const last = reservation.customer?.lastName ?? '';
    const fullName = `${first} ${last}`.trim();
    return fullName || reservation.customer?.phone || reservation.confirmationCode || 'Cliente';
  }

  public getAssignedTableId(reservation: Reservation): string | null {
    return reservation.assignedTables?.[0]?.tableId ?? null;
  }

  private toSlot(date: string | Date): string {
    const parsed = new Date(date);
    return `${parsed.getHours().toString().padStart(2, '0')}:${parsed.getMinutes().toString().padStart(2, '0')}`;
  }

  private withSlot(date: string | Date, slot: string): string {
    const parsed = new Date(date);
    const [hours, minutes] = slot.split(':').map(Number);
    parsed.setHours(hours, minutes, 0, 0);
    return parsed.toISOString();
  }
}
