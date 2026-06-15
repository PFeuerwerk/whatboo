import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageSelectorComponent } from './language-selector.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, RouterModule, LanguageSelectorComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  public readonly translate = inject(TranslateService);

  public form!: FormGroup;
  public readonly isSubmitting = signal(false);
  public readonly serverError = signal<string | null>(null);

  public ngOnInit(): void {
    this.form = this.fb.group({
      restaurantSlug: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  public submit(): void {
    if (this.form.invalid || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.serverError.set(null);

    const payload = {
      email: this.form.value.email,
      password: this.form.value.password,
      restaurantSlug: this.form.value.restaurantSlug
    };

    // Llamada unificada enviando un único objeto DTO alineado a tu firma
    this.authService.login(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        
        // Almacenamiento seguro del rol del inquilino
        const userRole = res?.user?.role || 'OWNER';
        localStorage.setItem('user_role', userRole);
        localStorage.setItem('tenant_slug', payload.restaurantSlug);

        // Redirección exitosa hacia el panel interno B2B
        this.router.navigate(['/reservations']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.serverError.set(err.error?.message || 'Error de autenticación: Credenciales inválidas para este restaurante.');
      }
    });
  }
}
