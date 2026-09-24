import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { SeoService } from '../../shared/seo.service';
import { PlatformMenuComponent } from '../../shared/platform-menu/platform-menu.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, PlatformMenuComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
})
export class AboutComponent implements OnInit, OnDestroy {
  private schemaScript: HTMLScriptElement | null = null;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly renderer: Renderer2,
    private readonly title: Title,
    private readonly meta: Meta,
    private readonly seo: SeoService,
  ) {}

  ngOnInit(): void {
    const pageTitle = 'About TODD Image Creator';
    const description = 'TODD Image Creator turns a plain-language description — or a logo/example image to work from — into a downloadable image. Nothing is saved after you leave.';
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: 'https://images.taliferro.tech/about' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.seo.setCanonical('https://images.taliferro.tech/about');
    this.addStructuredData();
  }

  ngOnDestroy(): void {
    this.schemaScript?.remove();
  }

  // Same shared Organization @id as Find/Network's About pages — schema.org
  // convention for "this is the same real-world entity" across pages.
  private addStructuredData(): void {
    this.schemaScript = this.renderer.createElement('script') as HTMLScriptElement;
    this.schemaScript.type = 'application/ld+json';
    this.schemaScript.id = 'about-structured-data';
    this.schemaScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': 'https://taliferro.com/#organization',
          name: 'Taliferro Tech, LLC',
          url: 'https://taliferro.com',
          description: 'Taliferro Tech creates software products that help people find information, build momentum, and act on useful context.',
        },
        {
          '@type': 'SoftwareApplication',
          '@id': 'https://images.taliferro.tech/#software',
          name: 'TODD Image Creator',
          url: 'https://images.taliferro.tech/',
          description: 'TODD Image Creator generates logos, icons, and images from a plain-language description, optionally starting from an attached reference image.',
          applicationCategory: 'DesignApplication',
          applicationSubCategory: 'AI image generation',
          operatingSystem: 'Web',
          image: 'https://images.taliferro.tech/todd-image-creator.png',
          creator: { '@id': 'https://taliferro.com/#organization' },
          publisher: { '@id': 'https://taliferro.com/#organization' },
        },
      ],
    });
    this.renderer.appendChild(this.document.head, this.schemaScript);
  }
}
