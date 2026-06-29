import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateStaffUserDto, StaffUser, UpdateStaffUserDto, UserRole } from '../models/restaurant.interfaces';

@Injectable({
  providedIn: 'root'
})
export class UserHttpService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  public getStaff(): Observable<StaffUser[]> {
    return this.http.get<StaffUser[]>(this.baseUrl);
  }

  public createStaff(user: CreateStaffUserDto): Observable<StaffUser> {
    return this.http.post<StaffUser>(this.baseUrl, user);
  }

  public updateStaffRole(userId: string, role: UserRole.MANAGER | UserRole.STAFF): Observable<StaffUser> {
    return this.http.patch<StaffUser>(`${this.baseUrl}/${userId}`, { role });
  }

  public toggleStaffStatus(userId: string, isActive: boolean): Observable<StaffUser> {
    return this.http.patch<StaffUser>(`${this.baseUrl}/${userId}`, { isActive });
  }

  public updateStaff(userId: string, data: UpdateStaffUserDto): Observable<StaffUser> {
    return this.http.patch<StaffUser>(`${this.baseUrl}/${userId}`, data);
  }
}
