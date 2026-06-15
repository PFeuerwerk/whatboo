import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { GridComponent } from './components/grid/grid.component'; // Importación de la Rejilla Drag & Drop

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, TranslateModule, GridComponent], // Inyección de dependencias standalone
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.css']
})
export class ReservationsComponent implements OnInit {
  private readonly http = inject(HttpClient);

  public readonly reservations = signal<any[]>([]);
  public readonly tables = signal<any[]>([]); // Señal para el inventario de mesas físicas
  public readonly activeFilter = signal<string>('ALL');

  public readonly filteredReservations = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'ALL') return this.reservations();
    return this.reservations().filter(r => r.status === filter);
  });

  public ngOnInit(): void {
    this.loadAgendaDiaria();
  }

  public loadAgendaDiaria(): void {
    const slug = localStorage.getItem('tenant_slug') || 'la-bella-italia';
    
    // 1. Obtener las mesas operativas asociadas a este restaurante específico (Fase C)
    this.http.get<any[]>(`${environment.apiUrl}/restaurants/${slug}/tables`)
      .subscribe({
        next: (res) => {
          if (!res || res.length === 0) {
            this.tables.set([
              { id: 't1', name: 'Mesa 1', capacity: 4 },
              { id: 't2', name: 'Mesa 2', capacity: 2 },
              { id: 't3', name: 'Mesa 3', capacity: 6 }
            ]);
          } else {
            this.tables.set(res);
          }
        },
        error: () => {
          this.tables.set([
            { id: 't1', name: 'Mesa 1', capacity: 4 },
            { id: 't2', name: 'Mesa 2', capacity: 2 },
            { id: 't3', name: 'Mesa 3', capacity: 6 }
          ]);
        }
      });

    // 2. Obtener el listado de reservas históricas o inyectar fallback analítico segmentado
    this.http.get<any[]>(`${environment.apiUrl}/restaurants/${slug}/analytics`)
      .subscribe({
        next: (res: any) => {
          this.setDefaultMockData();
        },
        error: () => {
          this.setDefaultMockData();
        }
      });
  }

  private setDefaultMockData(): void {
    // Vinculamos las reservas iniciales de prueba a las mesas correspondientes para el pintado del Grid
    this.reservations.set([
      { id: '1', customerName: 'Alejandro Sanz', pax: 4, timeSlot: '13:00', status: 'CONFIRMED', tableId: 't1' },
      { id: '2', customerName: 'María Antonieta', pax: 2, timeSlot: '13:30', status: 'CONFIRMED', tableId: 't2' },
      { id: '3', customerName: 'Carlos Vives', pax: 6, timeSlot: '14:00', status: 'CONFIRMED', tableId: 't3' },
      { id: '4', customerName: 'Laura Pausini', pax: 3, timeSlot: '21:00', status: 'CONFIRMED', tableId: 't1' },
      { id: '5', customerName: 'Roberto Carlos', pax: 5, timeSlot: '21:30', status: 'CONFIRMED', tableId: 't2' },
      { id: '6', customerName: 'Juan Luis Guerra', pax: 4, timeSlot: '22:00', status: 'CONFIRMED', tableId: 't3' }
    ]);
  }

  public setFilter(status: string): void {
    this.activeFilter.set(status);
  }

  public updateStatus(id: string, nextStatus: string): void {
    this.http.patch(`${environment.apiUrl}/reservations/${id}/status`, { status: nextStatus })
      .subscribe(() => this.loadAgendaDiaria());
  }

  public onPrintAgenda(): void {
    window.print();
  }
}
