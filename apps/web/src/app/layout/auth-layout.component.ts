import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="auth-layout-container">
      <main class="auth-main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .auth-layout-container {
      display: flex;
      min-height: 100vh;
      width: 100%;
      align-items: center;
      justify-content: center;
      background-color: #f8fafc;
      padding: 1rem;
    }
    .auth-main-content {
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
    }
    @media (max-width: 480px) {
      .auth-layout-container {
        background-color: #ffffff;
        align-items: flex-start;
        padding-top: 2rem;
      }
    }
  `]
})
export class AuthLayoutComponent {}
