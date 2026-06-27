import { Component, OnInit, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RestaurantConfigService } from '../../../../core/services/restaurant-config.service';
import { ReservationDashboardService } from '../../../../core/services/reservation-dashboard.service';
import { ReservationHttpService } from '../../../../core/services/reservation-http.service';
import { Reservation, ReservationStatus } from '../../../../core/models/restaurant.interfaces';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-reservation-calendar',
  standalone: true,
  imports: [CommonModule, TranslateModule, DragDropModule],
  template: `
    <div class="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <!-- Encabezado del Calendario Operativo -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900">{{ 'CALENDAR.DAILY_OCCUPATION' | translate }}</h2>
          <p class="text-sm text-gray-500">{{ selectedDate() | date:'longDate' }}</p>
        </div>
        
        <!-- Indicadores Rápidos de Capacidad Computados -->
        <div class="flex gap-3 text-xs font-semibold">
          <div class="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
            {{ 'CALENDAR.TOTAL_GUESTS' | translate }}: {{ totalGuests() }}
          </div>
          <div class="px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-100">
            {{ 'CALENDAR.CONFIRMED' | translate }}: {{ confirmedCount() }}
          </div>
          <div class="px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-100">
            {{ 'CALENDAR.PENDING' | translate }}: {{ pendingCount() }}
          </div>
        </div>
      </div>

      <!-- Cuadrícula Horaria Dinámica (Mobile-First Adaptive Grid) -->
      <div class="overflow-x-auto border border-gray-100 rounded-xl">
        <div class="min-w-[640px] divide-y divide-gray-100">
          <!-- Bucle de Franjas Horarias Disponibles (Slot Interval) -->
          @for (slot of timeSlots(); track slot) {
            <div cdkDropList [cdkDropListData]="slot" (cdkDropListDropped)="onReservationDropped($event)" class="flex items-center min-h-[72px] transition-colors hover:bg-gray-50/50">
              <!-- Eje Horario Flotante -->
              <div class="w-24 text-sm font-bold text-gray-500 p-4 border-r border-gray-100 bg-gray-50/30 text-center select-none">
                {{ slot }}
              </div>
              
              <!-- Contenedor de Celdas de Reserva Activas -->
              <div class="flex-1 p-2 flex flex-wrap gap-2 items-center">
                @for (res of getReservationsForSlot(slot); track res.id) {
                  <div 
                    [class]="getReservationClass(res.status)"
                    class="px-3 py-2 rounded-lg border text-xs shadow-xs max-w-[200px] truncate transition-all cursor-pointer hover:scale-[1.02]" cdkDrag [cdkDragData]="res">
                    <div class="flex justify-between items-center font-bold mb-0.5">
                      <span class="truncate pr-1">{{ res.confirmationCode }}</span>
                      <span class="px-1.5 py-0.5 rounded-sm bg-black/5 text-[10px] font-extrabold">Pax: {{ res.guestCount }}</span>
                    </div>
                    <div class="text-gray-600 dark:text-inherit truncate font-medium">
                      {{ res.notes || ('CALENDAR.NO_NOTES' | translate) }}
                    </div>
                  </div>
                } @empty {
                  <span class="text-xs text-gray-300 italic pl-2 select-none">{{ 'CALENDAR.SLOT_AVAILABLE' | translate }}</span>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CalendarComponent implements OnInit {
  private readonly configService = inject(RestaurantConfigService);
  private readonly socketService = inject(ReservationDashboardService);
  private readonly reservationHttpService = inject(ReservationHttpService);

  // Inputs Reactivos desde el Padre (Reservations Shell Component)
  public readonly restaurantId = input.required<string>();
  public readonly serverReservations = input<Reservation[]>([]);

  // Estados de Control Locales mediante Señales
  public readonly selectedDate = signal<Date>(new Date());
  private readonly _localReservations = signal<Reservation[]>([]);

  // ==========================================
  // METRICAS REACTIVAS COMPUTADAS EN MEMORIA
  // ==========================================
  public readonly allReservations = computed(() => {
    const serverData = this.serverReservations();
    const localData = this._localReservations();
    // Mezcla determinista priorizando eventos push asíncronos de WhatsApp
    const combined = [...localData, ...serverData.filter(s => !localData.some(l => l.id === s.id))];
    return combined;
  });

  public readonly totalGuests = computed(() => 
    this.allReservations().reduce((acc, res) => acc + res.guestCount, 0)
  );

  public readonly confirmedCount = computed(() => 
    this.allReservations().filter(res => res.status === ReservationStatus.CONFIRMED).length
  );

  public readonly pendingCount = computed(() => 
    this.allReservations().filter(res => res.status === ReservationStatus.PENDING).length
  );

  // Generador Dinámico de Ejes Horarios en función de los parámetros comerciales del Tenant
  public readonly timeSlots = computed(() => {
    const restaurant = this.configService.currentRestaurant();
    if (!restaurant) return ['12:00', '13:00', '14:00', '15:00', '20:00', '21:00', '22:00', '23:00'];
    
    const slots: string[] = [];
    const interval = restaurant.slotIntervalMinutes || 30;
    
    // Configuración base fija de simulación comercial expandible por OpeningHours
    let currentMinutes = 12 * 60; // Inicia a las 12:00 PM
    const endMinutes = 23 * 60 + 30; // Finaliza a las 11:30 PM

    while (currentMinutes <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
      const mins = (currentMinutes % 60).toString().padStart(2, '0');
      slots.push(`${hours}:${mins}`);
      currentMinutes += interval;
    }
    return slots;
  });

  public ngOnInit(): void {
    // Escucha en tiempo real de inserciones originadas desde la API de Meta
    this.socketService.reservationCreated$.subscribe((newRes: Reservation) => {
      this._localReservations.update(prev => [newRes, ...prev]);
    });

    // Escucha en tiempo real de mutaciones de estado
    this.socketService.reservationUpdated$.subscribe((updatedRes: Reservation) => {
      this._localReservations.update(prev => 
        prev.map(res => res.id === updatedRes.id ? updatedRes : res)
      );
    });
  }

  // Mapeador Léxico de Celdas Horarias
  public getReservationsForSlot(slot: string): Reservation[] {
    return this.allReservations().filter(res => {
      const startTime = new Date(res.reservationStart);
      const slotTimeStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
      return slotTimeStr === slot;
    });
  }

  // Estilos de Alta Visibilidad para Maîtres (Accesibilidad / Contraste)
  public onReservationDropped(event: CdkDragDrop<string>): void {
    const reservation = event.item.data as Reservation;
    const targetSlot = event.container.data;
    
    const start = new Date(reservation.reservationStart);
    const [hours, minutes] = targetSlot.split(':');
    start.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    const updatedIsoString = start.toISOString();
    
    // 1. Mutación visual inmediata (Optimistic UI Update)
    this._localReservations.update(prev => 
      prev.map(r => r.id === reservation.id ? { ...r, reservationStart: updatedIsoString } : r)
    );
    
    // 2. Persistencia atómica en Base de Datos + Trigger asíncrono de WhatsApp
    this.reservationHttpService.updateReservation(reservation.id, {
      reservationStart: updatedIsoString
    }).subscribe({
      error: () => {
        // Reversión del estado local en caso de fallo crítico de red
        this._localReservations.update(prev => 
          prev.map(r => r.id === reservation.id ? { ...r, reservationStart: reservation.reservationStart } : r)
        );
      }
    });
  }

  public getReservationClass(status: ReservationStatus): string {
    switch (status) {
      case ReservationStatus.CONFIRMED:
        return 'bg-green-50 border-green-200 text-green-800';
      case ReservationStatus.PENDING:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case ReservationStatus.CANCELLED:
        return 'bg-red-50 border-red-200 text-red-800 line-through';
      case ReservationStatus.COMPLETED:
        return 'bg-gray-100 border-gray-300 text-gray-700';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  }
}
