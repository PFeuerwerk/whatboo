import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, RouterLink],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  form = new FormGroup({
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  }, {
    validators: (control) => {
      const password = control.get('newPassword')?.value;
      const confirm = control.get('confirmPassword')?.value;
      return password === confirm ? null : { passwordMismatch: true };
    }
  });

  readonly isSubmitting = signal(false);
  readonly isSuccess = signal(false);
  readonly backendError = signal<string | null>(null);
  
  private token: string | null = null;
  readonly passwordHintId = 'new-password-hint';
  readonly confirmPasswordHintId = 'confirm-password-hint';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    public readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    // Capturar el token criptográfico enviado desde NestJS en la URL (?token=XYZ)
    this.token = this.route.snapshot.queryParamMap.get('token');
    
    if (!this.token) {
      this.backendError.set(this.translate.instant('AUTH.RESET_ERROR_NO_TOKEN'));
      this.form.disable();
    }
  }

  get newPassword() { return this.form.get('newPassword')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  submit(): void {
    if (this.form.invalid || this.isSubmitting() || !this.token) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.backendError.set(null);

    const payload = {
      token: this.token,
      newPassword: this.form.controls.newPassword.value
    };

    this.authService.resetPassword(payload)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 400) {
            this.backendError.set(error.error?.message || this.translate.instant('AUTH.RESET_ERROR_EXPIRED'));
          } else if (error.status === 0) {
            this.backendError.set(this.translate.instant('AUTH.ERROR_NETWORK'));
          } else {
            this.backendError.set(this.translate.instant('AUTH.LOGIN_GENERIC_ERROR'));
          }
          return of(null);
        }),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe((response) => {
          if (response) {
            this.isSuccess.set(true);
            this.form.disable();
            setTimeout(() => {
              this.router.navigate(["/auth/login"]);
            }, 3000);
          }
      });
  }
}
