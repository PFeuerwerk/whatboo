import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reservation } from '../models/restaurant.interfaces';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class ReservationDashboardService {
  private socket: Socket | null = null;
  
  // ============================================================================
  // FLUJOS ASÍNCRONOS Y CANALES REACTIVOS (ANGULAR 19)
  // ============================================================================
  private readonly _reservationCreated$ = new Subject<Reservation>();
  private readonly _reservationUpdated$ = new Subject<Reservation>();
  private readonly _isConnected = signal<boolean>(false);

  // Estados de conexión expuestos a la UI del Maître mediante Signals
  public readonly isConnected = computed(() => this._isConnected());
  public readonly reservationCreated$ = this._reservationCreated$.asObservable();
  public readonly reservationUpdated$ = this._reservationUpdated$.asObservable();

  /**
   * Inicializa la conexión por WebSockets aislando perimetralmente al Tenant
   * @param restaurantId Identificador único del restaurante activo
   */
  public connect(restaurantId: string): void {
    if (this.socket?.connected) return;

    // Se extrae la raíz remota limpiando el prefijo REST HTTP de la API
    const socketUrl = environment.apiUrl.replace('/api/v1', '');

    // Inicialización explícita acoplada al namespace '/dashboard' del backend
    this.socket = io(`${socketUrl}/dashboard`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      query: { restaurantId } // El handshake inyecta el Tenant ID de forma determinista
    });

    this.setupListeners();
  }

  /**
   * Enlace de los listeners reactivos que capturan los eventos distribuidos desde BullMQ
   */
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this._isConnected.set(true);
    });

    this.socket.on('disconnect', () => {
      this._isConnected.set(false);
    });

    // Captura de inserciones limpias originadas desde WhatsApp
    this.socket.on('reservation:created', (reservation: Reservation) => {
      this._reservationCreated$.next(reservation);
    });

    // Captura de mutaciones de estado de reservas procesadas desde el Maître Web Panel
    this.socket.on('reservation:updated', (reservation: Reservation) => {
      this._reservationUpdated$.next(reservation);
    });
  }

  /**
   * Desconexión controlada del socket para mitigar fugas de memoria en la UI web
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this._isConnected.set(false);
    }
  }
}
