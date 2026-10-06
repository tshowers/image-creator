import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { initializeApp } from 'firebase/app';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
// No client hydration: the public pages are prerendered for search engines
// and the browser renders fresh (signed-in state differs from the build).
import { idTokenInterceptor } from './core/interceptors/id-token.interceptor';
import { provideCanonicalUrl } from './shared/canonical-url';

initializeApp( environment.firebaseConfig );

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection( { eventCoalescing: true } ),
    provideRouter( routes ),
    provideCanonicalUrl(),
    provideHttpClient(withFetch(), withInterceptors([idTokenInterceptor])),
  ],
};
