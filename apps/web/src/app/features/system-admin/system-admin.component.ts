import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-system-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-admin.component.html',
  styleUrls: ['./system-admin.component.css']
})
export class SystemAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  public readonly restaurantList = signal<any[]>([]);

  public ngOnInit(): void {
    this.loadGlobalTenants();
  }

  public loadGlobalTenants(): void {
    this.http.post<any[]>(`${environment.apiUrl}/auth/system/restaurants`, {})
      .subscribe({
        next: (res) => this.restaurantList.set(res || []),
        error: () => this.restaurantList.set([])
      });
  }

  public onDestroyRestaurant(restaurantId: string): void {
    if (!confirm('⚠️ ¿Está absolutamente seguro de destruir este inquilino? Se eliminarán todas sus mesas, personal y reservas en cascada de PostgreSQL de forma irreversible.')) return;

    this.http.post(`${environment.apiUrl}/auth/system/restaurants/${restaurantId}`, {})
      .subscribe({
        next: () => {
          this.loadGlobalTenants();
        }
      });
  }
}
