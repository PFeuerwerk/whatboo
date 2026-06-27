import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.css']
})
export class TablesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  public readonly zones = signal<any[]>([]);
  public readonly tables = signal<any[]>([]);
  public readonly isSaving = signal(false);
  public tableForm!: FormGroup;

  public ngOnInit(): void {
    this.tableForm = this.fb.group({
      name: ['', [Validators.required]],
      capacity: [4, [Validators.required, Validators.min(1)]],
      zoneId: ['', [Validators.required]]
    });

    this.loadFloorPlan();
  }

  public loadFloorPlan(): void {
    // 1. Cargar las zonas operativas ligadas de forma invisible a la sesión (Fase A)
    this.http.get<any[]>(`${environment.apiUrl}/restaurants/zones`)
      .subscribe(res => {
        this.zones.set(res || []);
        if (res && res.length > 0 && !this.tableForm.get('zoneId')?.value) {
          this.tableForm.patchValue({ zoneId: res[0].id });
        }
      });

    // 2. Cargar las mesas operativas ligadas de forma invisible a la sesión (Fase A)
    this.http.get<any[]>(`${environment.apiUrl}/restaurants/tables`)
      .subscribe(res => {
        this.tables.set(res || []);
      });
  }

  /**
   * SANEADO CRÍTICO: Filtra el inventario de mesas en base a su zona física
   * Requisito mandatorio de la directiva @for de tables.component.html:44
   */
  public getTablesByZone(zoneId: string): any[] {
    return this.tables().filter(table => table.zoneId === zoneId);
  }

  public onCreateTable(): void {
    if (this.tableForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    this.http.post(`${environment.apiUrl}/restaurants/tables`, this.tableForm.value)
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          const currentZone = this.tableForm.value.zoneId;
          this.tableForm.reset({ capacity: 4, zoneId: currentZone });
          this.loadFloorPlan(); // Recarga reactiva en caliente de PostgreSQL
        },
        error: () => {
          this.isSaving.set(false);
        }
      });
  }
}
