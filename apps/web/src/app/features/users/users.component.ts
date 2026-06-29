import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateStaffUserDto, StaffUser, UpdateStaffUserDto, UserRole } from '../../core/models/restaurant.interfaces';
import { UserHttpService } from '../../core/services/user-http.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  private readonly usersApi = inject(UserHttpService);
  private readonly fb = inject(FormBuilder);

  public readonly staffList = signal<StaffUser[]>([]);
  public readonly isSaving = signal(false);
  public readonly isLoading = signal(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly successMessage = signal<string | null>(null);
  public readonly roles = [UserRole.MANAGER, UserRole.STAFF];
  public readonly activeStaffCount = computed(() => this.staffList().filter(member => member.isActive).length);
  public staffForm!: FormGroup;

  public ngOnInit(): void {
    this.staffForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      role: [UserRole.STAFF, [Validators.required]]
    });

    this.loadStaffList();
  }

  public loadStaffList(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.usersApi.getStaff().subscribe({
      next: (res) => {
        this.staffList.set(res || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('No se pudo cargar el personal del restaurante.');
      }
    });
  }

  public onCreateStaff(): void {
    if (this.staffForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const body: CreateStaffUserDto = { ...this.staffForm.getRawValue(), sendInvitation: true };

    this.usersApi.createStaff(body).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.successMessage.set('Usuario creado e invitación enviada por email.');
        this.staffForm.reset({ role: UserRole.STAFF });
        this.loadStaffList();
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: () => {
        this.isSaving.set(false);
        this.errorMessage.set('No se pudo crear el usuario. Revisa email, rol y permisos.');
      }
    });
  }

  public onToggleStatus(member: StaffUser): void {
    if (member.role === UserRole.OWNER) return;
    this.patchStaff(member.id, { isActive: !member.isActive });
  }

  public onChangeRole(member: StaffUser, role: string): void {
    if (member.role === UserRole.OWNER) return;
    this.patchStaff(member.id, { role: role as UserRole.MANAGER | UserRole.STAFF });
  }

  public roleLabel(role: UserRole): string {
    const labels: Record<string, string> = {
      [UserRole.OWNER]: 'OWNER / Titular',
      [UserRole.MANAGER]: 'MANAGER / Gerencia',
      [UserRole.STAFF]: 'STAFF / Operación',
      [UserRole.ADMIN]: 'ADMIN',
      [UserRole.PLATFORM_ADMIN]: 'PLATFORM ADMIN'
    };

    return labels[role] ?? role;
  }

  private patchStaff(userId: string, body: UpdateStaffUserDto): void {
    this.errorMessage.set(null);
    const previous = this.staffList();
    this.staffList.update(current => current.map(member =>
      member.id === userId ? { ...member, ...body } as StaffUser : member
    ));

    this.usersApi.updateStaff(userId, body).subscribe({
      next: (updated) => {
        this.staffList.update(current => current.map(member => member.id === updated.id ? updated : member));
      },
      error: () => {
        this.staffList.set(previous);
        this.errorMessage.set('No se pudo actualizar el usuario. Verifica tus permisos.');
      }
    });
  }
}
