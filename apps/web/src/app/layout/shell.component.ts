import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100">
      <!-- Navbar -->
      <nav class="border-b border-slate-800 bg-slate-900/50 shadow-sm">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="flex h-16 items-center justify-between">
            <div class="flex items-center gap-8">
              <a href="/" class="text-lg font-semibold text-amber-400">Restaurant Booking</a>
              <div class="hidden space-x-1 sm:flex">
                <a
                  routerLink="/dashboard"
                  routerLinkActive="bg-slate-800"
                  [routerLinkActiveOptions]="{ exact: true }"
                  class="rounded px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60 transition"
                >
                  {{ 'NAV.DASHBOARD' | translate }}
                </a>
                <a
                  routerLink="/reservations"
                  routerLinkActive="bg-slate-800"
                  class="rounded px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60 transition"
                >
                  {{ 'NAV.RESERVATIONS' | translate }}
                </a>
                <a
                  routerLink="/customers"
                  routerLinkActive="bg-slate-800"
                  class="rounded px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60 transition"
                >
                  {{ 'NAV.CUSTOMERS' | translate }}
                </a>
              </div>
            </div>
            <div class="flex items-center gap-4" *ngIf="authService.user() as user">
              <div class="hidden text-sm text-slate-400 sm:block">
                <p class="font-medium text-slate-200">{{ user.email }}</p>
                <p class="text-xs uppercase tracking-wide">{{ user.role }}</p>
              </div>
              <button
                (click)="logout()"
                class="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
              >
                {{ 'NAV.LOGOUT' | translate }}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main content -->
      <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class ShellComponent {
  readonly authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}
