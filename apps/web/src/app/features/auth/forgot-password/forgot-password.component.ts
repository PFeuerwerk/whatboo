import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotForm!: FormGroup;
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.forgotForm = this.fb.group({
      restaurantSlug: [localStorage.getItem('tenant_slug') ?? '', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      this.focusFirstError();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const payload = {
      restaurantSlug: String(this.forgotForm.value.restaurantSlug ?? '').trim(),
      email: String(this.forgotForm.value.email ?? '').trim().toLowerCase(),
    };

    this.authService.requestPasswordReset(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Si el correo coincide con un restaurante registrado, enviaremos un enlace de recuperacion.';
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        if (error.status === 0) {
          this.errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexion a internet.';
        } else {
          this.errorMessage = error.error?.message || 'Ocurrio un error inesperado. Intentalo mas tarde.';
        }
      }
    });
  }

  private focusFirstError(): void {
    const firstInvalidControl: HTMLElement | null = document.querySelector('input.ng-invalid');
    if (firstInvalidControl) {
      firstInvalidControl.focus();
    }
  }
}