import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

const LOCALE_KEY = 'locale';
const LOCALE_QUERY_PARAM = 'lang';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'web';

  constructor(
    private readonly router: Router,
    translate: TranslateService,
  ) {
    const supportedLanguages = ['en', 'es'];
    translate.addLangs(supportedLanguages);
    translate.setDefaultLang('en');

    const urlParams = new URLSearchParams(window.location.search);
    const requestedLocale = urlParams.get(LOCALE_QUERY_PARAM);
    const persisted = localStorage.getItem(LOCALE_KEY);

    if (requestedLocale && supportedLanguages.includes(requestedLocale)) {
      localStorage.setItem(LOCALE_KEY, requestedLocale);
      translate.use(requestedLocale);
      this.router.navigate([], {
        queryParams: { [LOCALE_QUERY_PARAM]: null },
        queryParamsHandling: 'merge',
      });
      return;
    }

    if (persisted && supportedLanguages.includes(persisted)) {
      translate.use(persisted);
    } else {
      const browserLang = translate.getBrowserLang() ?? 'en';
      translate.use(supportedLanguages.includes(browserLang) ? browserLang : 'en');
    }
  }
}
