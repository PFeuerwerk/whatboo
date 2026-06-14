import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

const ACCESS_TOKEN_KEY = 'access_token';

export interface LoginPayload {
  email: string;
  password: string;
  restaurantSlug: string;
}

export interface LoginResponse {
  accessToken: string;
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
  private expiryTimer: any = null;

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly userRole = computed(() => this._user()?.role ?? null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.loadUserFromToken();
  }

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(
        tap(({ accessToken }) => {
          this.saveAccessToken(accessToken);
          this.loadUserFromToken();
        }),
      );
  }

  get accessToken(): string | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    return this.isValidToken(token) ? token : null;
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    this._user.set(null);
    this.router.navigate(['/auth/login']);
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  private loadUserFromToken(): void {
    const token = this.accessToken;
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!this.isTokenPayloadValid(payload)) {
        this.logout();
        return;
      }
      const expiresAtMs = payload.exp * 1000;
      const isExpired = expiresAtMs < Date.now();
      if (isExpired) {
        this.logout();
        return;
      }
      // schedule automatic logout when token expires
      if (this.expiryTimer) {
        clearTimeout(this.expiryTimer);
      }
      const msLeft = Math.max(0, expiresAtMs - Date.now());
      this.expiryTimer = setTimeout(() => this.logout(), msLeft + 1000);
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

  private saveAccessToken(token: string): void {
    if (!this.isValidToken(token)) {
      throw new Error('Invalid access token received from auth service');
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  private isValidToken(token: string | null): token is string {
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    try {
      const payload = JSON.parse(atob(parts[1]));
      return this.isTokenPayloadValid(payload);
    } catch {
      return false;
    }
  }

  private isTokenPayloadValid(payload: unknown): payload is {
    exp: number;
    sub: string;
    email: string;
    role: string;
    restaurantId: string;
  } {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      typeof (payload as any).exp === 'number' &&
      typeof (payload as any).sub === 'string' &&
      typeof (payload as any).email === 'string' &&
      typeof (payload as any).role === 'string' &&
      typeof (payload as any).restaurantId === 'string'
    );
  }
}
