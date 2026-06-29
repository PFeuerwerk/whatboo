import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    const routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should allow access when user is authenticated', () => {
    authService.isAuthenticated.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', () => {
    authService.isAuthenticated.and.returnValue(false);
    const urlTree = { toString: () => '/auth/login' } as unknown as ReturnType<Router['createUrlTree']>;
    router.createUrlTree.and.returnValue(urlTree as any);

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });
});
