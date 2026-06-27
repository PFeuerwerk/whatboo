import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserRole } from '../models/restaurant.interfaces';

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserHttpService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  public getStaff(): Observable<StaffUser[]> {
    return this.http.get<StaffUser[]>(this.baseUrl);
  }

  public createStaff(user: Partial<StaffUser>): Observable<StaffUser> {
    return this.http.post<StaffUser>(this.baseUrl, user);
  }

  public updateStaffRole(userId: string, role: UserRole): Observable<StaffUser> {
    return this.http.patch<StaffUser>(`${this.baseUrl}/${userId}/role`, { role });
  }

  public toggleStaffStatus(userId: string, active: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${userId}/status`, { active });
  }
}
