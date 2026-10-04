import { MenuAppConfig } from '@taliferro/ui/platform/universal-menu.model';

/** Image Creator is a single page, so its menu has no app column. */
export const PLATFORM_MENU_CONFIG: MenuAppConfig = {
  app: 'image-creator',
  name: 'Image Creator',
  items: [],
  // No pages of its own to list, but Help and About live here (design 12).
  secondaryItems: [
    { label: 'Help', icon: 'help', route: '/help' },
    { label: 'About', icon: 'info', route: '/about' },
  ],
};
