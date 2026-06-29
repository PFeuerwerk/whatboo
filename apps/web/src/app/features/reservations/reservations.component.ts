import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { RestaurantConfigService } from '../../core/services/restaurant-config.service';
import { ReservationDashboardService } from '../../core/services/reservation-dashboard.service';
import { ReservationHttpService } from '../../core/services/reservation-http.service';
import { Reservation, ReservationStatus, RestaurantTable } from '../../core/models/restaurant.interfaces';
import { CalendarComponent } from './components/calendar/calendar.component';
import { GridComponent } from './components/grid/grid.component';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, TranslateModule, CalendarComponent, GridComponent],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.css']
})
export class ReservationsComponent implements OnInit, OnDestroy {
  private readonly configService = inject(RestaurantConfigService);
  private readonly socketService = inject(ReservationDashboardService);
  private readonly reservationHttpService = inject(ReservationHttpService);
  private readonly destroy$ = new Subject<void>();

  public readonly selectedDate = signal<Date>(new Date());
  public readonly reservations = signal<Reservation[]>([]);
  public readonly tables = signal<RestaurantTable[]>([]);
  public readonly activeFilter = signal<'ALL' | ReservationStatus>('ALL');
  public readonly isLoading = signal<boolean>(false);

  public readonly filteredReservations = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'ALL') return this.reservations();
    return this.reservations().filter(reservation => reservation.status === filter);
  });

  public readonly totalGuests = computed(() =>
    this.reservations().reduce((acc, reservation) => acc + Number(reservation.guestCount || 0), 0)
  );

  public readonly waitListCount = computed(() =>
    this.reservations().filter(reservation => reservation.status === ReservationStatus.PENDING).length
  );

  public readonly ReservationStatus = ReservationStatus;

  public ngOnInit(): void {
    this.loadAgendaDiaria();

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
    this.socketService.disconnect();
  }

  public loadAgendaDiaria(): void {
    this.isLoading.set(true);
    const date = formatDate(this.selectedDate(), 'yyyy-MM-dd', 'en-US');

    forkJoin({
      settings: this.configService.getSettings(),
      tables: this.configService.getTables(),
      reservations: this.reservationHttpService.getReservationsByDate(date)
    }).subscribe({
      next: ({ settings, tables, reservations }) => {
        this.tables.set(tables ?? []);
        this.reservations.set(reservations ?? []);
        this.socketService.connect(settings.id);
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Error al cargar agenda diaria:', error);
        this.isLoading.set(false);
      }
    });
  }

  public setFilter(status: 'ALL' | ReservationStatus): void {
    this.activeFilter.set(status);
  }

  public updateStatus(id: string, nextStatus: ReservationStatus): void {
    if (nextStatus === ReservationStatus.CANCELLED) {
      this.reservationHttpService.cancelReservation(id, 'Cancelada desde dashboard').subscribe({
        next: updated => this.upsertReservation(updated),
        error: err => console.error('Error al cancelar reserva:', err)
      });
      return;
    }

    this.reservationHttpService.updateReservationStatus(id, nextStatus).subscribe({
      next: updated => this.upsertReservation(updated),
      error: err => console.error('Error al actualizar estado:', err)
    });
  }

  public onGridUpdated(updated: Reservation): void {
    this.upsertReservation(updated);
  }

  public displayCustomerName(reservation: Reservation): string {
    const first = reservation.customer?.firstName ?? '';
    const last = reservation.customer?.lastName ?? '';
    const fullName = `${first} ${last}`.trim();
    return fullName || reservation.customer?.phone || reservation.confirmationCode || 'Cliente';
  }

  public displayTime(reservation: Reservation): string {
    return formatDate(reservation.reservationStart, 'HH:mm', 'en-US');
  }

  public onPrintAgenda(): void {
    window.print();
  }

  private upsertReservation(reservation: Reservation): void {
    this.reservations.update(current => {
      const index = current.findIndex(item => item.id === reservation.id);
      if (index === -1) return [reservation, ...current];
      const copy = [...current];
      copy[index] = reservation;
      return copy;
    });
  }
}
