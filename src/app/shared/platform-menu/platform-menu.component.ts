import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import packageJson from '../../../../package.json';
import { RouterModule } from '@angular/router';

import { getPlatformMenuItems, PlatformMenuItem } from '@taliferro/ui/platform/account-menu.model';

interface ProductLink {
  label: string;
  url: string;
  icon: string;
  description: string;
}

interface AppRouteLink { label: string; route: string; signIn?: boolean; signOut?: boolean; }

/**
 * Top-right hamburger that slides a panel down over the page. Products on
 * the left (the other standalone apps), Account on the right (the TODD
 * routes that never got ported per-app - profile, billing, admin, etc.) -
 * see taliferrotech's TODD-routes-migration doc and the Maya app's version,
 * which this mirrors.
 *
 * appRoutes/accountItems used to be getters that built a fresh array on
 * every single template check - Angular checks bindings on every change
 * detection pass (which zone.js triggers on nearly any browser event
 * app-wide, not just ones inside this component), so *ngFor was seeing a
 * new array identity constantly and destroying/rebuilding every link
 * element in the list far more often than the content ever actually
 * changed. They're computed once here and only recomputed when the inputs
 * that actually affect their content change.
 */
@Component( {
  selector: 'app-platform-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './platform-menu.component.html',
  styleUrl: './platform-menu.component.css',
} )
export class PlatformMenuComponent implements OnChanges {
  @Input() isAdmin = false;
  @Input() isLoggedIn = false;
  @Output() readonly signIn = new EventEmitter<void>();
  @Output() readonly signOut = new EventEmitter<void>();

  isOpen = false;
  readonly appVersion = String(packageJson.version || '').trim();

  appRoutes: AppRouteLink[] = [];
  accountItems: PlatformMenuItem[] = [];

  readonly productLinks: ProductLink[] = [
    { label: 'Ask TODD', url: 'https://ask.taliferro.tech', icon: 'assets/find/entities/todd/logo-bw-icon.png', description: 'Turn uncertainty into the next move.' },
    { label: 'Network', url: 'https://network.taliferro.tech', icon: 'assets/find/entities/network/logo-bw-icon.png', description: 'Know who matters before the moment passes.' },
    { label: 'Outreach', url: 'https://outreach.taliferro.tech', icon: 'assets/find/entities/outreach/logo-bw-icon.png', description: 'Keep the work moving.' },
    { label: 'Docs', url: 'https://docs.taliferro.tech', icon: 'assets/find/entities/docs/logo-bw-icon.png', description: 'Give your best thinking somewhere to live.' },
    { label: 'Moves', url: 'https://moves.taliferro.tech', icon: 'assets/find/entities/moves/logo-bw-icon.png', description: 'Make progress visible and actionable.' },
    { label: 'Pulse', url: 'https://pulse.taliferro.tech', icon: 'assets/find/entities/pulse/logo-bw-icon.png', description: 'Hear what people are really saying.' },
    { label: 'Social', url: 'https://social.taliferro.tech', icon: 'assets/find/entities/social/logo-bw-icon.png', description: 'Stay visible without living online.' },
    { label: 'Lead Vault', url: 'https://lead-vault.taliferro.tech', icon: 'assets/find/entities/lead-vault/logo-bw-icon.png', description: 'Find the people behind the opportunity.' },
    { label: 'Maya', url: 'https://maya.taliferro.tech', icon: 'assets/find/entities/maya/logo-bw.png', description: 'Think like your marketing director.' },
    { label: 'SayIt', url: 'https://sayit.taliferro.tech', icon: 'assets/find/entities/sayit/logo-bw-icon.png', description: 'Make your message worth sharing.' },
    { label: 'Find', url: 'https://find.taliferro.tech', icon: 'assets/find/entities/find/logo-bw-icon.png', description: 'Get to the answer faster.' },
    { label: 'Email Signature', url: 'https://signature.taliferro.tech', icon: 'assets/find/entities/email-signature-builder/logo-bw-icon.png', description: 'Make every email carry your brand.' },
    { label: 'Music', url: 'https://music.taliferro.com', icon: 'assets/find/entities/music/logo-bw-icon.png', description: 'Let the soundtrack keep moving.' },
  ];

  constructor () {
    this.recompute();
  }

  ngOnChanges (): void {
    this.recompute();
  }

  private recompute (): void {
    // Image Creator is a single page, and sign-in is TODD's hosted login
    // rather than a /login route, so both auth entries are handled by the
    // host through the signIn/signOut outputs.
    this.appRoutes = [
      { label: 'Home', route: '/' },
      { label: 'Help', route: '/help' },
      { label: 'About', route: '/about' },
      this.isLoggedIn
        ? { label: 'Sign Out', route: '/', signOut: true }
        : { label: 'Sign In', route: '/', signIn: true },
    ];

    // Help already has its own route above, and the per-account TODD pages
    // are meaningless before sign-in.
    const hidden = new Set( [ 'platform-billing', 'platform-help' ] );
    const signedInOnly = new Set( [ 'platform-momentum', 'platform-profile', 'platform-settings', 'platform-admin' ] );
    this.accountItems = getPlatformMenuItems().filter( ( item ) =>
      !hidden.has( item.id ) &&
      ( this.isLoggedIn || !signedInOnly.has( item.id ) ) &&
      ( !item.adminOnly || this.isAdmin ) );
  }

  trackByLabel ( _index: number, item: { label: string } ): string {
    return item.label;
  }

  toggle (): void {
    this.isOpen = !this.isOpen;
  }

  close (): void {
    this.isOpen = false;
  }

  handleRouteClick ( event: MouseEvent, link: AppRouteLink ): void {
    if ( !link.signIn && !link.signOut ) return;
    event.preventDefault();
    this.close();
    if ( link.signIn ) this.signIn.emit();
    else this.signOut.emit();
  }
}
