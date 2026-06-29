import { Component, OnDestroy, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { RestaurantConfigService } from '../../../../core/services/restaurant-config.service';
import { ReservationDashboardService } from '../../../../core/services/reservation-dashboard.service';
import { ReservationHttpService } from '../../../../core/services/reservation-http.service';
import { Reservation, ReservationStatus } from '../../../../core/models/restaurant.interfaces';

@Component({
  selector: 'app-reservation-calendar',
  standalone: true,
  imports: [CommonModule, TranslateModule, DragDropModule],
  template: `
    <section class="calendar-card">
      <div class="calendar-header">
        <div>
          <h2>{{ 'CALENDAR.DAILY_OCCUPATION' | translate }}</h2>
          <p>{{ selectedDate() | date:'longDate' }}</p>
        </div>

        <div class="calendar-metrics">
          <span>Total: {{ totalGuests() }} pax</span>
          <span>Confirmadas: {{ confirmedCount() }}</span>
          <span>Pendientes: {{ pendingCount() }}</span>
        </div>
      </div>

      <div class="calendar-grid" cdkDropListGroup>
        @for (slot of timeSlots(); track slot) {
          <div
            class="calendar-row"
            cdkDropList
            [cdkDropListData]="slot"
            (cdkDropListDropped)="onReservationDropped($event)">
            <div class="time-cell">{{ slot }}</div>

            <div class="slot-cell">
              @for (res of getReservationsForSlot(slot); track res.id) {
                <article
                  class="reservation-chip"
                  [class]="getReservationClass(res.status)"
                  cdkDrag
                  [cdkDragData]="res">
                  <strong>{{ displayCustomerName(res) }}</strong>
                  <span>{{ res.guestCount }} pax · {{ res.confirmationCode || 'Sin código' }}</span>
                </article>
              } @empty {
                <span class="empty-slot">Disponible</span>
              }
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .calendar-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; }
    .calendar-header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
    .calendar-header h2 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
    .calendar-header p { margin: .25rem 0 0; font-size: .85rem; color: #64748b; }
    .calendar-metrics { display: flex; gap: .5rem; flex-wrap: wrap; justify-content: flex-end; }
    .calendar-metrics span { font-size: .75rem; font-weight: 700; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: .5rem; padding: .45rem .65rem; color: #334155; }
    .calendar-grid { overflow-x: auto; border: 1px solid #f1f5f9; border-radius: .85rem; }
    .calendar-row { min-width: 620px; display: grid; grid-template-columns: 5.5rem 1fr; border-bottom: 1px solid #f1f5f9; min-height: 4.25rem; }
    .calendar-row:last-child { border-bottom: 0; }
    .time-cell { display: flex; align-items: center; justify-content: center; background: #f8fafc; border-right: 1px solid #f1f5f9; font-weight: 800; color: #2563eb; font-size: .8rem; }
    .slot-cell { display: flex; align-items: center; gap: .5rem; padding: .6rem; flex-wrap: wrap; }
    .reservation-chip { border: 1px solid #dbeafe; border-radius: .75rem; padding: .5rem .65rem; cursor: grab; min-width: 11rem; display: flex; flex-direction: column; gap: .15rem; font-size: .75rem; }
    .reservation-chip strong { color: inherit; }
    .reservation-chip span { opacity: .78; }
    .empty-slot { color: #cbd5e1; font-size: .75rem; font-style: italic; }
    .status-confirmed { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .status-pending { background: #fefce8; border-color: #fde68a; color: #854d0e; }
    .status-cancelled { background: #fef2f2; border-color: #fecaca; color: #991b1b; text-decoration: line-through; }
    .status-completed { background: #f1f5f9; border-color: #cbd5e1; color: #475569; }
    .status-default { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
  `]
})
export class CalendarComponent implements OnInit, OnDestroy {
  private readonly configService = inject(RestaurantConfigService);
  private readonly socketService = inject(ReservationDashboardService);
  private readonly reservationHttpService = inject(ReservationHttpService);
  private readonly destroy$ = new Subject<void>();

  public readonly serverReservations = input<Reservation[]>([]);
  public readonly selectedDate = input<Date>(new Date());
  private readonly localReservations = signal<Reservation[]>([]);

  constructor() {
    effect(() => {
      this.localReservations.set(this.serverReservations());
    });
  }

  public readonly allReservations = computed(() => this.localReservations());

  public readonly totalGuests = computed(() =>
    this.allReservations().reduce((acc, res) => acc + Number(res.guestCount || 0), 0)
  );

  public readonly confirmedCount = computed(() =>
    this.allReservations().filter(res => res.status === ReservationStatus.CONFIRMED).length
  );

  public readonly pendingCount = computed(() =>
    this.allReservations().filter(res => res.status === ReservationStatus.PENDING).length
  );

  public readonly timeSlots = computed(() => {
    const settings = this.configService.currentRestaurant();
    const interval = settings?.slotIntervalMinutes || 30;
    const slots: string[] = [];
    let currentMinutes = 12 * 60;
    const endMinutes = 23 * 60 + 30;

    while (currentMinutes <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
      const mins = (currentMinutes % 60).toString().padStart(2, '0');
      slots.push(`${hours}:${mins}`);
      currentMinutes += interval;
    }

    return slots;
  });

  public ngOnInit(): void {
    this.socketService.reservationCreated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(reservation => this.upsertReservation(reservation));

    this.socketService.reservationUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(reservation => this.upsertReservation(reservation));
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public getReservationsForSlot(slot: string): Reservation[] {
    return this.allReservations().filter(res => this.toSlot(res.reservationStart) === slot);
  }

  public onReservationDropped(event: CdkDragDrop<string>): void {
    const reservation = event.item.data as Reservation;
    const targetSlot = event.container.data;
    const previousStart = reservation.reservationStart;
    const nextStart = this.withSlot(previousStart, targetSlot);

    this.upsertReservation({ ...reservation, reservationStart: nextStart });

    this.reservationHttpService.updateReservation(reservation.id, { reservationStart: nextStart }).subscribe({
      next: updated => this.upsertReservation(updated),
      error: () => this.upsertReservation({ ...reservation, reservationStart: previousStart })
    });
  }

  public displayCustomerName(reservation: Reservation): string {
    const first = reservation.customer?.firstName ?? '';
    const last = reservation.customer?.lastName ?? '';
    const fullName = `${first} ${last}`.trim();
    return fullName || reservation.customer?.phone || reservation.notes || 'Cliente';
  }

  public getReservationClass(status: ReservationStatus): string {
    switch (status) {
      case ReservationStatus.CONFIRMED: return 'status-confirmed';
      case ReservationStatus.PENDING: return 'status-pending';
      case ReservationStatus.CANCELLED: return 'status-cancelled';
      case ReservationStatus.COMPLETED: return 'status-completed';
      default: return 'status-default';
    }
  }

  private upsertReservation(reservation: Reservation): void {
    this.localReservations.update(current => {
      const index = current.findIndex(item => item.id === reservation.id);
      if (index === -1) return [reservation, ...current];
      const copy = [...current];
      copy[index] = reservation;
      return copy;
    });
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
