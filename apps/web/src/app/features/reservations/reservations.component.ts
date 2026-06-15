import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './reservations.component.html',
  styles: [`
    @import url('https://googleapis.com');

    :host {
      display: block;
      background-color: #f8fafc;
      min-height: 100vh;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      -webkit-font-smoothing: antialiased;
    }
    /* CONTENEDOR INTERNO COMPACTO */
    .dashboard-wrapper {
      padding: 2.5rem;
      max-width: 1200px; /* Ancho máximo estricto anti-dispersión */
      margin: 0 auto;    /* Centrado matemático en monitores grandes */
      box-sizing: border-box;
    }
    .header-block {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1.25rem;
      margin-bottom: 2rem;
    }
    .title-main {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.03em;
    }
    .subtitle-main {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0.35rem 0 0 0;
      font-weight: 500;
    }
    .filter-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 2rem;
    }
    .filter-btn {
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 0.55rem 1.25rem;
      border-radius: 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }
    .filter-btn-active {
      background-color: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    }
    .empty-state-card {
      background-color: #ffffff;
      border: 1px dashed #cbd5e1;
      padding: 4rem 2rem;
      border-radius: 1.25rem;
      text-align: center;
      max-width: 28rem;
      margin: 3rem auto 0 auto;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    }
    .empty-icon {
      font-size: 1.75rem;
      margin-bottom: 0.75rem;
    }
    .empty-title {
      font-size: 0.875rem;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 0.5rem 0;
    }
    .empty-desc {
      font-size: 0.775rem;
      color: #64748b;
      line-height: 1.5;
      margin: 0;
      font-weight: 500;
    }
  `]
})
export class ReservationsComponent implements OnInit {
  public readonly activeFilter = signal<string>('ALL');
  public ngOnInit(): void {}
}
