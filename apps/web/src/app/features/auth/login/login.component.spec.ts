import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        HttpClientTestingModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('initializes the tenant login form', () => {
    expect(component.form.get('restaurantSlug')?.value).toBe('');
    expect(component.form.get('email')?.value).toBe('');
    expect(component.form.get('password')?.value).toBe('');
    expect(component.form.invalid).toBeTrue();
  });

  it('validates required login fields', () => {
    component.form.patchValue({
      restaurantSlug: 'la-bella-italia',
      email: 'owner@whatboo.test',
      password: 'Password123!',
    });

    expect(component.form.valid).toBeTrue();
  });

  it('posts login, stores token and redirects to reservations', () => {
    component.form.patchValue({
      restaurantSlug: 'la-bella-italia',
      email: 'owner@whatboo.test',
      password: 'Password123!',
    });

    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(component.form.value);

    req.flush({ accessToken: 'token' });

    expect(localStorage.getItem('access_token')).toBe('token');
    expect(localStorage.getItem('tenant_slug')).toBe('la-bella-italia');
    expect(router.navigate).toHaveBeenCalledWith(['/reservations']);
    expect(component.isSubmitting()).toBeFalse();
  });

  it('does not submit invalid form', () => {
    component.submit();
    httpMock.expectNone(`${environment.apiUrl}/auth/login`);
    expect(component.isSubmitting()).toBeFalse();
  });

  it('shows backend error message', () => {
    component.form.patchValue({
      restaurantSlug: 'la-bella-italia',
      email: 'owner@whatboo.test',
      password: 'Password123!',
    });

    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({ message: 'Credenciales invalidas' }, { status: 401, statusText: 'Unauthorized' });

    expect(component.serverError()).toBe('Credenciales invalidas');
    expect(component.isSubmitting()).toBeFalse();
  });
});
