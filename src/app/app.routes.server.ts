import { RenderMode, ServerRoute } from '@angular/ssr';

// '' (CreatorComponent) injects AuthService, whose constructor calls
// Firebase's onAuthStateChanged(getAuth(), ...) unconditionally — unsafe to
// evaluate at build time in Node. Only the two purely static content pages,
// which touch nothing auth-related, are prerendered.
export const serverRoutes: ServerRoute[] = [
  { path: 'help', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
