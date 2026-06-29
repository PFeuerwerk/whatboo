import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reservation } from '../models/restaurant.interfaces';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class ReservationDashboardService {
  private socket: Socket | null = null;
  private connectedRestaurantId: string | null = null;

  private readonly _reservationCreated$ = new Subject<Reservation>();
  private readonly _reservationUpdated$ = new Subject<Reservation>();
  private readonly _isConnected = signal<boolean>(false);

  public readonly isConnected = computed(() => this._isConnected());
  public readonly reservationCreated$ = this._reservationCreated$.asObservable();
  public readonly reservationUpdated$ = this._reservationUpdated$.asObservable();

  /**
   * Conecta el dashboard al namespace real del backend: /dashboard.
   * El backend aísla al tenant usando query.restaurantId durante el handshake.
   */
  public connect(restaurantId: string): void {
    if (this.socket?.connected && this.connectedRestaurantId === restaurantId) return;

    this.disconnect();
    this.connectedRestaurantId = restaurantId;

    const socketUrl = environment.apiUrl.replace(/\/api\/v1\/?$/, '');

    this.socket = io(`${socketUrl}/dashboard`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      query: { restaurantId }
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this._isConnected.set(true);
    });

    this.socket.on('disconnect', () => {
      this._isConnected.set(false);
    });

    /**
     * Backend actual emite reservation_created desde ReservationEngineService.
     * Se dejan alias con ':' para compatibilidad futura si se normalizan eventos.
     */
    this.socket.on('reservation_created', (reservation: Reservation) => {
      this._reservationCreated$.next(reservation);
    });

    this.socket.on('reservation:created', (reservation: Reservation) => {
      this._reservationCreated$.next(reservation);
    });

    this.socket.on('reservation_updated', (reservation: Reservation) => {
      this._reservationUpdated$.next(reservation);
    });

    this.socket.on('reservation:updated', (reservation: Reservation) => {
      this._reservationUpdated$.next(reservation);
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectedRestaurantId = null;
    this._isConnected.set(false);
  }
}
