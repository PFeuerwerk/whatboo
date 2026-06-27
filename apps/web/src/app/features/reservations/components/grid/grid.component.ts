import { Component, OnInit, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http'; // Importación canónica corregida
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-reservations-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.css']
})
export class GridComponent implements OnInit {
  private readonly http = inject(HttpClient);

  public readonly tables = input<any[]>([]);
  public readonly reservations = input<any[]>([]);
  public readonly onGridUpdated = output<void>();

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

  public readonly totalPages = computed(() => {
    return Math.ceil(this.tables().length / this.pageSize) || 1;
  });

  private activeTableId: string | null = null;
  private activeHour: string | null = null;

  public ngOnInit(): void {}

  public nextTables(): void {
    if (this.tablePage() < this.totalPages() - 1) {
      this.tablePage.update(p => p + 1);
    }
  }

  public prevTables(): void {
    if (this.tablePage() > 0) {
      this.tablePage.update(p => p - 1);
    }
  }

  public getReservationsForSlot(tableId: string, hour: string): any[] {
    return this.reservations().filter(r => r.tableId === tableId && r.timeSlot === hour);
  }

  public isZoneTargeted(tableId: string, hour: string): boolean {
    return this.activeTableId === tableId && this.activeHour === hour;
  }

  public onDragStart(event: DragEvent, reservationId: string): void {
    event.dataTransfer?.setData('text/plain', reservationId);
    event.dataTransfer!.effectAllowed = 'move';
  }

  public onDragOver(event: DragEvent, tableId: string, hour: string): void {
    event.preventDefault();
    this.activeTableId = tableId;
    this.activeHour = hour;
  }

  public onDragLeave(): void {
    this.activeTableId = null;
    this.activeHour = null;
  }

  public onDrop(event: DragEvent, tableId: string, hour: string): void {
    event.preventDefault();
    this.onDragLeave();

    const reservationId = event.dataTransfer?.getData('text/plain');
    if (!reservationId) return;

    // 1. UI Optimista: Actualizar síncronamente la posición en memoria del cliente
    const found = this.reservations().find(r => r.id === reservationId);
    if (found) {
      found.tableId = tableId;
      found.timeSlot = hour;
    }

    // 2. Persistencia asíncrona en PostgreSQL a través de la API NestJS
    this.http.patch(`${environment.apiUrl}/reservations/${reservationId}`, {
      tableId: tableId,
      timeSlot: hour
    }).subscribe({
      next: () => {
        this.onGridUpdated.emit(); // Rehidratación reactiva inmutable global
      },
      error: (err) => {
        console.error('❌ Error en el guardado de red del Drag & Drop:', err);
      }
    });
  }
}
