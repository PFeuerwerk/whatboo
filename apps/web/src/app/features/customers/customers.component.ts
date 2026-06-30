import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Customer, Reservation } from '../../core/models/restaurant.interfaces';

export interface CustomerProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email?: string | null;
  allergies?: string[];
  notes?: string | null;
  isVip: boolean;
  totalReservations?: number;
  lastReservationAt?: string | Date | null;
}

interface CustomerListResponse {
  data: Customer[];
  total: number;
}

interface CustomerDetailResponse extends Customer {
  metrics: {
    reservationCount: number;
    completedCount: number;
    cancelledCount: number;
    noShowCount: number;
    totalPax: number;
  };
  reservations: {
    data: Reservation[];
    total: number;
    take: number;
    skip: number;
  };
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
  public readonly selectedCustomer = signal<CustomerDetailResponse | null>(null);
  public readonly searchTerm = signal('');
  public readonly isLoading = signal(false);
  public readonly isProfileLoading = signal(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly totalCustomers = signal(0);

  public ngOnInit(): void {
    this.loadCustomerCRM();
  }

  public loadCustomerCRM(): void {
    const q = this.searchTerm().trim();
    const params = q ? new HttpParams().set('q', q) : undefined;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http.get<CustomerListResponse>(`${environment.apiUrl}/customers`, { params })
      .subscribe({
        next: (res) => {
          this.customerList.set((res?.data ?? []).map(customer => this.toCustomerProfile(customer)));
          this.totalCustomers.set(res?.total ?? 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.customerList.set([]);
          this.totalCustomers.set(0);
          this.isLoading.set(false);
          this.errorMessage.set('No se pudo cargar el CRM de clientes.');
        }
      });
  }

  public onSearch(value: string): void {
    this.searchTerm.set(value);
    this.loadCustomerCRM();
  }

  public openProfile(customerId: string): void {
    this.isProfileLoading.set(true);
    this.errorMessage.set(null);
    const params = new HttpParams().set('take', 10).set('skip', 0);

    this.http.get<CustomerDetailResponse>(`${environment.apiUrl}/customers/${customerId}`, { params })
      .subscribe({
        next: (profile) => {
          this.selectedCustomer.set(profile);
          this.isProfileLoading.set(false);
        },
        error: () => {
          this.selectedCustomer.set(null);
          this.isProfileLoading.set(false);
          this.errorMessage.set('No se pudo cargar el perfil del cliente.');
        }
      });
  }

  public customerName(customer: Pick<Customer, 'firstName' | 'lastName' | 'phone'>): string {
    const name = `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim();
    return name || customer.phone;
  }

  public phoneHref(phone: string): string {
    return `tel:${phone.replace(/\s+/g, '')}`;
  }

  public whatsappHref(phone: string): string {
    const normalized = phone.replace(/[^\d]/g, '');
    return `https://wa.me/${normalized}`;
  }

  public emailHref(email?: string | null): string | null {
    return email ? `mailto:${email}` : null;
  }

  private toCustomerProfile(customer: Customer): CustomerProfile {
    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email,
      allergies: [],
      notes: customer.notes,
      isVip: customer.totalReservations >= 5,
      totalReservations: customer.totalReservations,
      lastReservationAt: customer.lastReservationAt,
    };
  }
}
