import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { LanguageSelectorComponent } from './language-selector.component'; // Inyección física del selector

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule, LanguageSelectorComponent], // Acoplado en el árbol Standalone
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  public form!: FormGroup; 
  public readonly isSubmitting = signal(false);
  public readonly serverError = signal<string | null>(null);

  public ngOnInit(): void {
    this.form = this.fb.group({
      restaurantSlug: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });

    // Fuerza que el arranque inicial de ngx-translate despierte siempre en Español
    this.translate.use('es');
  }

  public submit(): void {
    if (this.form.invalid || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.serverError.set(null);

    this.http.post<any>(`${environment.apiUrl}/auth/login`, this.form.value)
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          if (res && res.accessToken) {
            localStorage.setItem('access_token', res.accessToken);
            localStorage.setItem('tenant_slug', this.form.value.restaurantSlug);
            this.router.navigate(['/reservations']);
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.serverError.set(err.error?.message || 'Credenciales de acceso inválidas.');
        }
      });
  }
}
