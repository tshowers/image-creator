import { Component } from '@angular/core';

import { ProductPagesComponent } from '../../shared/product-pages/product-pages.component';

/** About Image Creator: the shared template, then what it's for and who
 *  makes it. Static (prerendered). */
@Component( {
  selector: 'app-about',
  standalone: true,
  imports: [ProductPagesComponent],
  templateUrl: './about.component.html',
} )
export class AboutComponent {
  readonly uses = [
    { title: 'Headers and banners', copy: 'Profile headers, LinkedIn banners and email headers at the exact size each needs.' },
    { title: 'Social posts', copy: 'Square and portrait images for announcements, sales and events.' },
    { title: 'Logos and icons', copy: 'Clean marks, app icons and transparent versions of your logo.' },
  ];
}
