import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RestaurantConfigService } from '../../core/services/restaurant-config.service';
import { RestaurantTable } from '../../core/models/restaurant.interfaces';

@Component({
  selector: 'app-tables-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './tables.component.html',
  styles: []
})
export class TablesComponent implements OnInit {
  private readonly configService = inject(RestaurantConfigService);
  private readonly fb = inject(FormBuilder);

  // Exposición limpia de estados basados en Signals globales
  public readonly zones = this.configService.zones;
  public readonly tables = this.configService.tables;

  // Signal computada para auditoría de aforo en la UI
  public readonly totalCapacity = computed(() => 
    this.tables().reduce((acc, t) => acc + (t.active ? t.capacity : 0), 0)
  );

  // Formularios reactivos fuertemente validados
  public tableForm!: FormGroup;
  public zoneForm!: FormGroup;
  private dummyRestaurantId = 'default-tenant-id';

  public ngOnInit(): void {
    this.initForms();
    this.loadPlantaData();
  }

  private initForms(): void {
    this.tableForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      capacity: [2, [Validators.required, Validators.min(1)]],
      zoneId: [null]
    });

    this.zoneForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      priority: [1, [Validators.required, Validators.min(1)]]
    });
  }

  private loadPlantaData(): void {
    this.configService.getZones(this.dummyRestaurantId).subscribe();
    this.configService.getTables(this.dummyRestaurantId).subscribe();
  }

  public getTablesByZone(zoneId: string): RestaurantTable[] {
    return this.tables().filter(t => t.zoneId === zoneId && t.active);
  }

  public onSubmitZone(): void {
    if (this.zoneForm.invalid) return;
    this.configService.createZone(this.dummyRestaurantId, this.zoneForm.value).subscribe({
      next: () => this.zoneForm.reset({ priority: 1 })
    });
  }

  public onSubmitTable(): void {
    if (this.tableForm.invalid) return;
    this.configService.createTable(this.dummyRestaurantId, this.tableForm.value).subscribe({
      next: () => this.tableForm.reset({ capacity: 2, zoneId: null })
    });
  }

  public onDeleteTable(tableId: string): void {
    if (confirm('¿Confirmas la baja de esta mesa del aforo operativo?')) {
      this.configService.deleteTable(this.dummyRestaurantId, tableId).subscribe();
    }
  }
}
