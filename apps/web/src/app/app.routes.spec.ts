import { routes } from './app.routes';
import { authGuard } from './core/guards/auth.guard';

describe('app routes', () => {
  it('should keep the authenticated shell protected by authGuard', () => {
    const shellRoute = routes.find((route) => route.path === '');

    expect(shellRoute).toBeDefined();
    expect(shellRoute?.canActivate).toEqual([authGuard]);
    expect(shellRoute?.children?.some((route) => route.path === 'dashboard')).toBeTrue();
    expect(shellRoute?.children?.some((route) => route.path === 'reservations')).toBeTrue();
  });

  it('should send auth routes through the guest layout', () => {
    const authRoute = routes.find((route) => route.path === 'auth');

    expect(authRoute).toBeDefined();
    expect(authRoute?.loadChildren).toBeDefined();
  });
});