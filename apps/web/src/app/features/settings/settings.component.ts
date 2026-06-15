import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RestaurantSettings } from '../../core/models/booking-models';

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
      autoConfirm: [true],
      allowWaitlist: [true]
    });

    this.loadRestaurantSettings();
  }

  public loadRestaurantSettings(): void {
    const slug = localStorage.getItem('tenant_slug') || 'la-bella-italia';
    
    this.http.get<RestaurantSettings>(`${environment.apiUrl}/restaurants/${slug}/settings`)
      .subscribe({
        next: (res) => {
          if (res) {
            this.settingsForm.patchValue({
              slotIntervalMinutes: res.slotIntervalMinutes,
              bufferTimeMinutes: res.bufferTimeMinutes,
              defaultReservationDuration: res.defaultReservationDuration,
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

    const slug = localStorage.getItem('tenant_slug') || 'la-bella-italia';
    
    // Mapeo de tipos estrictos numéricos para satisfacer el payload de NestJS
    const body = {
      slotIntervalMinutes: Number(this.settingsForm.value.slotIntervalMinutes),
      bufferTimeMinutes: Number(this.settingsForm.value.bufferTimeMinutes),
      defaultReservationDuration: Number(this.settingsForm.value.defaultReservationDuration),
      autoConfirm: Boolean(this.settingsForm.value.autoConfirm),
      allowWaitlist: Boolean(this.settingsForm.value.allowWaitlist)
    };

    this.http.patch(`${environment.apiUrl}/restaurants/${slug}/settings`, body)
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('Las reglas de negocio se han persistido con éxito en PostgreSQL.');
          this.loadRestaurantSettings();
          
          // Desvanecer el mensaje de éxito automáticamente a los 4 segundos
          setTimeout(() => this.successMessage.set(null), 4000);
        },
        error: () => {
          this.isSaving.set(false);
        }
      });
  }
}
