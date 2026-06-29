import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Customer } from '../../core/models/restaurant.interfaces';

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
  public readonly searchTerm = signal('');

  public ngOnInit(): void {
    this.loadCustomerCRM();
  }

  public loadCustomerCRM(): void {
    const q = this.searchTerm().trim();
    const params = q ? new HttpParams().set('q', q) : undefined;

    this.http.get<CustomerListResponse>(`${environment.apiUrl}/customers`, { params })
      .subscribe({
        next: (res) => {
          this.customerList.set((res?.data ?? []).map(customer => this.toCustomerProfile(customer)));
        },
        error: () => {
          this.customerList.set([]);
        }
      });
  }

  public onSearch(value: string): void {
    this.searchTerm.set(value);
    this.loadCustomerCRM();
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
