import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Zone, Table } from '../../core/models/booking-models';

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

  public readonly zones = signal<Zone[]>([]);
  public readonly tables = signal<Table[]>([]);
  public tableForm!: FormGroup;

  public ngOnInit(): void {
    this.tableForm = this.fb.group({
      name: ['', [Validators.required]],
      capacity: [4, [Validators.required, Validators.min(1)]],
      zoneId: ['', [Validators.required]]
    });

    this.loadPlantaData();
  }

  public loadPlantaData(): void {
    const slug = localStorage.getItem('tenant_slug') || 'la-bella-italia';
    
    // 1. Obtener zonas físicas del restaurante
    this.http.get<Zone[]>(`${environment.apiUrl}/restaurants/${slug}/zones`).subscribe(res => {
      this.zones.set(res);
      if (res.length > 0) {
        this.tableForm.patchValue({ zoneId: res[0].id });
      }
    });

    // 2. Obtener inventario de mesas operativas
    this.http.get<Table[]>(`${environment.apiUrl}/restaurants/${slug}/tables`).subscribe(res => {
      this.tables.set(res);
    });
  }

  public getTablesByZone(zoneId: string): Table[] {
    return this.tables().filter(t => t.zoneId === zoneId);
  }

  public onCreateTable(): void {
    if (this.tableForm.invalid) return;
    const slug = localStorage.getItem('tenant_slug') || 'la-bella-italia';

    this.http.post(`${environment.apiUrl}/restaurants/${slug}/tables`, this.tableForm.value)
      .subscribe(() => {
        this.tableForm.get('name')?.reset();
        this.loadPlantaData(); // Recarga reactiva en caliente desde PostgreSQL
      });
  }
}
