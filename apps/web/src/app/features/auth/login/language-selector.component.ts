import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="lang-selector-container">
      <button 
        type="button" 
        (click)="switchLanguage('es')" 
        [class.active-lang]="currentLang() === 'es'"
        class="lang-btn">
        ES
      </button>
      <span class="lang-divider">|</span>
      <button 
        type="button" 
        (click)="switchLanguage('en')" 
        [class.active-lang]="currentLang() === 'en'"
        class="lang-btn">
        EN
      </button>
    </div>
  `,
  styles: [`
    .lang-selector-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .lang-btn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      padding: 0.2rem 0.4rem;
      transition: color 0.2s ease;
      outline: none;
    }
    .lang-btn:hover {
      color: #0f172a;
    }
    .active-lang {
      color: #2563eb !important;
      border-bottom: 2px solid #2563eb;
    }
    .lang-divider {
      color: #cbd5e1;
      font-size: 0.8rem;
      user-select: none;
    }
  `]
})
export class LanguageSelectorComponent {
  private readonly translate = inject(TranslateService);

  public currentLang(): string {
    return this.translate.currentLang || 'es';
  }

  public switchLanguage(lang: string): void {
    const target = lang.trim().toLowerCase();
    this.translate.use(target);
  }
}
