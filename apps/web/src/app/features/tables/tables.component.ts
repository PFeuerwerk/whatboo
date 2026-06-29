import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RestaurantConfigService } from '../../core/services/restaurant-config.service';
import {
  CreateRestaurantTableDto,
  CreateRestaurantZoneDto,
  RestaurantTable,
  RestaurantZone,
  UpdateRestaurantTableDto,
  UpdateRestaurantZoneDto
} from '../../core/models/restaurant.interfaces';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.css']
})
export class TablesComponent implements OnInit {
  private readonly configService = inject(RestaurantConfigService);
  private readonly fb = inject(FormBuilder);

  public readonly zones = this.configService.zones;
  public readonly tables = this.configService.activeTables;
  public readonly isLoading = signal(false);
  public readonly isSavingTable = signal(false);
  public readonly isSavingZone = signal(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly editingTableId = signal<string | null>(null);
  public readonly editingZoneId = signal<string | null>(null);

  public readonly totalCapacity = computed(() =>
    this.tables().reduce((sum, table) => sum + Number(table.capacity || 0), 0)
  );

  public readonly tableForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
    capacity: [4, [Validators.required, Validators.min(1), Validators.max(50)]],
    zoneId: ['', [Validators.required]]
  });

  public readonly zoneForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
    priority: [1, [Validators.required, Validators.min(1), Validators.max(999)]]
  });

  public ngOnInit(): void {
    this.loadFloorPlan();
  }

  public loadFloorPlan(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.configService.loadFloorPlan().subscribe({
      next: ({ zones }) => {
        const firstZone = zones[0];
        if (firstZone && !this.tableForm.controls.zoneId.value) {
          this.tableForm.patchValue({ zoneId: firstZone.id });
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la planta del restaurante. Verificá que el backend esté activo y que el tenant exista.');
        this.isLoading.set(false);
      }
    });
  }

  public getTablesByZone(zoneId: string): RestaurantTable[] {
    return this.tables().filter(table => table.zoneId === zoneId);
  }

  public getZoneCapacity(zoneId: string): number {
    return this.getTablesByZone(zoneId).reduce((sum, table) => sum + Number(table.capacity || 0), 0);
  }

  public onCreateOrUpdateZone(): void {
    if (this.zoneForm.invalid || this.isSavingZone()) return;

    const raw = this.zoneForm.getRawValue();
    const payload: CreateRestaurantZoneDto | UpdateRestaurantZoneDto = {
      name: String(raw.name ?? '').trim(),
      priority: Number(raw.priority ?? 1)
    };

    this.isSavingZone.set(true);
    this.errorMessage.set(null);

    const editingId = this.editingZoneId();
    const request$ = editingId
      ? this.configService.updateZone(editingId, payload)
      : this.configService.createZone(payload as CreateRestaurantZoneDto);

    request$.subscribe({
      next: zone => {
        this.isSavingZone.set(false);
        this.editingZoneId.set(null);
        this.zoneForm.reset({ name: '', priority: this.getNextPriority() });
        if (!this.tableForm.controls.zoneId.value) {
          this.tableForm.patchValue({ zoneId: zone.id });
        }
      },
      error: () => {
        this.errorMessage.set('No se pudo guardar la zona. Revisá si el nombre ya existe para este restaurante.');
        this.isSavingZone.set(false);
      }
    });
  }

  public onEditZone(zone: RestaurantZone): void {
    this.editingZoneId.set(zone.id);
    this.zoneForm.patchValue({
      name: zone.name,
      priority: zone.priority
    });
  }

  public onCancelZoneEdit(): void {
    this.editingZoneId.set(null);
    this.zoneForm.reset({ name: '', priority: this.getNextPriority() });
  }

  public onDeleteZone(zone: RestaurantZone): void {
    const zoneTables = this.getTablesByZone(zone.id);
    if (zoneTables.length > 0) {
      this.errorMessage.set('No se puede desactivar una zona con mesas activas. Mové o desactivá primero sus mesas.');
      return;
    }

    this.configService.deleteZone(zone.id).subscribe({
      next: () => {
        if (this.tableForm.controls.zoneId.value === zone.id) {
          this.tableForm.patchValue({ zoneId: this.zones()[0]?.id ?? '' });
        }
      },
      error: () => this.errorMessage.set('No se pudo desactivar la zona seleccionada.')
    });
  }

  public onCreateOrUpdateTable(): void {
    if (this.tableForm.invalid || this.isSavingTable()) return;

    const raw = this.tableForm.getRawValue();
    const payload: CreateRestaurantTableDto | UpdateRestaurantTableDto = {
      name: String(raw.name ?? '').trim(),
      capacity: Number(raw.capacity ?? 1),
      zoneId: raw.zoneId || null
    };

    this.isSavingTable.set(true);
    this.errorMessage.set(null);

    const editingId = this.editingTableId();
    const request$ = editingId
      ? this.configService.updateTable(editingId, payload)
      : this.configService.createTable(payload as CreateRestaurantTableDto);

    request$.subscribe({
      next: table => {
        this.isSavingTable.set(false);
        this.editingTableId.set(null);
        this.tableForm.reset({ name: '', capacity: 4, zoneId: table.zoneId ?? this.zones()[0]?.id ?? '' });
      },
      error: () => {
        this.errorMessage.set('No se pudo guardar la mesa. Revisá si el código de mesa ya existe para este restaurante.');
        this.isSavingTable.set(false);
      }
    });
  }

  public onEditTable(table: RestaurantTable): void {
    this.editingTableId.set(table.id);
    this.tableForm.patchValue({
      name: table.name,
      capacity: table.capacity,
      zoneId: table.zoneId ?? ''
    });
  }

  public onCancelTableEdit(): void {
    this.editingTableId.set(null);
    this.tableForm.reset({ name: '', capacity: 4, zoneId: this.zones()[0]?.id ?? '' });
  }

  public onDeleteTable(table: RestaurantTable): void {
    this.configService.deleteTable(table.id).subscribe({
      error: () => this.errorMessage.set('No se pudo desactivar la mesa seleccionada.')
    });
  }

  private getNextPriority(): number {
    const priorities = this.zones().map(zone => Number(zone.priority || 0));
    return priorities.length ? Math.max(...priorities) + 1 : 1;
  }
}
