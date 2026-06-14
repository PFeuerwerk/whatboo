import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Restaurant, 
  RestaurantZone, 
  RestaurantTable, 
  OpeningHour 
} from '../models/restaurant.interfaces';

@Injectable({
  providedIn: 'root'
})
export class RestaurantConfigService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/restaurants`;

  // ==========================================
  // ESTADOS REACTIVOS MEDIANTE SIGNALS (ANGULAR 19)
  // ==========================================
  private readonly _currentRestaurant = signal<Restaurant | null>(null);
  private readonly _zones = signal<RestaurantZone[]>([]);
  private readonly _tables = signal<RestaurantTable[]>([]);

  // Selectores de solo lectura expuestos a la UI
  public readonly currentRestaurant = computed(() => this._currentRestaurant());
  public readonly zones = computed(() => this._zones().sort((a, b) => a.priority - b.priority)); // Ordenación tipo Tetris por prioridad
  public readonly tables = computed(() => this._tables());

  // ==========================================
  // OPERACIONES CRUD - CONFIGURACIÓN COMERCIAL (TENANT)
  // ==========================================
  public getConfiguration(restaurantId: string): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.baseUrl}/${restaurantId}/config`).pipe(
      tap(restaurant => this._currentRestaurant.set(restaurant))
    );
  }

  public updateConfiguration(restaurantId: string, data: Partial<Restaurant>): Observable<Restaurant> {
    return this.http.patch<Restaurant>(`${this.baseUrl}/${restaurantId}/config`, data).pipe(
      tap(updated => this._currentRestaurant.set(updated))
    );
  }

  // ==========================================
  // OPERACIONES CRUD - GESTIÓN DE ZONAS (PLANTA)
  // ==========================================
  public getZones(restaurantId: string): Observable<RestaurantZone[]> {
    return this.http.get<RestaurantZone[]>(`${this.baseUrl}/${restaurantId}/zones`).pipe(
      tap(zones => this._zones.set(zones))
    );
  }

  public createZone(restaurantId: string, zone: Partial<RestaurantZone>): Observable<RestaurantZone> {
    return this.http.post<RestaurantZone>(`${this.baseUrl}/${restaurantId}/zones`, zone).pipe(
      tap(() => this.getZones(restaurantId).subscribe())
    );
  }

  public updateZone(restaurantId: string, zoneId: string, zone: Partial<RestaurantZone>): Observable<RestaurantZone> {
    return this.http.patch<RestaurantZone>(`${this.baseUrl}/${restaurantId}/zones/${zoneId}`, zone).pipe(
      tap(() => this.getZones(restaurantId).subscribe())
    );
  }

  public deleteZone(restaurantId: string, zoneId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${restaurantId}/zones/${zoneId}`).pipe(
      tap(() => this.getZones(restaurantId).subscribe())
    );
  }

  // ==========================================
  // OPERACIONES CRUD - GESTIÓN DE MESAS Y AFORO
  // ==========================================
  public getTables(restaurantId: string): Observable<RestaurantTable[]> {
    return this.http.get<RestaurantTable[]>(`${this.baseUrl}/${restaurantId}/tables`).pipe(
      tap(tables => this._tables.set(tables))
    );
  }

  public createTable(restaurantId: string, table: Partial<RestaurantTable>): Observable<RestaurantTable> {
    return this.http.post<RestaurantTable>(`${this.baseUrl}/${restaurantId}/tables`, table).pipe(
      tap(() => this.getTables(restaurantId).subscribe())
    );
  }

  public updateTable(restaurantId: string, tableId: string, table: Partial<RestaurantTable>): Observable<RestaurantTable> {
    return this.http.patch<RestaurantTable>(`${this.baseUrl}/${restaurantId}/tables/${tableId}`, table).pipe(
      tap(() => this.getTables(restaurantId).subscribe())
    );
  }

  public deleteTable(restaurantId: string, tableId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${restaurantId}/tables/${tableId}`).pipe(
      tap(() => this.getTables(restaurantId).subscribe())
    );
  }

  // ==========================================
  // OPERACIONES - HORARIOS OPERATIVOS (API RESTRICTIONS)
  // ==========================================
  public updateOpeningHours(restaurantId: string, hours: OpeningHour[]): Observable<OpeningHour[]> {
    return this.http.put<OpeningHour[]>(`${this.baseUrl}/${restaurantId}/opening-hours`, { hours });
  }
}
