import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  /**
   * Envía las credenciales al backend para iniciar sesión
   */
  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials);
  }

  /**
   * Solicita el enlace de recuperación de contraseña al Backend (NestJS)
   * Envía el email y el slug del restaurante
   */
  requestPasswordReset(payload: { email: string; restaurantSlug: string }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/forgot-password`, payload);
  }

  /**
   * Consume el token seguro y consolida el cambio real de contraseña en la base de datos
   * Envía el token y la nueva contraseña confirmada
   */
  resetPassword(payload: { token: string; newPassword: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, payload);
  }
}
