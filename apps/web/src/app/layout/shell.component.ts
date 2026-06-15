import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'] // Enlace inmutable hacia la capa CSS externa
})
export class ShellComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public readonly userRole = signal<string>('OWNER');
  public readonly userEmail = signal<string>('viras_user@labellaitaliatest.com');

  public ngOnInit(): void {
    const sessionRole = localStorage.getItem('user_role') || 'OWNER';
    this.userRole.set(sessionRole);
    
    const sessionUser = this.authService.user();
    if (sessionUser?.email) {
      this.userEmail.set(sessionUser.email);
    }
  }

  public onLogout(): void {
    this.authService.logout();
  }
}
