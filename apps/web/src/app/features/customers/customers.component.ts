import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

export interface CustomerItem {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  preferredLanguage: string;
  notes?: string;
  totalReservations: number;
  lastReservationAt?: string;
  vip: boolean;
  active: boolean;
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './customers.component.html',
})
export class CustomersComponent implements OnInit {
  // Señales reactivas de Angular para un rendimiento óptimo de renderizado
  readonly customers = signal<CustomerItem[]>([]);
  readonly searchQuery = signal<string>('');
  readonly isLoading = signal<boolean>(false);

  // Filtro reactivo computado en memoria: Búsqueda instantánea por nombre o teléfono
  readonly filteredCustomers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.customers();
    
    if (!query) return list;
    
    return list.filter((cust) => 
      cust.firstName.toLowerCase().includes(query) || 
      (cust.lastName && cust.lastName.toLowerCase().includes(query)) ||
      cust.phone.includes(query)
    );
  });

  constructor(
    private readonly http: HttpClient,
    public readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadRestaurantCustomers();
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  /**
   * Carga los perfiles de clientes aislados para el inquilino activo
   */
  private loadRestaurantCustomers(): void {
    this.isLoading.set(true);
    const url = `${environment.apiUrl}/customers`;

    this.http.get<CustomerItem[]>(url).subscribe({
      next: (data) => {
        this.customers.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.customers.set([]); // Fallback seguro ante fallos de red
      }
    });
  }
}
