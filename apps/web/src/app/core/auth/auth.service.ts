import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginPayload {
  email: string;
  password: string;
  restaurantSlug: string;
}

export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  restaurantId: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<AuthUser | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly userRole = computed(() => this._user()?.role ?? null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.loadUserFromToken();
  }

  login(payload: LoginPayload): Observable<{ accessToken: string }> {
    return this.http
      .post<{ accessToken: string }>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(
        tap(({ accessToken }) => {
          localStorage.setItem('access_token', accessToken);
          this.loadUserFromToken();
        }),
      );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  private loadUserFromToken(): void {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      if (isExpired) {
        this.logout();
        return;
      }
      this._user.set({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        restaurantId: payload.restaurantId,
      });
    } catch {
      this.logout();
    }
  }
}
