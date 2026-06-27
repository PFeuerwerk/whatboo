import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService, LoginPayload } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  const mockLoginPayload: LoginPayload = {
    email: 'user@example.com',
    password: 'password123',
    restaurantSlug: 'my-restaurant',
  };

  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6Im93bmVyIiwicmVzdGF1cmFudElkIjoicmVzdC0xMjMiLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MTYyMzAzODQwMH0.signature';

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
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

  describe('login', () => {
    it('should post login request and save token on success', (done) => {
      service.login(mockLoginPayload).subscribe((response) => {
        expect(response.accessToken).toBe(mockToken);
        expect(localStorage.getItem('access_token')).toBe(mockToken);
        expect(service.isAuthenticated()).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockLoginPayload);
      req.flush({ accessToken: mockToken });
    });

    it('should set user data from token payload', (done) => {
      service.login(mockLoginPayload).subscribe(() => {
        const user = service.user();
        expect(user).toBeTruthy();
        expect(user?.email).toBe('user@example.com');
        expect(user?.role).toBe('owner');
        expect(user?.restaurantId).toBe('rest-123');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ accessToken: mockToken });
    });

    it('should handle invalid token by logging out', (done) => {
      const invalidToken = 'invalid.token.format';
      service.login(mockLoginPayload).subscribe(
        () => {
          expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
          expect(service.isAuthenticated()).toBe(false);
          done();
        },
        () => {
          // Expected error
          expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
          expect(service.isAuthenticated()).toBe(false);
          done();
        },
      );

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ accessToken: invalidToken });
    });
  });

  describe('logout', () => {
    it('should clear token and user data', () => {
      localStorage.setItem('access_token', mockToken);
      service.logout();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.user()).toBeNull();
    });

    it('should navigate to login page', () => {
      service.logout();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should clear expiry timer', (done) => {
      localStorage.setItem('access_token', mockToken);
      service['loadUserFromToken']();

      setTimeout(() => {
        service.logout();
        expect(service.isAuthenticated()).toBe(false);
        done();
      }, 100);
    });
  });

  describe('accessToken getter', () => {
    it('should return valid token from localStorage', () => {
      localStorage.setItem('access_token', mockToken);
      expect(service.accessToken).toBe(mockToken);
    });

    it('should return null if no token in localStorage', () => {
      expect(service.accessToken).toBeNull();
    });

    it('should return null if token is invalid', () => {
      localStorage.setItem('access_token', 'invalid.token');
      expect(service.accessToken).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is set', (done) => {
      service.login(mockLoginPayload).subscribe(() => {
        expect(service.isAuthenticated()).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ accessToken: mockToken });
    });

    it('should return false when user is not set', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return false after logout', (done) => {
      service.login(mockLoginPayload).subscribe(() => {
        expect(service.isAuthenticated()).toBe(true);
        service.logout();
        expect(service.isAuthenticated()).toBe(false);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ accessToken: mockToken });
    });
  });

  describe('Token validation', () => {
    it('should reject expired tokens', () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6Im93bmVyIiwicmVzdGF1cmFudElkIjoicmVzdC0xMjMiLCJleHAiOjEsImlhdCI6MTYyMzAzODQwMH0.signature';
      localStorage.setItem('access_token', expiredToken);
      expect(service.accessToken).toBeNull();
    });

    it('should validate token structure and payload', () => {
      const validToken = mockToken;
      localStorage.setItem('access_token', validToken);
      expect(service.accessToken).toBe(validToken);
    });

    it('should reject malformed tokens', () => {
      localStorage.setItem('access_token', 'not.a.valid.token.structure');
      expect(service.accessToken).toBeNull();
    });
  });

  describe('userRole getter', () => {
    it('should return user role when authenticated', (done) => {
      service.login(mockLoginPayload).subscribe(() => {
        expect(service.userRole()).toBe('owner');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ accessToken: mockToken });
    });

    it('should return null when not authenticated', () => {
      expect(service.userRole()).toBeNull();
    });
  });
});
