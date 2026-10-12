import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, Component, effect, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { environment } from '../environments/environment';
import { AuthService } from './services/auth.service';

/**
 * Picks up new deploys the way Network does: poll /assets/version.json and
 * reload when it no longer matches the build that's running. Image Creator
 * keeps the conversation and images only in the creator page, so a signed-in
 * person on that page gets a Refresh notice instead of losing their work.
 */
@Component( {
  selector: 'app-root',
  standalone: true,
  imports: [ RouterOutlet ],
  template: `
    <router-outlet />
    @if (updateNotice()) {
      <div class="update-notice" role="status" aria-live="polite">
        <span>{{ updateNotice() }}</span>
        <button type="button" (click)="refresh()">Refresh</button>
        <button type="button" aria-label="Dismiss update notification" (click)="updateNotice.set('')">×</button>
      </div>
    }
  `,
  styles: `
    .update-notice {
      position: fixed; right: 20px; bottom: 20px; z-index: 10020;
      display: flex; align-items: center; gap: 10px;
      max-width: min(380px, calc(100vw - 32px));
      padding: 14px 14px 14px 20px; border-radius: 20px;
      background: var(--text); color: var(--bg); font: 500 14px/1.4 var(--font);
    }
    .update-notice button {
      flex: none; height: 32px; padding: 0 12px; border: 0; border-radius: 999px;
      background: color-mix(in srgb, var(--bg) 18%, transparent); color: var(--bg);
      font: 700 14px/1 var(--font); cursor: pointer;
    }
  `,
} )
export class AppComponent implements OnInit {
  private readonly auth = inject( AuthService );
  private readonly router = inject( Router );
  private readonly isBrowser = isPlatformBrowser( inject( PLATFORM_ID ) );
  private readonly reloadedForVersionKey = 'image-creator-reloaded-for-version';
  private readonly chunkRecoveryKey = 'image-creator-chunk-recovery-attempted';
  private readonly pendingVersion = signal( '' );
  private isReloading = false;

  readonly updateNotice = signal( '' );

  constructor () {
    // index.html hides the prerendered (signed-out) home page for people who
    // were signed in last time; the app has rendered by now, so show it.
    afterNextRender( () => document.documentElement.classList.remove( 'ic-signed-in-boot' ) );
    // Re-decide when sign-in resolves or changes (e.g. after signing out).
    effect( () => {
      this.auth.user();
      if ( this.pendingVersion() ) this.applyPendingUpdate();
    } );
  }

  ngOnInit (): void {
    if ( !this.isBrowser || !environment.production ) return;

    window.addEventListener( 'error', ( event ) => this.recoverIfChunkFailure( `${ event.message } ${ event.filename }` ), true );
    window.addEventListener( 'unhandledrejection', ( event ) => this.recoverIfChunkFailure( String( event.reason?.message ?? event.reason ?? '' ) ) );

    this.router.events.pipe( filter( ( event ) => event instanceof NavigationEnd ) ).subscribe( () => {
      // A page loaded, so any earlier chunk recovery worked.
      try { sessionStorage.removeItem( this.chunkRecoveryKey ); } catch { /* storage blocked */ }
      this.applyPendingUpdate();
    } );

    void this.checkDeployedVersion();
    window.setInterval( () => void this.checkDeployedVersion(), 60_000 );
    document.addEventListener( 'visibilitychange', () => {
      if ( document.visibilityState === 'visible' ) void this.checkDeployedVersion();
    } );
  }

  refresh (): void {
    window.location.reload();
  }

  private async checkDeployedVersion (): Promise<void> {
    try {
      const response = await fetch( `/assets/version.json?t=${ Date.now() }`, { cache: 'no-store' } );
      if ( !response.ok ) return;
      const deployed = String( ( await response.json() as { version?: string } ).version || '' ).trim();
      if ( !deployed || deployed === environment.VERSION ) return;

      this.pendingVersion.set( deployed );
      this.applyPendingUpdate();
    } catch ( error ) {
      console.warn( '[ImageCreatorVersionCheck] unable to check deployed version', error );
    }
  }

  /**
   * A reload only loses work for a signed-in person on the creator page; they
   * get a notice instead. On that page, wait until sign-in state is known.
   */
  private applyPendingUpdate (): void {
    const version = this.pendingVersion();
    if ( !version ) return;
    const onCreator = this.router.url.split( /[?#]/ )[0] === '/';
    const user = this.auth.user();
    if ( !onCreator || user === null ) {
      this.reloadFor( version );
    } else if ( user ) {
      this.updateNotice.set( 'A new version of Image Creator is ready. Download any images you want to keep, then refresh.' );
    }
  }

  private reloadFor ( version: string ): void {
    if ( this.isReloading ) return;
    try {
      // Already reloaded for this version and still mismatched (stale CDN
      // edge, browser cache) - stop rather than reload forever.
      if ( sessionStorage.getItem( this.reloadedForVersionKey ) === version ) {
        this.updateNotice.set( 'Image Creator needs a refresh to finish updating.' );
        return;
      }
      sessionStorage.setItem( this.reloadedForVersionKey, version );
    } catch { /* storage blocked - reload anyway */ }
    this.isReloading = true;
    window.location.reload();
  }

  /** After a deploy, the old build's lazy chunks are gone and load as HTML. */
  private recoverIfChunkFailure ( details: string ): void {
    const text = details.toLowerCase();
    const isChunkFailure = [ 'failed to fetch dynamically imported module', 'loading chunk', 'expected a javascript module script', 'mime type of "text/html"' ]
      .some( ( needle ) => text.includes( needle ) );
    if ( !isChunkFailure || this.isReloading ) return;
    try {
      if ( sessionStorage.getItem( this.chunkRecoveryKey ) === '1' ) {
        this.updateNotice.set( 'Image Creator needs a refresh to finish loading.' );
        return;
      }
      sessionStorage.setItem( this.chunkRecoveryKey, '1' );
    } catch { /* storage blocked - reload anyway */ }
    this.isReloading = true;
    window.location.reload();
  }
}
