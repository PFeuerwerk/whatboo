import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RestaurantStatus } from '../models/restaurant.interfaces';
import {
  PlatformDashboard,
  PlatformListResponse,
  PlatformObservability,
  PlatformRestaurantDetail,
  PlatformRestaurantListItem,
  PlatformUser,
  UpdatePlatformRestaurantDto,
} from '../models/platform-admin.interfaces';

@Injectable({
  providedIn: 'root',
})
export class PlatformAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/platform/admin`;

  getDashboard(): Observable<PlatformDashboard> {
    return this.http.get<PlatformDashboard>(`${this.baseUrl}/dashboard`);
  }

  getRestaurants(input?: {
    q?: string;
    status?: RestaurantStatus | 'ALL';
    take?: number;
    skip?: number;
  }): Observable<PlatformListResponse<PlatformRestaurantListItem>> {
    let params = new HttpParams();
    if (input?.q?.trim()) params = params.set('q', input.q.trim());
    if (input?.status && input.status !== 'ALL') params = params.set('status', input.status);
    if (input?.take) params = params.set('take', input.take);
    if (input?.skip) params = params.set('skip', input.skip);

    return this.http.get<PlatformListResponse<PlatformRestaurantListItem>>(
      `${this.baseUrl}/restaurants`,
      { params },
    );
  }

  getRestaurant(id: string): Observable<PlatformRestaurantDetail> {
    return this.http.get<PlatformRestaurantDetail>(`${this.baseUrl}/restaurants/${id}`);
  }

  updateRestaurant(id: string, dto: UpdatePlatformRestaurantDto): Observable<PlatformRestaurantListItem> {
    return this.http.patch<PlatformRestaurantListItem>(`${this.baseUrl}/restaurants/${id}`, dto);
  }

  updateRestaurantStatus(id: string, status: RestaurantStatus): Observable<PlatformRestaurantListItem> {
    return this.http.patch<PlatformRestaurantListItem>(
      `${this.baseUrl}/restaurants/${id}/status`,
      { status },
    );
  }

  getUsers(): Observable<PlatformUser[]> {
    return this.http.get<PlatformUser[]>(`${this.baseUrl}/users`);
  }

  getObservability(): Observable<PlatformObservability> {
    return this.http.get<PlatformObservability>(`${this.baseUrl}/observability`);
  }
}
