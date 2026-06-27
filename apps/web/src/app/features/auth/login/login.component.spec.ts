import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let translateService: jasmine.SpyObj<TranslateService>;
  let activatedRoute: jasmine.SpyObj<ActivatedRoute>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
      'use',
    ]);
    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [''], {
      queryParams: of({}),
    });

    TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        ReactiveFormsModule,
        HttpClientTestingModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
    activatedRoute = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;

    translateService.instant.and.callFake((key: string) => key);
    fixture.detectChanges();
  });

  describe('form validation', () => {
    it('should initialize form with empty controls', () => {
      expect(component.form.get('restaurantSlug')?.value).toBe('');
      expect(component.form.get('email')?.value).toBe('');
      expect(component.form.get('password')?.value).toBe('');
    });

    it('should mark form as invalid when empty', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('should validate restaurantSlug as required', () => {
      const control = component.form.get('restaurantSlug');
      control?.setValue('');
      expect(control?.hasError('required')).toBe(true);

      control?.setValue('my-restaurant');
      expect(control?.hasError('required')).toBe(false);
    });

    it('should validate email as required and valid format', () => {
      const control = component.form.get('email');
      control?.setValue('');
      expect(control?.hasError('required')).toBe(true);

      control?.setValue('invalid-email');
      expect(control?.hasError('email')).toBe(true);

      control?.setValue('user@example.com');
      expect(control?.invalid).toBe(false);
    });

    it('should validate password as required and minimum length', () => {
      const control = component.form.get('password');
      control?.setValue('');
      expect(control?.hasError('required')).toBe(true);

      control?.setValue('short');
      expect(control?.hasError('minlength')).toBe(true);

      control?.setValue('validpassword123');
      expect(control?.invalid).toBe(false);
    });

    it('should enable submit button when form is valid', () => {
      component.form.patchValue({
        restaurantSlug: 'my-restaurant',
        email: 'user@example.com',
        password: 'password123',
      });

      expect(component.form.valid).toBe(true);
    });
  });

  describe('login submission', () => {
    beforeEach(() => {
      component.form.patchValue({
        restaurantSlug: 'my-restaurant',
        email: 'user@example.com',
        password: 'password123',
      });
    });

    it('should call authService.login with form values', (done) => {
      authService.login.and.returnValue(of({ accessToken: 'token' }));

      component.submit();

      setTimeout(() => {
        expect(authService.login).toHaveBeenCalledWith({
          restaurantSlug: 'my-restaurant',
          email: 'user@example.com',
          password: 'password123',
        });
        done();
      }, 0);
    });

    it('should navigate to dashboard on successful login', (done) => {
      authService.login.and.returnValue(of({ accessToken: 'token' }));

      component.submit();

      setTimeout(() => {
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
        done();
      }, 0);
    });

    it('should set isSubmitting signal during request', (done) => {
      authService.login.and.returnValue(of({ accessToken: 'token' }));

      expect(component.isSubmitting()).toBe(false);
      component.submit();
      expect(component.isSubmitting()).toBe(true);

      setTimeout(() => {
        expect(component.isSubmitting()).toBe(false);
        done();
      }, 0);
    });

    it('should not submit if form is invalid', () => {
      component.form.patchValue({
        email: 'invalid-email',
      });

      component.submit();

      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched if form is invalid', () => {
      component.form.patchValue({
        email: 'invalid-email',
      });

      component.submit();

      expect(component.form.touched).toBe(true);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      component.form.patchValue({
        restaurantSlug: 'my-restaurant',
        email: 'user@example.com',
        password: 'password123',
      });
    });

    it('should handle 400 validation errors with string message', (done) => {
      const error = new ErrorEvent('400', {
        message: 'Invalid restaurant slug',
      });
      authService.login.and.returnValue(
        throwError(() => ({
          status: 400,
          error: { message: 'Invalid restaurant slug' },
        })),
      );

      component.submit();

      setTimeout(() => {
        expect(component.serverError()).toBe('Invalid restaurant slug');
        done();
      }, 0);
    });

    it('should handle 400 validation errors with array message', (done) => {
      const errors = ['Email is required', 'Password is invalid'];
      authService.login.and.returnValue(
        throwError(() => ({
          status: 400,
          error: { message: errors },
        })),
      );

      component.submit();

      setTimeout(() => {
        expect(component.serverError()).toEqual(errors);
        done();
      }, 0);
    });

    it('should handle 401 authentication errors', (done) => {
      authService.login.and.returnValue(
        throwError(() => ({
          status: 401,
          error: { message: 'Account is temporarily locked' },
        })),
      );
      translateService.instant.and.returnValue('AUTH.INVALID_CREDENTIALS');

      component.submit();

      setTimeout(() => {
        expect(component.serverError()).toBe('Account is temporarily locked');
        done();
      }, 0);
    });

    it('should handle 401 with default message', (done) => {
      authService.login.and.returnValue(
        throwError(() => ({
          status: 401,
          error: { message: 'Invalid credentials' },
        })),
      );
      translateService.instant.and.returnValue('AUTH.INVALID_CREDENTIALS');

      component.submit();

      setTimeout(() => {
        expect(component.serverError()).toBe('AUTH.INVALID_CREDENTIALS');
        done();
      }, 0);
    });

    it('should handle generic server errors', (done) => {
      authService.login.and.returnValue(
        throwError(() => ({
          status: 500,
          error: { message: 'Internal server error' },
        })),
      );

      component.submit();

      setTimeout(() => {
        expect(component.serverError()).toBe('Internal server error');
        done();
      }, 0);
    });

    it('should clear previous errors on new submission', (done) => {
      component.serverError.set('Previous error');
      component.serverErrorRecoverable.set(true);

      authService.login.and.returnValue(of({ accessToken: 'token' }));

      component.submit();

      setTimeout(() => {
        expect(component.serverError()).toBeNull();
        expect(component.serverErrorRecoverable()).toBeFalse();
        done();
      }, 0);
    });

    it('should mark 401 and 500 errors as recoverable', (done) => {
      authService.login.and.returnValue(
        throwError(() => ({
          status: 500,
          error: { message: 'Internal server error' },
        })),
      );

      component.submit();

      setTimeout(() => {
        expect(component.serverErrorRecoverable()).toBeTrue();
        done();
      }, 0);
    });
  });

  describe('language selection', () => {
    it('should set language and update localStorage', () => {
      spyOn(localStorage, 'setItem');
      component.setLanguage('es');

      expect(localStorage.setItem).toHaveBeenCalledWith('locale', 'es');
      expect(translateService.use).toHaveBeenCalledWith('es');
    });

    it('should update URL with language parameter', () => {
      component.setLanguage('en');

      expect(router.navigate).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({
          queryParams: { lang: 'en' },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        }),
      );
    });

    it('should expose ids for aria-describedby wiring', () => {
      expect(component.restaurantSlugHintId).toBe('restaurant-slug-hint');
      expect(component.emailHintId).toBe('email-hint');
      expect(component.passwordHintId).toBe('password-hint');
    });
  });

  describe('getters', () => {
    it('should return restaurantSlug control', () => {
      expect(component.restaurantSlug).toBe(component.form.get('restaurantSlug'));
    });

    it('should return email control', () => {
      expect(component.email).toBe(component.form.get('email'));
    });

    it('should return password control', () => {
      expect(component.password).toBe(component.form.get('password'));
    });

    it('should return serverErrorValue signal', () => {
      component.serverError.set('Test error');
      expect(component.serverErrorValue).toBe('Test error');
    });

    it('should return serverErrorArray when error is an array', () => {
      const errors = ['Error 1', 'Error 2'];
      component.serverError.set(errors);
      expect(component.serverErrorArray).toEqual(errors);
    });

    it('should return null for serverErrorArray when error is not an array', () => {
      component.serverError.set('Single error');
      expect(component.serverErrorArray).toBeNull();
    });
  });

  describe('isServerErrorArray method', () => {
    it('should return true when error is an array', () => {
      component.serverError.set(['Error 1', 'Error 2']);
      expect(component.isServerErrorArray()).toBe(true);
    });

    it('should return false when error is a string', () => {
      component.serverError.set('Single error');
      expect(component.isServerErrorArray()).toBe(false);
    });

    it('should return false when error is null', () => {
      component.serverError.set(null);
      expect(component.isServerErrorArray()).toBe(false);
    });
  });

  describe('recovery helpers', () => {
    it('should default recoverable error state to false', () => {
      expect(component.serverErrorRecoverable()).toBe(false);
    });
  });
});
