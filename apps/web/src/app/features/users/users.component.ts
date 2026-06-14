import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { UserHttpService, StaffUser } from '../../core/services/user-http.service';
import { UserRole } from '../../core/models/restaurant.interfaces';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserHttpService);
  private readonly fb = inject(FormBuilder);

  public readonly staffList = signal<StaffUser[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public staffForm!: FormGroup;

  public ngOnInit(): void {
    this.initForm();
    this.loadStaffData();
  }

  private initForm(): void {
    this.staffForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['STAFF', [Validators.required]]
    });
  }

  private loadStaffData(): void {
    this.isLoading.set(true);
    this.userService.getStaff().subscribe({
      next: (data) => {
        this.staffList.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  public onSubmitStaff(): void {
    if (this.staffForm.invalid) return;
    this.isLoading.set(true);
    this.userService.createStaff(this.staffForm.value).subscribe({
      next: () => {
        this.loadStaffData();
        this.staffForm.reset({ role: 'STAFF' });
      },
      error: () => this.isLoading.set(false)
    });
  }

  public onChangeRole(userId: string, newRole: UserRole): void {
    this.userService.updateStaffRole(userId, newRole).subscribe();
  }

  public onToggleStatus(userId: string, currentStatus: boolean): void {
    this.userService.toggleStaffStatus(userId, !currentStatus).subscribe({
      next: () => this.loadStaffData()
    });
  }
}
