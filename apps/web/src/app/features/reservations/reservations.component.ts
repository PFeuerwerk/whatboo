import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.css']
})
export class ReservationsComponent implements OnInit {
  private readonly http = inject(HttpClient);

  public readonly reservations = signal<any[]>([]);
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
    this.reservations.set([
      { id: '1', customerName: 'Alejandro Sanz', pax: 4, timeSlot: '13:00', status: 'CONFIRMED' },
      { id: '2', customerName: 'María Antonieta', pax: 2, timeSlot: '13:30', status: 'CONFIRMED' },
      { id: '3', customerName: 'Carlos Vives', pax: 6, timeSlot: '14:00', status: 'CONFIRMED' },
      { id: '4', customerName: 'Laura Pausini', pax: 3, timeSlot: '21:00', status: 'CONFIRMED' },
      { id: '5', customerName: 'Roberto Carlos', pax: 5, timeSlot: '21:30', status: 'CONFIRMED' },
      { id: '6', customerName: 'Juan Luis Guerra', pax: 4, timeSlot: '22:00', status: 'CONFIRMED' }
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
    window.print(); // Invoca la orden de impresion limpia de la lista diaria
  }
}
