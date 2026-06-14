import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageSelectorComponent } from './language-selector.component';

const LOCALE_KEY = 'locale';
const LOCALE_QUERY_PARAM = 'lang';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, RouterLink, LanguageSelectorComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  readonly form = new FormGroup({
    restaurantSlug: new FormControl('', { nonNullable: true, validators: Validators.required }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  readonly isSubmitting = signal(false);
  readonly serverError = signal<string | string[] | null>(null);
  readonly serverErrorRecoverable = signal(false);

  readonly restaurantSlugHintId = 'restaurant-slug-hint';
  readonly emailHintId = 'email-hint';
  readonly passwordHintId = 'password-hint';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    public readonly translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.initLanguage();
  }

  isServerErrorArray(): boolean {
    return Array.isArray(this.serverError());
  }

  get serverErrorValue(): string | string[] | null { return this.serverError(); }
  get serverErrorArray(): string[] | null {
    const v = this.serverError();
    return Array.isArray(v) ? (v as string[]) : null;
  }

  get restaurantSlug() { return this.form.get('restaurantSlug')!; }
  get email() { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  setLanguage(language: 'en' | 'es'): void {
    localStorage.setItem(LOCALE_KEY, language);
    this.translate.use(language);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [LOCALE_QUERY_PARAM]: language },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private initLanguage(): void {
    const urlLang = this.route.snapshot.queryParamMap.get(LOCALE_QUERY_PARAM);
    const storedLang = localStorage.getItem(LOCALE_KEY);
    const defaultLang = urlLang || storedLang || 'es';
    
    this.translate.setDefaultLang('es');
    this.translate.use(defaultLang);
    if (!storedLang) {
      localStorage.setItem(LOCALE_KEY, defaultLang);
    }
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverError.set(null);
    this.serverErrorRecoverable.set(false);
    this.isSubmitting.set(true);

    this.authService
      .login(this.form.getRawValue())
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        catchError((error: HttpErrorResponse) => {
          this.serverErrorRecoverable.set(error?.status >= 500 || error?.status === 401);
          this.handleErrors(error);
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (result?.accessToken) {
          this.router.navigate(['/dashboard']);
        }
      });
  }

  private handleErrors(error: HttpErrorResponse): void {
    if (error?.status === 400) {
      const msg = error.error?.message;
      this.serverError.set(Array.isArray(msg) ? msg : msg || this.translate.instant('AUTH.VALIDATION_ERROR'));
    } else if (error?.status === 401) {
      const msg = error.error?.message;
      this.serverError.set(typeof msg === 'string' && msg !== 'Invalid credentials' ? msg : this.translate.instant('AUTH.INVALID_CREDENTIALS'));
    } else {
      const msg = error.error?.message;
      this.serverError.set(typeof msg === 'string' ? msg : this.translate.instant('AUTH.LOGIN_GENERIC_ERROR'));
    }
  }
}
