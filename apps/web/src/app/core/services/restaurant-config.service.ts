import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateRestaurantTableDto,
  CreateRestaurantZoneDto,
  OpeningHour,
  RestaurantSettings,
  RestaurantTable,
  RestaurantZone,
  UpdateRestaurantSettingsDto,
  UpdateRestaurantTableDto,
  UpdateRestaurantZoneDto
} from '../models/restaurant.interfaces';

@Injectable({
  providedIn: 'root'
})
export class RestaurantConfigService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/restaurants`;

  private readonly _currentRestaurant = signal<RestaurantSettings | null>(null);
  private readonly _zones = signal<RestaurantZone[]>([]);
  private readonly _tables = signal<RestaurantTable[]>([]);

  public readonly currentRestaurant = computed(() => this._currentRestaurant());
  public readonly zones = computed(() => [...this._zones()].sort((a, b) => a.priority - b.priority));
  public readonly tables = computed(() => this._tables());
  public readonly activeTables = computed(() => this._tables().filter(table => table.active));

  // ============================================================================
  // CONFIGURACIÓN OPERATIVA
  // ============================================================================
  public getConfiguration(_restaurantId?: string): Observable<RestaurantSettings> {
    return this.getSettings();
  }

  public getSettings(): Observable<RestaurantSettings> {
    return this.http.get<RestaurantSettings>(`${this.baseUrl}/settings`).pipe(
      tap(settings => this._currentRestaurant.set(settings))
    );
  }

  public updateConfiguration(
    _restaurantIdOrData: string | UpdateRestaurantSettingsDto,
    maybeData?: UpdateRestaurantSettingsDto
  ): Observable<RestaurantSettings> {
    const data = typeof _restaurantIdOrData === 'string' ? maybeData ?? {} : _restaurantIdOrData;
    return this.updateSettings(data);
  }

  public updateSettings(data: UpdateRestaurantSettingsDto): Observable<RestaurantSettings> {
    return this.http.patch<RestaurantSettings>(`${this.baseUrl}/settings`, data).pipe(
      tap(updated => this._currentRestaurant.set(updated))
    );
  }

  // ============================================================================
  // CARGA DE PLANTA COMPLETA
  // ============================================================================
  public loadFloorPlan(): Observable<{ zones: RestaurantZone[]; tables: RestaurantTable[] }> {
    return forkJoin({
      zones: this.getZones(),
      tables: this.getTables()
    });
  }

  // ============================================================================
  // ZONAS Y PRIORIDAD DE LLENADO AUTOMÁTICO
  // ============================================================================
  public getZones(_restaurantId?: string): Observable<RestaurantZone[]> {
    return this.http.get<RestaurantZone[]>(`${this.baseUrl}/zones`).pipe(
      tap(zones => this._zones.set(zones ?? []))
    );
  }

  public createZone(
    _restaurantIdOrZone: string | CreateRestaurantZoneDto,
    maybeZone?: CreateRestaurantZoneDto
  ): Observable<RestaurantZone> {
    const zone = typeof _restaurantIdOrZone === 'string' ? maybeZone : _restaurantIdOrZone;

    if (!zone) {
      throw new Error('createZone requiere los datos de la zona.');
    }

    return this.http.post<RestaurantZone>(`${this.baseUrl}/zones`, zone).pipe(
      tap(created => this._zones.update(current => [...current, created]))
    );
  }

  public updateZone(
    _restaurantIdOrZoneId: string,
    zoneIdOrData: string | UpdateRestaurantZoneDto,
    maybeData?: UpdateRestaurantZoneDto
  ): Observable<RestaurantZone> {
    const zoneId = typeof zoneIdOrData === 'string' ? zoneIdOrData : _restaurantIdOrZoneId;
    const data = typeof zoneIdOrData === 'string' ? maybeData ?? {} : zoneIdOrData;

    return this.http.patch<RestaurantZone>(`${this.baseUrl}/zones/${zoneId}`, data).pipe(
      tap(updated => this._zones.update(current => current.map(zone => zone.id === updated.id ? updated : zone)))
    );
  }

  public deleteZone(_restaurantIdOrZoneId: string, maybeZoneId?: string): Observable<RestaurantZone> {
    const zoneId = maybeZoneId ?? _restaurantIdOrZoneId;

    return this.http.delete<RestaurantZone>(`${this.baseUrl}/zones/${zoneId}`).pipe(
      tap(deleted => this._zones.update(current => current.filter(zone => zone.id !== deleted.id)))
    );
  }

  // ============================================================================
  // MESAS Y AFORO
  // ============================================================================
  public getTables(_restaurantId?: string): Observable<RestaurantTable[]> {
    return this.http.get<RestaurantTable[]>(`${this.baseUrl}/tables`).pipe(
      tap(tables => this._tables.set(tables ?? []))
    );
  }

  public createTable(
    _restaurantIdOrTable: string | CreateRestaurantTableDto,
    maybeTable?: CreateRestaurantTableDto
  ): Observable<RestaurantTable> {
    const table = typeof _restaurantIdOrTable === 'string' ? maybeTable : _restaurantIdOrTable;

    if (!table) {
      throw new Error('createTable requiere los datos de la mesa.');
    }

    return this.http.post<RestaurantTable>(`${this.baseUrl}/tables`, table).pipe(
      tap(created => this._tables.update(current => [...current, created]))
    );
  }

  public updateTable(
    _restaurantIdOrTableId: string,
    tableIdOrData: string | UpdateRestaurantTableDto,
    maybeData?: UpdateRestaurantTableDto
  ): Observable<RestaurantTable> {
    const tableId = typeof tableIdOrData === 'string' ? tableIdOrData : _restaurantIdOrTableId;
    const data = typeof tableIdOrData === 'string' ? maybeData ?? {} : tableIdOrData;

    return this.http.patch<RestaurantTable>(`${this.baseUrl}/tables/${tableId}`, data).pipe(
      tap(updated => this._tables.update(current => current.map(table => table.id === updated.id ? updated : table)))
    );
  }

  public deleteTable(_restaurantIdOrTableId: string, maybeTableId?: string): Observable<RestaurantTable> {
    const tableId = maybeTableId ?? _restaurantIdOrTableId;

    return this.http.delete<RestaurantTable>(`${this.baseUrl}/tables/${tableId}`).pipe(
      tap(deleted => this._tables.update(current => current.filter(table => table.id !== deleted.id)))
    );
  }

  // ============================================================================
  // HORARIOS OPERATIVOS
  // ============================================================================
  public updateOpeningHours(_restaurantId: string, hours: OpeningHour[]): Observable<RestaurantSettings> {
    return this.updateSettings({
      openingHours: hours.map(hour => ({
        dayOfWeek: hour.dayOfWeek,
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        isClosed: hour.isClosed,
        active: hour.active
      }))
    });
  }
}
