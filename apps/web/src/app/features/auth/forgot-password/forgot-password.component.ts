import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly forgotForm = this.fb.nonNullable.group({
    restaurantSlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    const restaurantSlug = query.get('restaurantSlug') ?? localStorage.getItem('tenant_slug') ?? '';
    const email = query.get('email') ?? '';

    this.forgotForm.patchValue({
      restaurantSlug: restaurantSlug.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
    });
  }

  onSubmit(): void {
    if (this.forgotForm.invalid || this.isLoading()) {
      this.forgotForm.markAllAsTouched();
      this.focusFirstError();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      restaurantSlug: this.forgotForm.controls.restaurantSlug.value.trim().toLowerCase(),
      email: this.forgotForm.controls.email.value.trim().toLowerCase(),
    };

    this.authService.requestPasswordReset(payload).subscribe({
      next: () => {
        localStorage.setItem('tenant_slug', payload.restaurantSlug);
        this.isLoading.set(false);
        this.successMessage.set('Si el correo coincide con un usuario del restaurante, enviaremos un enlace de recuperación. Revisa Mailpit o tu bandeja de entrada.');
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (error.status === 0) {
          this.errorMessage.set('No se pudo conectar con el servidor. Verifica que la API esté encendida.');
          return;
        }
        this.errorMessage.set(error.error?.message || 'No se pudo solicitar el enlace. Inténtalo de nuevo en unos minutos.');
      }
    });
  }

  private focusFirstError(): void {
    const firstInvalidControl = document.querySelector<HTMLInputElement>('input.ng-invalid');
    firstInvalidControl?.focus();
  }
}
