import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  allergies?: string[];
  notes?: string;
  isVip: boolean;
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  private readonly http = inject(HttpClient);

  public readonly customerList = signal<CustomerProfile[]>([]);

  public ngOnInit(): void {
    this.loadCustomerCRM();
  }

  public loadCustomerCRM(): void {
    const slug = localStorage.getItem('tenant_slug') || 'la-bella-italia';
    
    this.http.get<CustomerProfile[]>(`${environment.apiUrl}/restaurants/${slug}/customers`)
      .subscribe({
        next: (res) => {
          if (!res || res.length === 0) {
            this.setMockCRMData();
          } else {
            this.customerList.set(res);
          }
        },
        error: () => {
          this.setMockCRMData();
        }
      });
  }

  private setMockCRMData(): void {
    this.customerList.set([
      { id: 'c1', firstName: 'Alejandro', lastName: 'Sanz', phone: '+34600000001', allergies: ['Gluten', 'Lácteos'], notes: 'Prefiere siempre mesa en la terraza cerca de las plantas.', isVip: true },
      { id: 'c2', firstName: 'María', lastName: 'Antonieta', phone: '+34600000002', allergies: [], notes: 'Cliente muy puntual. Agua mineral natural templada.', isVip: false },
      { id: 'c3', firstName: 'Carlos', lastName: 'Vives', phone: '+34600000003', allergies: ['Mariscos'], notes: 'Mesa interior espaciosa para reuniones de negocios.', isVip: true }
    ]);
  }
}
