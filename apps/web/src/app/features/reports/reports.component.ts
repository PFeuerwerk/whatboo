import { Component, OnInit, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RestaurantConfigService } from '../../core/services/restaurant-config.service';
import { Reservation } from '../../core/models/restaurant.interfaces';

@Component({
  selector: 'app-restaurant-reports',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './reports.component.html',
  styles: [`
    @media print {
      /* Ocultar elementos perimetrales innecesarios en el PDF Corporativo */
      .non-printable, 
      sidebar, 
      topbar, 
      .sidebar-wrapper, 
      button { 
        display: none !important; 
      }
      /* Forzar visualización de la cabecera ejecutiva */
      .printable-header { 
        display: block !important; 
      }
      /* Reset de fondos del sistema operativo para impresión limpia */
      body { 
        background: #ffffff !important; 
        color: #000000 !important; 
      }
      .printable-area { 
        padding: 0 !important; 
        margin: 0 !important; 
        max-w: 100% !important; 
      }
    }
  `]
})
export class ReportsComponent implements OnInit {
  private readonly configService = inject(RestaurantConfigService);

  // Inputs Reactivos mapeados desde el Orquestador del Dashboard
  public readonly serverReservations = input<Reservation[]>([]);

  // Estados de Control Locales
  public readonly restaurantName = signal<string>('Gourmet Restaurant SaaS');
  public readonly reportDate = signal<Date>(new Date());

  // ============================================================================
  // ANALÍTICAS REACTIVAS COMPUTADAS EN MEMORIA POR TURNOS (MÁXIMO RENDIMIENTO)
  // ============================================================================
  
  // Segmentación Turno Almuerzo (Configuración estándar: antes de las 17:00)
  private readonly lunchReservations = computed(() => 
    this.serverReservations().filter(res => {
      const date = new Date(res.reservationStart);
      return date.getHours() < 17;
    })
  );

  public readonly lunchGuests = computed(() => 
    this.lunchReservations().reduce((acc, res) => acc + res.guestCount, 0)
  );

  public readonly lunchReservationsCount = computed(() => this.lunchReservations().length);

  // Segmentación Turno Cena (Configuración estándar: a partir de las 17:00)
  private readonly dinnerReservations = computed(() => 
    this.serverReservations().filter(res => {
      const date = new Date(res.reservationStart);
      return date.getHours() >= 17;
    })
  );

  public readonly dinnerGuests = computed(() => 
    this.dinnerReservations().reduce((acc, res) => acc + res.guestCount, 0)
  );

  public readonly dinnerReservationsCount = computed(() => this.dinnerReservations().length);

  // Métricas Consolidadas del Día Comercial
  public readonly totalGuests = computed(() => this.lunchGuests() + this.dinnerGuests());

  public readonly occupationRate = computed(() => {
    const restaurant = this.configService.currentRestaurant();
    const maxCap = restaurant?.maxCapacity || 100; // Capacidad máxima del aforo parametrizada en PostgreSQL
    const total = this.totalGuests();
    return Math.min(Math.round((total / maxCap) * 100), 100);
  });

  public ngOnInit(): void {
    const activeRestaurant = this.configService.currentRestaurant();
    if (activeRestaurant) {
      this.restaurantName.set(activeRestaurant.name);
    }
  }

  /**
   * Dispara de manera directa e interactiva la pasarela de exportación a PDF nativo del S.O.
   */
  public exportToPDF(): void {
    window.print();
  }
}
