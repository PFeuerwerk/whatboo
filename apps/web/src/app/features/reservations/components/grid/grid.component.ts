import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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

  // Sincronizado: Array de slots exactos con minutos para coincidir con la base de datos
  public readonly timelineHours = ['13:00', '13:30', '14:00', '21:00', '21:30', '22:00'];
  
  private activeTableId: string | null = null;
  private activeHour: string | null = null;

  public ngOnInit(): void {}

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

    // Actualización de persistencia local reactiva
    const found = this.reservations().find(r => r.id === reservationId);
    if (found) {
      found.tableId = tableId;
      found.timeSlot = hour;
      this.onGridUpdated.emit();
    }
  }
}
