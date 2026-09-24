import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { SeoService } from '../../shared/seo.service';
import { PlatformMenuComponent } from '../../shared/platform-menu/platform-menu.component';

interface HelpStep {
  number: string;
  title: string;
  copy: string;
  details: string[];
}

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, RouterLink, PlatformMenuComponent],
  templateUrl: './help.component.html',
  styleUrl: './help.component.css',
})
export class HelpComponent implements OnInit {
  constructor(
    private readonly title: Title,
    private readonly meta: Meta,
    private readonly seo: SeoService,
  ) {}

  ngOnInit(): void {
    const pageTitle = 'Help — TODD Image Creator';
    const description = 'How to use TODD Image Creator: describe what you want, attach a reference image, refine in conversation, and download before you leave.';
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: 'https://images.taliferro.tech/help' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.seo.setCanonical('https://images.taliferro.tech/help');
  }

  readonly steps: HelpStep[] = [
    {
      number: '01',
      title: 'Sign in with TODD',
      copy: 'Image Creator uses TODD\'s shared hosted login — the same sign-in as Network, Pulse, and the native apps. You need to be signed in before you can generate anything.',
      details: [
        'Choose "Sign in with TODD" on the intro screen.',
        'You\'re redirected to TODD\'s hosted login, then back here once signed in.',
      ],
    },
    {
      number: '02',
      title: 'Describe what you want',
      copy: 'Type a plain-language description — no special syntax. The more specific you are about style, colors, and use, the closer the first result will be.',
      details: [
        '"Turn my attached logo into a flat 1024×1024 square icon with no rounded corners"',
        '"A minimalist logo for a coffee shop called \'Northside Roasters\'"',
        '"A clean LinkedIn banner for a small tech consulting firm"',
      ],
    },
    {
      number: '03',
      title: 'Attach a reference image (optional)',
      copy: 'Working from an existing logo or example image? Attach it to your message. TODD uses it as a starting point instead of generating from nothing.',
      details: [
        'Drag and drop an image onto the conversation, or use the attach control.',
        'You can combine an attached image with a text description in the same message.',
      ],
    },
    {
      number: '04',
      title: 'Answer TODD\'s clarifying questions',
      copy: 'If your description leaves something open — exact colors, aspect ratio, what to keep from a reference image — TODD asks before generating instead of guessing.',
      details: [
        'Reply in the same conversation; TODD keeps the context from your first message.',
      ],
    },
    {
      number: '05',
      title: 'Download before you leave',
      copy: 'Nothing is saved. There\'s no history or gallery to come back to later — download any image you want to keep as soon as it\'s generated.',
      details: [
        'Each generated image has its own download control.',
        'Your daily image limit and remaining count are shown in the top bar; it resets at midnight Pacific time.',
      ],
    },
  ];
}
