import { Injectable, inject, signal } from '@angular/core'; // Corregido: Importaciones desde el core nativo de Angular
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginPayload {
  email: string;
  passwordHash?: string;
  password?: string;
  restaurantSlug: string;
}

export interface LoginResponse {
  accessToken: string;
  user?: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    restaurantId?: string;
    restaurantSlug?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  // Funciones core de sesión reactiva requeridas por el Shell y Guards de WhatBoo
  public readonly user = signal<any | null>(null);
  private readonly tokenKey = 'access_token';

  constructor() {
    // Rehidratar la sesión en caliente al refrescar la pantalla
    this.loadUserFromStorage();
  }

  /**
   * Método de autenticación perimetral multi-tenant unificado
   */
  login(payload: LoginPayload): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'X-Tenant-Slug': payload.restaurantSlug
    });

    const body = {
      email: payload.email,
      password: payload.password,
      restaurantSlug: payload.restaurantSlug
    };

    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, body, { headers })
      .pipe(
        tap((res: LoginResponse) => { // Corregido: Tipado explícito de la respuesta para evitar el error de objeto vacío
          if (res?.accessToken) {
            localStorage.setItem(this.tokenKey, res.accessToken);
            localStorage.setItem('user_role', res.user?.role || 'OWNER');
            if (res.user?.restaurantSlug) {
              localStorage.setItem('tenant_slug', res.user.restaurantSlug);
            }
            this.user.set(res.user || { email: payload.email, role: 'OWNER' });
          }
        })
      );
  }

  /**
   * Validador de sesión atómico utilizado por authGuard y guestGuard
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    return !!token;
  }

  /**
   * Desconexión perimetral segura requerida por ShellComponent
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('user_role');
    localStorage.removeItem('tenant_slug');
    this.user.set(null);
    window.location.href = '/auth/login';
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem(this.tokenKey);
    const role = localStorage.getItem('user_role');
    if (token) {
      this.user.set({ role: role || 'OWNER', email: 'user@restaurant.com' });
    }
  }
}
