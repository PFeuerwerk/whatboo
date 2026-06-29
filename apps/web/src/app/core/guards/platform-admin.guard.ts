import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

const PLATFORM_ROLES = new Set(['ADMIN', 'PLATFORM_ADMIN']);

export const platformAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.user()?.role ?? localStorage.getItem('user_role');

  if (auth.isAuthenticated() && PLATFORM_ROLES.has(String(role))) {
    return true;
  }

  return router.createUrlTree(['/reservations']);
};
