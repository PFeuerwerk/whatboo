import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { RestaurantConfigService } from '../../core/services/restaurant-config.service';
import { ReservationDashboardService } from '../../core/services/reservation-dashboard.service';
import { ReservationHttpService } from '../../core/services/reservation-http.service';
import { Reservation, ReservationStatus, RestaurantTable } from '../../core/models/restaurant.interfaces';
import { CalendarComponent } from './components/calendar/calendar.component';
import { GridComponent } from './components/grid/grid.component';

type ReservationActionType = 'cancel' | 'no-show';

interface ReservationReasonOption {
  code: string;
  label: string;
}

interface ReservationActionDialog {
  reservationId: string;
  type: ReservationActionType;
  title: string;
  primaryLabel: string;
  reasonLabel: string;
  detailsLabel: string;
  options: ReservationReasonOption[];
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, CalendarComponent, GridComponent],
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
  public readonly errorMessage = signal<string | null>(null);
  public readonly actionDialog = signal<ReservationActionDialog | null>(null);
  public readonly actionReasonCode = signal<string>('');
  public readonly actionReasonDetails = signal<string>('');
  public readonly actionIsSubmitting = signal<boolean>(false);

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

  public readonly canSubmitAction = computed(() =>
    Boolean(this.actionDialog())
    && this.actionReasonCode().trim().length > 0
    && this.actionReasonDetails().trim().length >= 3
    && !this.actionIsSubmitting()
  );

  public readonly ReservationStatus = ReservationStatus;

  private readonly cancellationReasons: ReservationReasonOption[] = [
    { code: 'CUSTOMER_REQUEST', label: 'Solicitud del cliente' },
    { code: 'RESTAURANT_CLOSED', label: 'Restaurante cerrado' },
    { code: 'DUPLICATE_BOOKING', label: 'Reserva duplicada' },
    { code: 'PAYMENT_OR_DEPOSIT_ISSUE', label: 'Incidencia con pago o depósito' },
    { code: 'OPERATIONAL_CAPACITY', label: 'Capacidad operativa' },
    { code: 'OTHER', label: 'Otro motivo' }
  ];

  private readonly noShowReasons: ReservationReasonOption[] = [
    { code: 'CUSTOMER_DID_NOT_ARRIVE', label: 'El cliente no llegó' },
    { code: 'CUSTOMER_UNREACHABLE', label: 'Cliente no localizable' },
    { code: 'ARRIVED_TOO_LATE', label: 'Llegó fuera de margen' },
    { code: 'DUPLICATE_BOOKING', label: 'Reserva duplicada' },
    { code: 'OTHER', label: 'Otro motivo' }
  ];

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
    this.errorMessage.set(null);
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
      error: () => {
        this.errorMessage.set('No se pudo cargar la agenda de reservas.');
        this.isLoading.set(false);
      }
    });
  }

  public setFilter(status: 'ALL' | ReservationStatus): void {
    this.activeFilter.set(status);
  }

  public updateStatus(id: string, nextStatus: ReservationStatus): void {
    if (nextStatus === ReservationStatus.CANCELLED) {
      this.openActionDialog(id, 'cancel');
      return;
    }

    if (nextStatus === ReservationStatus.NO_SHOW) {
      this.openActionDialog(id, 'no-show');
      return;
    }

    this.reservationHttpService.updateReservationStatus(id, nextStatus).subscribe({
      next: updated => this.upsertReservation(updated),
      error: () => {
        this.errorMessage.set('No se pudo actualizar el estado de la reserva.');
      }
    });
  }

  public openActionDialog(reservationId: string, type: ReservationActionType): void {
    const isCancel = type === 'cancel';
    const options = isCancel ? this.cancellationReasons : this.noShowReasons;

    this.actionDialog.set({
      reservationId,
      type,
      title: isCancel ? 'Cancelar reserva' : 'Marcar no-show',
      primaryLabel: isCancel ? 'Cancelar reserva' : 'Marcar no-show',
      reasonLabel: isCancel ? 'Motivo de cancelación' : 'Motivo de no-show',
      detailsLabel: 'Detalle operativo',
      options
    });
    this.actionReasonCode.set(options[0]?.code ?? '');
    this.actionReasonDetails.set('');
    this.errorMessage.set(null);
  }

  public closeActionDialog(): void {
    if (this.actionIsSubmitting()) return;
    this.actionDialog.set(null);
    this.actionReasonCode.set('');
    this.actionReasonDetails.set('');
  }

  public submitActionDialog(): void {
    const dialog = this.actionDialog();
    if (!dialog || !this.canSubmitAction()) return;

    const reasonCode = this.actionReasonCode().trim();
    const details = this.actionReasonDetails().trim();
    const request$ = dialog.type === 'cancel'
      ? this.reservationHttpService.cancelReservation(dialog.reservationId, reasonCode, details)
      : this.reservationHttpService.markNoShow(dialog.reservationId, reasonCode, details);

    this.actionIsSubmitting.set(true);
    request$.subscribe({
      next: updated => {
        this.upsertReservation(updated);
        this.actionIsSubmitting.set(false);
        this.closeActionDialog();
      },
      error: () => {
        this.actionIsSubmitting.set(false);
        this.errorMessage.set(dialog.type === 'cancel'
          ? 'No se pudo cancelar la reserva.'
          : 'No se pudo marcar la reserva como no-show.');
      }
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
