import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reservation, ReservationStatus } from '../models/restaurant.interfaces';

export interface UpdateReservationDto {
  reservationStart?: string;
  reservationEnd?: string;
  guestCount?: number;
  notes?: string | null;
  tableId?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationHttpService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reservations`;

  public getTodayReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.baseUrl}/today`);
  }

  public getReservationsByDate(date: string): Observable<Reservation[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<Reservation[]>(this.baseUrl, { params });
  }

  public updateReservation(reservationId: string, data: UpdateReservationDto): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.baseUrl}/${reservationId}`, data);
  }

  public updateReservationStatus(reservationId: string, status: ReservationStatus): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.baseUrl}/${reservationId}/status`, { status });
  }

  public cancelReservation(reservationId: string, reason?: string): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.baseUrl}/${reservationId}/cancel`, { reason });
  }
}
