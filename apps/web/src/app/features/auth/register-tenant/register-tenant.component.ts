import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register-tenant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-tenant.component.html',
  styleUrls: ['./register-tenant.component.css']
})
export class RegisterTenantComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  public registerForm!: FormGroup;
  public readonly isSaving = signal(false);
  public readonly generatedSlug = signal<string>('');
  public readonly errorMessage = signal<string | null>(null);

  public ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required]],
      maxCapacity: [100, [Validators.required, Validators.min(10), Validators.max(1000)]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      inviteCode: ['', [Validators.required]]
    });
  }

  public onNameChange(): void {
    const name = this.registerForm.get('name')?.value || '';
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    this.generatedSlug.set(slug);
  }

  public onRegisterTenant(): void {
    if (this.registerForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload = {
      name: this.registerForm.value.name,
      slug: this.generatedSlug(),
      maxCapacity: Number(this.registerForm.value.maxCapacity),
      ownerEmail: this.registerForm.value.email,
      ownerFirstName: this.registerForm.value.firstName,
      ownerLastName: this.registerForm.value.lastName
    };

    const headers = new HttpHeaders({
      'X-Onboarding-Token': String(this.registerForm.value.inviteCode ?? '').trim()
    });

    this.http.post<any>(`${environment.apiUrl}/auth/register-tenant`, payload, { headers })
      .subscribe({
        next: (res) => {
          this.isSaving.set(false);
          localStorage.setItem('tenant_slug', this.generatedSlug());
          if (res && res.accessToken) {
            localStorage.setItem('access_token', res.accessToken);
          }
          this.router.navigate(['/reservations']);
        },
        error: (err) => {
          this.isSaving.set(false);
          
          const serverResponse = err.error;
          let msg = 'Error en el validador perimetral.';

          if (serverResponse) {
            if (Array.isArray(serverResponse.message)) {
              msg = serverResponse.message.join(' | '); // Une los fallos de class-validator (ej: slug inválido)
            } else if (typeof serverResponse.message === 'string') {
              msg = serverResponse.message; // Captura excepciones explícitas de negocio
            }
          }

          this.errorMessage.set(msg);
        }
      });
  }
}
