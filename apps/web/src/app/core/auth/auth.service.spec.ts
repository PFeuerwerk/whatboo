import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService, LoginPayload } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  const payload: LoginPayload = {
    email: 'owner@whatboo.test',
    password: 'Password123!',
    restaurantSlug: 'la-bella-italia',
  };

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('posts login with tenant header and stores backend session contract', (done) => {
    service.login(payload).subscribe((response) => {
      expect(response.accessToken).toBe('token');
      expect(localStorage.getItem('access_token')).toBe('token');
      expect(localStorage.getItem('user_role')).toBe('OWNER');
      expect(localStorage.getItem('tenant_slug')).toBe('la-bella-italia');
      expect(service.user()?.email).toBe(payload.email);
      expect(service.isAuthenticated()).toBeTrue();
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-Tenant-Slug')).toBe(payload.restaurantSlug);
    expect(req.request.body).toEqual({
      email: payload.email,
      password: payload.password,
      restaurantSlug: payload.restaurantSlug,
    });

    req.flush({
      accessToken: 'token',
      user: {
        id: 'user-1',
        email: payload.email,
        role: 'OWNER',
        firstName: 'Owner',
        lastName: 'Demo',
        restaurantId: 'restaurant-1',
        restaurantSlug: payload.restaurantSlug,
      },
    });
  });

  it('falls back to OWNER role when backend user payload is absent', (done) => {
    service.login(payload).subscribe(() => {
      expect(localStorage.getItem('user_role')).toBe('OWNER');
      expect(service.user()?.role).toBe('OWNER');
      done();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({ accessToken: 'token' });
  });

  it('reports authentication based on local access token', () => {
    expect(service.isAuthenticated()).toBeFalse();
    localStorage.setItem('access_token', 'token');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('clears session state on logout', () => {
    localStorage.setItem('access_token', 'token');
    localStorage.setItem('user_role', 'OWNER');
    localStorage.setItem('tenant_slug', 'la-bella-italia');

    service.logout();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('user_role')).toBeNull();
    expect(localStorage.getItem('tenant_slug')).toBeNull();
    expect(service.user()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
