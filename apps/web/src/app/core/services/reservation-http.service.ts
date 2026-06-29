import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Reservation, ReservationStatus } from '../models/restaurant.interfaces';

export interface UpdateReservationDto {
  reservationStart?: string;
  reservationEnd?: string;
  guestCount?: number;
  notes?: string | null;
  tableId?: string | null;
}

export interface ReservationListResponse {
  data: Reservation[];
  total: number;
  take: number;
  skip: number;
}

export interface ReservationListQuery {
  date?: string;
  from?: string;
  to?: string;
  status?: ReservationStatus;
  source?: string;
  q?: string;
  take?: number;
  skip?: number;
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
    return this.http
      .get<Reservation[] | ReservationListResponse>(this.baseUrl, { params })
      .pipe(map(response => Array.isArray(response) ? response : response.data));
  }

  public getReservations(query: ReservationListQuery): Observable<ReservationListResponse> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ReservationListResponse>(this.baseUrl, { params });
  }

  public updateReservation(reservationId: string, data: UpdateReservationDto): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.baseUrl}/${reservationId}`, data);
  }

  public updateReservationStatus(reservationId: string, status: ReservationStatus): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.baseUrl}/${reservationId}/status`, { status });
  }

  public cancelReservation(reservationId: string, reason?: string, reasonCode = 'CUSTOMER_REQUEST'): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.baseUrl}/${reservationId}/cancel`, {
      reasonCode,
      reason: reason?.trim() || 'Cancelada desde dashboard',
      source: 'DASHBOARD'
    });
  }

  public markNoShow(reservationId: string, details?: string): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.baseUrl}/${reservationId}/no-show`, {
      reasonCode: 'CUSTOMER_DID_NOT_ARRIVE',
      details: details?.trim() || 'Marcada como no-show desde dashboard'
    });
  }
}