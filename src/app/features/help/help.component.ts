import { Component } from '@angular/core';

import { ProductPagesComponent } from '../../shared/product-pages/product-pages.component';

/** Image Creator's Help: the shared template, then tips, sizes and more
 *  questions. Static (prerendered). */
@Component( {
  selector: 'app-help',
  standalone: true,
  imports: [ProductPagesComponent],
  templateUrl: './help.component.html',
} )
export class HelpComponent {
  readonly tips = [
    { title: 'Say what it’s for', copy: 'A banner, a social post, a product shot, an icon. The purpose shapes the composition.' },
    { title: 'Give the size', copy: 'Put the pixel size in your request, for example 975 × 110. TODD makes the image to fit it.' },
    { title: 'Attach a starting point', copy: 'A logo to use, or an example of the style you want. Drop it on the page or use the + button.' },
    { title: 'Ask for changes', copy: 'Reply in plain words, such as “lighter background”. Every version stays in the panel to compare.' },
  ];

  readonly sizes = [
    { name: 'Square', copy: '1024 × 1024. Icons, logos and most social posts.' },
    { name: 'Landscape', copy: '1536 × 1024. Banners, headers and slides.' },
    { name: 'Portrait', copy: '1024 × 1536. Posters and stories.' },
    { name: 'Exact sizes', copy: 'Ask for any size, such as a 975 × 110 header, and TODD fits the image to it.' },
    { name: 'Transparent background', copy: 'Ask for one, for logos and icons you’ll place on other designs.' },
  ];

  readonly questions = [
    { q: 'What can I attach?', a: 'PNG, JPG or WEBP images up to 20 MB each.' },
    { q: 'Will it copy someone else’s logo or artwork?', a: 'Use images you have the rights to. TODD works from what you attach and describe.' },
    { q: 'Why did TODD ask me a question?', a: 'When a request is unclear, such as the size or the text to include, TODD asks before it spends one of your images.' },
    { q: 'When does the limit reset?', a: 'At midnight Pacific time. The pill in the header shows what’s left today.' },
  ];
}
