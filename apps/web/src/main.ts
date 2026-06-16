import { bootstrapApplication } from '@angular/platform-browser'; // Corregido: Importación de platform-browser
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err: any) => console.error(err)); // Corregido: Tipado explícito para noImplicitAny
