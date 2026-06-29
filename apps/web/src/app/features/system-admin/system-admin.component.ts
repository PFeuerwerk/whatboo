import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PlatformAdminService } from '../../core/services/platform-admin.service';
import { RestaurantStatus } from '../../core/models/restaurant.interfaces';
import {
  PlatformDashboard,
  PlatformObservability,
  PlatformRestaurantDetail,
  PlatformRestaurantListItem,
  PlatformUser,
} from '../../core/models/platform-admin.interfaces';

@Component({
  selector: 'app-system-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-admin.component.html',
  styleUrls: ['./system-admin.component.css'],
})
export class SystemAdminComponent implements OnInit {
  private readonly platformAdminService = inject(PlatformAdminService);

  public readonly dashboard = signal<PlatformDashboard | null>(null);
  public readonly restaurants = signal<PlatformRestaurantListItem[]>([]);
  public readonly selectedRestaurant = signal<PlatformRestaurantDetail | null>(null);
  public readonly platformUsers = signal<PlatformUser[]>([]);
  public readonly observability = signal<PlatformObservability | null>(null);
  public readonly isLoading = signal(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly searchTerm = signal('');
  public readonly statusFilter = signal<RestaurantStatus | 'ALL'>('ALL');
  public readonly RestaurantStatus = RestaurantStatus;

  public readonly activeTenantCount = computed(
    () => this.dashboard()?.totals.restaurantsActive ?? 0,
  );

  public ngOnInit(): void {
    this.loadPlatformAdmin();
  }

  public loadPlatformAdmin(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      dashboard: this.platformAdminService.getDashboard(),
      restaurants: this.platformAdminService.getRestaurants({
        q: this.searchTerm(),
        status: this.statusFilter(),
      }),
      users: this.platformAdminService.getUsers(),
      observability: this.platformAdminService.getObservability(),
    }).subscribe({
      next: ({ dashboard, restaurants, users, observability }) => {
        this.dashboard.set(dashboard);
        this.restaurants.set(restaurants.data ?? []);
        this.platformUsers.set(users ?? []);
        this.observability.set(observability);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el panel platform/admin.');
        this.isLoading.set(false);
      },
    });
  }

  public onSearch(value: string): void {
    this.searchTerm.set(value);
    this.loadPlatformAdmin();
  }

  public onStatusFilter(value: string): void {
    this.statusFilter.set(value as RestaurantStatus | 'ALL');
    this.loadPlatformAdmin();
  }

  public viewRestaurant(restaurant: PlatformRestaurantListItem): void {
    this.platformAdminService.getRestaurant(restaurant.id).subscribe({
      next: detail => this.selectedRestaurant.set(detail),
      error: () => this.errorMessage.set('No se pudo cargar el detalle del tenant.'),
    });
  }

  public updateTenantStatus(restaurant: PlatformRestaurantListItem, status: RestaurantStatus): void {
    this.platformAdminService.updateRestaurantStatus(restaurant.id, status).subscribe({
      next: updated => {
        this.restaurants.update(current =>
          current.map(item => item.id === updated.id ? updated : item),
        );
        if (this.selectedRestaurant()?.id === updated.id) {
          this.viewRestaurant(updated);
        }
        this.loadPlatformAdmin();
      },
      error: () => this.errorMessage.set('No se pudo actualizar el estado del tenant.'),
    });
  }

  public saveBasicTenantData(): void {
    const current = this.selectedRestaurant();
    if (!current) return;

    this.platformAdminService.updateRestaurant(current.id, {
      name: current.name,
      legalName: current.legalName,
      email: current.email,
      phone: current.phone,
      city: current.city,
      country: current.country,
      timezone: current.timezone,
      currency: current.currency,
      locale: current.locale,
      maxCapacity: current.maxCapacity,
      status: current.status,
    }).subscribe({
      next: updated => {
        this.restaurants.update(items => items.map(item => item.id === updated.id ? updated : item));
        this.viewRestaurant(updated);
      },
      error: () => this.errorMessage.set('No se pudieron guardar los datos basicos del tenant.'),
    });
  }

  public statusClass(status: RestaurantStatus | string): string {
    return `status-${String(status).toLowerCase()}`;
  }
}
