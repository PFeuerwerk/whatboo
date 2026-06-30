import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './integrations.component.html',
  styleUrls: ['./integrations.component.css']
})
export class IntegrationsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  public integrationsForm!: FormGroup;
  public readonly isSaving = signal(false);
  public readonly successMessage = signal<string | null>(null);

  public ngOnInit(): void {
    this.integrationsForm = this.fb.group({
      phoneNumberId: ['', [Validators.required]],
      businessAccountId: ['', [Validators.required]],
      accessToken: ['', [Validators.required]],
      appSecret: ['', [Validators.required]]
    });

    this.loadMetaSettings();
  }

  public loadMetaSettings(): void {
    this.http.get<any>(`${environment.apiUrl}/restaurants/meta-credentials`)
      .subscribe({
        next: (res) => {
          if (res) {
            this.integrationsForm.patchValue({
              phoneNumberId: res.phoneNumberId || '',
              businessAccountId: res.businessAccountId || '',
              accessToken: res.accessToken || '',
              appSecret: res.appSecret || ''
            });
          }
        }
      });
  }

  public onSaveIntegrations(): void {
    if (this.integrationsForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.successMessage.set(null);

    this.http.patch(`${environment.apiUrl}/restaurants/meta-credentials`, this.integrationsForm.value)
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('Las credenciales de Meta Graph API se han grabado con éxito en PostgreSQL.');
          this.loadMetaSettings();
          
          setTimeout(() => this.successMessage.set(null), 4000);
        },
        error: () => {
          this.isSaving.set(false);
        }
      });
  }
}
