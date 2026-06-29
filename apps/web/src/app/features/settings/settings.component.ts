import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RestaurantConfigService } from '../../core/services/restaurant-config.service';
import { DayOfWeek, OpeningHour, RestaurantSettings } from '../../core/models/restaurant.interfaces';

const DAY_LABELS: Record<DayOfWeek, string> = {
  [DayOfWeek.MONDAY]: 'Lunes',
  [DayOfWeek.TUESDAY]: 'Martes',
  [DayOfWeek.WEDNESDAY]: 'Miércoles',
  [DayOfWeek.THURSDAY]: 'Jueves',
  [DayOfWeek.FRIDAY]: 'Viernes',
  [DayOfWeek.SATURDAY]: 'Sábado',
  [DayOfWeek.SUNDAY]: 'Domingo'
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  private readonly config = inject(RestaurantConfigService);
  private readonly fb = inject(FormBuilder);

  public settingsForm!: FormGroup;
  public readonly isSaving = signal(false);
  public readonly isLoading = signal(false);
  public readonly successMessage = signal<string | null>(null);
  public readonly errorMessage = signal<string | null>(null);

  public get openingHours(): FormArray<FormGroup> {
    return this.settingsForm.get('openingHours') as FormArray<FormGroup>;
  }

  public ngOnInit(): void {
    this.settingsForm = this.fb.group({
      slotIntervalMinutes: [30, [Validators.required]],
      bufferTimeMinutes: [15, [Validators.required, Validators.min(0)]],
      defaultReservationDuration: [90, [Validators.required, Validators.min(15)]],
      maxCapacity: [null, [Validators.min(1)]],
      autoConfirm: [true],
      allowWaitlist: [true],
      capacityRule: this.fb.group({
        maxGuestsPerReservation: [null, [Validators.min(1)]],
        maxReservationsPerSlot: [null, [Validators.min(1)]],
        slotDurationMinutes: [120, [Validators.required, Validators.min(15)]],
        bufferMinutes: [15, [Validators.required, Validators.min(0)]],
        maxDailyCapacity: [null, [Validators.min(1)]],
        overbookingAllowed: [false]
      }),
      openingHours: this.fb.array<FormGroup>([])
    });

    this.loadRestaurantSettings();
  }

  public loadRestaurantSettings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.config.getSettings().subscribe({
      next: (settings) => {
        this.patchSettings(settings);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('No se pudo cargar la configuración operativa del restaurante.');
      }
    });
  }

  public dayLabel(dayOfWeek: DayOfWeek): string {
    return DAY_LABELS[dayOfWeek] ?? String(dayOfWeek);
  }

  public onSaveSettings(): void {
    if (this.settingsForm.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const raw = this.settingsForm.getRawValue();
    const body = {
      slotIntervalMinutes: Number(raw.slotIntervalMinutes),
      bufferTimeMinutes: Number(raw.bufferTimeMinutes),
      defaultReservationDuration: Number(raw.defaultReservationDuration),
      maxCapacity: this.toNullableNumber(raw.maxCapacity),
      autoConfirm: Boolean(raw.autoConfirm),
      allowWaitlist: Boolean(raw.allowWaitlist),
      capacityRule: {
        maxGuestsPerReservation: this.toNullableNumber(raw.capacityRule.maxGuestsPerReservation),
        maxReservationsPerSlot: this.toNullableNumber(raw.capacityRule.maxReservationsPerSlot),
        slotDurationMinutes: Number(raw.capacityRule.slotDurationMinutes),
        bufferMinutes: Number(raw.capacityRule.bufferMinutes),
        maxDailyCapacity: this.toNullableNumber(raw.capacityRule.maxDailyCapacity),
        overbookingAllowed: Boolean(raw.capacityRule.overbookingAllowed),
        active: true
      },
      openingHours: raw.openingHours.map((hour: any) => ({
        dayOfWeek: hour.dayOfWeek,
        openTime: String(hour.openTime),
        closeTime: String(hour.closeTime),
        isClosed: Boolean(hour.isClosed),
        active: true
      }))
    };

    this.config.updateSettings(body).subscribe({
      next: (settings) => {
        this.patchSettings(settings);
        this.isSaving.set(false);
        this.successMessage.set('Configuración operativa guardada correctamente.');
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: () => {
        this.isSaving.set(false);
        this.errorMessage.set('No se pudo guardar la configuración. Revisa horarios, aforo y permisos.');
      }
    });
  }

  private patchSettings(settings: RestaurantSettings): void {
    this.settingsForm.patchValue({
      slotIntervalMinutes: settings.slotIntervalMinutes,
      bufferTimeMinutes: settings.bufferTimeMinutes,
      defaultReservationDuration: settings.defaultReservationDuration,
      maxCapacity: settings.maxCapacity,
      autoConfirm: settings.autoConfirm,
      allowWaitlist: settings.allowWaitlist,
      capacityRule: {
        maxGuestsPerReservation: settings.capacityRule?.maxGuestsPerReservation ?? null,
        maxReservationsPerSlot: settings.capacityRule?.maxReservationsPerSlot ?? null,
        slotDurationMinutes: settings.capacityRule?.slotDurationMinutes ?? settings.defaultReservationDuration,
        bufferMinutes: settings.capacityRule?.bufferMinutes ?? settings.bufferTimeMinutes,
        maxDailyCapacity: settings.capacityRule?.maxDailyCapacity ?? settings.maxCapacity,
        overbookingAllowed: settings.capacityRule?.overbookingAllowed ?? false
      }
    });

    this.openingHours.clear();
    for (const hour of settings.openingHours ?? this.defaultOpeningHours()) {
      this.openingHours.push(this.createOpeningHourGroup(hour));
    }
  }

  private createOpeningHourGroup(hour: OpeningHour): FormGroup {
    return this.fb.group({
      dayOfWeek: [hour.dayOfWeek, [Validators.required]],
      openTime: [hour.openTime, [Validators.required]],
      closeTime: [hour.closeTime, [Validators.required]],
      isClosed: [hour.isClosed]
    });
  }

  private defaultOpeningHours(): OpeningHour[] {
    return (Object.values(DayOfWeek) as DayOfWeek[]).map(dayOfWeek => ({
      id: '',
      restaurantId: '',
      dayOfWeek,
      openTime: '12:00',
      closeTime: '22:00',
      isClosed: false,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    }));
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return Number(value);
  }
}
