import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  isActive: boolean;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  public readonly staffList = signal<StaffMember[]>([]);
  public readonly isSaving = signal(false);
  public staffForm!: FormGroup;

  public ngOnInit(): void {
    this.staffForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      role: ['STAFF', [Validators.required]]
    });

    this.loadStaffList();
  }

  public loadStaffList(): void {
    const slug = localStorage.getItem('tenant_slug') || 'la-bella-italia';
    this.http.get<StaffMember[]>(`${environment.apiUrl}/restaurants/${slug}/staff`)
      .subscribe(res => {
        this.staffList.set(res);
      });
  }

  public onCreateStaff(): void {
    if (this.staffForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const slug = localStorage.getItem('tenant_slug') || 'la-bella-italia';
    
    // Contrato alineado al DTO de creación del Backend
    const body = {
      ...this.staffForm.value,
      password: 'TemporaryPass123!' // Contraseña temporal genérica requerida por el modelo de datos
    };

    this.http.post(`${environment.apiUrl}/restaurants/${slug}/staff`, body)
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.staffForm.reset({ role: 'STAFF' });
          this.loadStaffList(); // Actualización reactiva inmediata
        },
        error: () => {
          this.isSaving.set(false);
        }
      });
  }
}
