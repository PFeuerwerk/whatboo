import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth-shell.component').then(m => m.AuthShellComponent),
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: 'reservations',
        loadComponent: () => import('./features/reservations/reservations.component').then(m => m.ReservationsComponent)
      },
      {
        path: 'tables',
        loadComponent: () => import('./features/tables/tables.component').then(m => m.TablesComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      // INYECCIÓN DE RUTA: Carga en caliente del Módulo de Reportes Analíticos de Ocupación
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: '',
        redirectTo: 'reservations',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'reservations'
  }
];
