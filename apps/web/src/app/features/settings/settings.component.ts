import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  public settingsForm!: FormGroup;
  public readonly isSaving = signal(false);
  public readonly successMessage = signal<string | null>(null);

  public ngOnInit(): void {
    this.settingsForm = this.fb.group({
      slotIntervalMinutes: [30, [Validators.required]],
      bufferTimeMinutes: [15, [Validators.required, Validators.min(0)]],
      defaultReservationDuration: [90, [Validators.required, Validators.min(15)]],
      closingHourLimit: ['03:00', [Validators.required]],
      autoConfirm: [true],
      allowWaitlist: [true]
    });

    this.loadRestaurantSettings();
  }

  public loadRestaurantSettings(): void {
    // SANEADO MULTI-TENANT: Consumir la ruta parametrizada atómica directa por sesión
    this.http.get<any>(`${environment.apiUrl}/restaurants/settings`)
      .subscribe({
        next: (res) => {
          if (res) {
            this.settingsForm.patchValue({
              slotIntervalMinutes: res.slotIntervalMinutes,
              bufferTimeMinutes: res.bufferTimeMinutes,
              defaultReservationDuration: res.defaultReservationDuration,
              closingHourLimit: res.closingHourLimit || '03:00',
              autoConfirm: res.autoConfirm,
              allowWaitlist: res.allowWaitlist
            });
          }
        }
      });
  }

  public onSaveSettings(): void {
    if (this.settingsForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.successMessage.set(null);

    const body = {
      slotIntervalMinutes: Number(this.settingsForm.value.slotIntervalMinutes),
      bufferTimeMinutes: Number(this.settingsForm.value.bufferTimeMinutes),
      defaultReservationDuration: Number(this.settingsForm.value.defaultReservationDuration),
      closingHourLimit: String(this.settingsForm.value.closingHourLimit),
      autoConfirm: Boolean(this.settingsForm.value.autoConfirm),
      allowWaitlist: Boolean(this.settingsForm.value.allowWaitlist)
    };

    this.http.patch(`${environment.apiUrl}/restaurants/settings`, body)
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('Los parámetros horarios personalizados se han guardado con éxito.');
          this.loadRestaurantSettings();
          setTimeout(() => this.successMessage.set(null), 4000);
        },
        error: () => {
          this.isSaving.set(false);
        }
      });
  }
}
