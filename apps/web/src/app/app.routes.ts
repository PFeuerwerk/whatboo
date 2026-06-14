import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // ==========================================
  // RUTAS PÚBLICAS Y PERÍMETRO DE ACCESO
  // ==========================================
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },

  // ==========================================
  // PANEL ADMINISTRATIVO Y WIZARD B2B (SHELL)
  // ==========================================
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'reservations',
        pathMatch: 'full'
      },
      // Operación Diaria (Agenda y Visualización Horaria)
      {
        path: 'reservations',
        loadComponent: () => import('./features/reservations/reservations.component').then(m => m.ReservationsComponent)
      },
      // Gestión de Planta Física (Mesas y Aforos de Zonas Tetris)
      {
        path: 'tables',
        loadComponent: () => import('./features/tables/tables.component').then(m => m.TablesComponent)
      },
      // Wizard de Parámetros Comerciales (Slots, WhatsApp y Duraciones)
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      // Control de Accesos del Staff Jerárquico
      {
        path: 'users',
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent)
      }
    ]
  },

  // Fallback perimetral para rutas inválidas
  {
    path: '**',
    redirectTo: 'reservations'
  }
];
