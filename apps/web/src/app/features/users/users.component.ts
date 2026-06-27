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
  role: 'OWNER' | 'MANAGER' | 'MAITRE' | 'STAFF';
  shift: 'LUNCH' | 'DINNER' | 'FULL_TIME';
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
      role: ['STAFF', [Validators.required]],
      shift: ['FULL_TIME', [Validators.required]]
    });

    this.loadStaffList();
  }

  public loadStaffList(): void {
    // SANEADO MULTI-TENANT: Consumir la coleccion directa amparada por el TenantInterceptor
    this.http.get<StaffMember[]>(`${environment.apiUrl}/restaurants/staff`)
      .subscribe({
        next: (res) => {
          this.staffList.set(res || []);
        },
        error: () => {
          // Fallback defensivo inicial para evitar pantallas rotas en onboarding
          this.staffList.set([
            { id: 'o1', firstName: 'Propietario', lastName: 'Titular', email: 'owner@whatboo.com', role: 'OWNER', shift: 'FULL_TIME', isActive: true }
          ]);
        }
      });
  }

  public onCreateStaff(): void {
    if (this.staffForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const body = {
      ...this.staffForm.value,
      password: 'TemporaryPass123!'
    };

    this.http.post(`${environment.apiUrl}/restaurants/staff`, body)
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.staffForm.reset({ role: 'STAFF', shift: 'FULL_TIME' });
          this.loadStaffList();
        },
        error: () => {
          this.isSaving.set(false);
        }
      });
  }

  public onToggleStatus(userId: string, nextStatus: boolean): void {
    const slug = localStorage.getItem('tenant_slug') || 'la-bella-italia';
    this.http.patch(`${environment.apiUrl}/restaurants/${slug}/staff/${userId}`, { isActive: nextStatus })
      .subscribe({
        next: () => {
          this.loadStaffList();
        }
      });
  }
}
