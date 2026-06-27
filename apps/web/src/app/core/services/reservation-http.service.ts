import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reservation } from '../models/restaurant.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ReservationHttpService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reservations`;

  /**
   * Modifica parámetros transaccionales de una reserva en PostgreSQL
   * Dispara el flujo asíncrono de WhatsApp mediante las colas de BullMQ
   */
  public updateReservation(reservationId: string, data: Partial<Reservation>): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.baseUrl}/${reservationId}`, data);
  }
}
