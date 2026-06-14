import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RestaurantConfigService } from '../../core/services/restaurant-config.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit {
  private readonly configService = inject(RestaurantConfigService);
  private readonly fb = inject(FormBuilder);

  // Estados reactivos de control de interfaz de usuario
  public readonly isLoading = signal<boolean>(false);
  public settingsForm!: FormGroup;
  private dummyRestaurantId = 'default-tenant-id'; // Reemplazar por token dinámico o sesión activa

  public ngOnInit(): void {
    this.initForm();
    this.loadRestaurantSettings();
  }

  /**
   * Inicialización del formulario reactivo con validaciones perimetrales estrictas
   */
  private initForm(): void {
    this.settingsForm = this.fb.group({
      maxCapacity: [null, [Validators.required, Validators.min(1)]],
      defaultReservationDuration: [90, [Validators.required, Validators.min(1)]],
      slotIntervalMinutes: [30, [Validators.required]],
      bufferTimeMinutes: [10, [Validators.required, Validators.min(0)]],
      autoConfirm: [true],
      allowWaitlist: [true]
    });
  }

  /**
   * Carga los parámetros comerciales vigentes desde la base de datos PostgreSQL
   */
  private loadRestaurantSettings(): void {
    this.isLoading.set(true);
    this.configService.getConfiguration(this.dummyRestaurantId).subscribe({
      next: (restaurant) => {
        if (restaurant) {
          this.settingsForm.patchValue({
            maxCapacity: restaurant.maxCapacity,
            defaultReservationDuration: restaurant.defaultReservationDuration,
            slotIntervalMinutes: restaurant.slotIntervalMinutes,
            bufferTimeMinutes: restaurant.bufferTimeMinutes,
            autoConfirm: restaurant.autoConfirm,
            allowWaitlist: restaurant.allowWaitlist
          });
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  /**
   * Persiste las mutaciones globales de configuración en el Backend NestJS de forma atómica
   */
  public onSaveSettings(): void {
    if (this.settingsForm.invalid) return;

    this.isLoading.set(true);
    this.configService.updateConfiguration(this.dummyRestaurantId, this.settingsForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        alert('Configuración comercial actualizada correctamente.');
      },
      error: () => this.isLoading.set(false)
    });
  }
}
