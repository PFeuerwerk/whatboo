import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inline-flex items-center gap-2 rounded-full bg-slate-950/80 p-1 text-[11px] uppercase tracking-[0.22em] text-slate-200">
      <button
        type="button"
        class="rounded-full px-3 py-1 transition hover:bg-slate-900/90 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        [class.bg-amber-400]="currentLang === 'en'"
        [class.text-slate-950]="currentLang === 'en'"
        (click)="langChange.emit('en')"
      >
        EN
      </button>
      <button
        type="button"
        class="rounded-full px-3 py-1 transition hover:bg-slate-900/90 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        [class.bg-amber-400]="currentLang === 'es'"
        [class.text-slate-950]="currentLang === 'es'"
        (click)="langChange.emit('es')"
      >
        ES
      </button>
    </div>
  `
})
export class LanguageSelectorComponent {
  @Input() currentLang: string = 'es';
  @Output() langChange = new EventEmitter<'en' | 'es'>();
}
