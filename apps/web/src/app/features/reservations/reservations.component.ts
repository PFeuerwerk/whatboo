import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { Reservation } from '../../core/models/booking-models';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.css']
})
export class ReservationsComponent implements OnInit {
  private readonly http = inject(HttpClient);

  public readonly reservations = signal<Reservation[]>([]);
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
    
    this.http.get<Reservation[]>(`${environment.apiUrl}/reservations?slug=${slug}`)
      .subscribe({
        next: (res) => {
          if (!res || res.length === 0) {
            this.reservations.set([
              { id: '1', customerName: 'Rene Admin', pax: 4, timeSlot: '21:00', status: 'CONFIRMED' },
              { id: '2', customerName: 'Viras Client', pax: 2, timeSlot: '22:30', status: 'CONFIRMED' }
            ]);
          } else {
            this.reservations.set(res);
          }
        }
      });
  }

  public setFilter(status: string): void {
    this.activeFilter.set(status);
  }

  public updateStatus(id: string, nextStatus: string): void {
    this.http.patch(`${environment.apiUrl}/reservations/${id}/status`, { status: nextStatus })
      .subscribe(() => this.loadAgendaDiaria());
  }
}
