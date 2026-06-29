import { routes } from './app.routes';
import { authGuard } from './core/guards/auth.guard';
import { platformAdminGuard } from './core/guards/platform-admin.guard';

describe('app routes', () => {
  it('should keep the authenticated shell protected by authGuard', () => {
    const shellRoute = routes.find((route) => route.path === '');

    expect(shellRoute).toBeDefined();
    expect(shellRoute?.canActivate).toEqual([authGuard]);
    expect(shellRoute?.children?.some((route) => route.path === 'reservations')).toBeTrue();
    expect(shellRoute?.children?.some((route) => route.path === 'tables')).toBeTrue();
    expect(shellRoute?.children?.some((route) => route.path === 'settings')).toBeTrue();
  });

  it('should protect the platform admin route with the platform guard', () => {
    const shellRoute = routes.find((route) => route.path === '');
    const platformRoute = shellRoute?.children?.find((route) => route.path === 'platform-admin');

    expect(platformRoute).toBeDefined();
    expect(platformRoute?.canActivate).toEqual([platformAdminGuard]);
  });

  it('should send auth routes through the guest layout', () => {
    const authRoute = routes.find((route) => route.path === 'auth');

    expect(authRoute).toBeDefined();
    expect(authRoute?.loadChildren).toBeDefined();
  });
});
