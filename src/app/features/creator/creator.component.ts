import { Component, ElementRef, HostListener, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import {
  ApiError,
  ChatMessagePayload,
  ImageBackground,
  ImageCreatorApiService,
  ImageSize,
  TargetSize,
  Usage,
} from '../../services/image-creator-api.service';
import { PlatformMenuComponent } from '../../shared/platform-menu/platform-menu.component';
import { ACCEPTED_IMAGE_TYPES, cropToSize, downloadDataUrl, prepareUpload, toReferenceImage } from '../../utils/image-files';

interface ChatImage {
  id: string;
  kind: 'upload' | 'generated';
  dataUrl: string;
  thumbnail?: string;
  name?: string;
  prompt?: string;
  width?: number;
  height?: number;
}

interface GenerationPlan {
  prompt: string;
  size: ImageSize;
  background: ImageBackground;
  target: TargetSize | null;
  referenceImageIds: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  images: ChatImage[];
  plan?: GenerationPlan;
  generating?: boolean;
  error?: string;
}

// Only the most recent uploads are sent to the chat model as thumbnails;
// older ones are still referenced by id so TODD knows they exist.
const MAX_THUMBNAILS_PER_TURN = 6;
const MAX_ATTACHMENTS_PER_MESSAGE = 4;

/**
 * The whole app: a chat with TODD that ends in generated images. Everything
 * - uploads, generated images, the conversation - lives in these signals and
 * nowhere else, so it's gone when the tab closes.
 */
@Component( {
  selector: 'app-creator',
  standalone: true,
  imports: [ FormsModule, PlatformMenuComponent ],
  templateUrl: './creator.component.html',
  styleUrl: './creator.component.css',
} )
export class CreatorComponent {
  private readonly api = inject( ImageCreatorApiService );
  readonly auth = inject( AuthService );

  readonly acceptedTypes = ACCEPTED_IMAGE_TYPES.join( ',' );
  readonly suggestions = [
    'Turn my attached logo into a flat 1024×1024 square icon with no rounded corners',
    'A minimalist logo for a coffee shop called "Northside Roasters"',
    'A clean LinkedIn banner for a small tech consulting firm',
  ];

  readonly messages = signal<ChatMessage[]>( [] );
  readonly attachments = signal<ChatImage[]>( [] );
  readonly draft = signal( '' );
  readonly thinking = signal( false );
  readonly dragging = signal( false );
  readonly notice = signal( '' );
  readonly usage = signal<Usage | null>( null );

  readonly generating = computed( () => this.messages().some( ( message ) => message.generating ) );
  readonly busy = computed( () => this.thinking() || this.generating() );
  readonly canSend = computed( () =>
    !this.busy() && ( this.draft().trim().length > 0 || this.attachments().length > 0 ) );
  readonly isAdmin = computed( () => this.auth.user()?.uid === environment.taliferroTenantId );
  readonly hasGeneratedImages = computed( () =>
    this.messages().some( ( message ) => message.images.some( ( image ) => image.kind === 'generated' ) ) );

  private readonly scroller = viewChild<ElementRef<HTMLElement>>( 'scroller' );
  private readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>( 'composer' );
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>( 'fileInput' );

  private nextUploadId = 1;
  private nextGeneratedId = 1;
  private dragDepth = 0;

  constructor () {
    effect( () => {
      if ( this.auth.user() ) void this.refreshUsage();
    } );
  }

  /** Nothing is saved, so warn before the tab takes the images with it. */
  @HostListener( 'window:beforeunload', [ '$event' ] )
  onBeforeUnload ( event: BeforeUnloadEvent ): void {
    if ( this.hasGeneratedImages() ) event.preventDefault();
  }

  @HostListener( 'window:paste', [ '$event' ] )
  onPaste ( event: ClipboardEvent ): void {
    const files = Array.from( event.clipboardData?.files || [] ).filter( ( file ) => file.type.startsWith( 'image/' ) );
    if ( files.length && this.auth.user() ) {
      event.preventDefault();
      void this.addFiles( files );
    }
  }

  @HostListener( 'window:dragenter', [ '$event' ] )
  onDragEnter ( event: DragEvent ): void {
    if ( !this.auth.user() || !event.dataTransfer?.types.includes( 'Files' ) ) return;
    this.dragDepth++;
    this.dragging.set( true );
  }

  @HostListener( 'window:dragleave' )
  onDragLeave (): void {
    this.dragDepth = Math.max( 0, this.dragDepth - 1 );
    if ( !this.dragDepth ) this.dragging.set( false );
  }

  @HostListener( 'window:dragover', [ '$event' ] )
  onDragOver ( event: DragEvent ): void {
    event.preventDefault();
  }

  @HostListener( 'window:drop', [ '$event' ] )
  onDrop ( event: DragEvent ): void {
    event.preventDefault();
    this.dragDepth = 0;
    this.dragging.set( false );
    if ( this.auth.user() ) void this.addFiles( Array.from( event.dataTransfer?.files || [] ) );
  }

  openFilePicker (): void {
    this.fileInput()?.nativeElement.click();
  }

  onFilesPicked ( input: HTMLInputElement ): void {
    void this.addFiles( Array.from( input.files || [] ) );
    input.value = '';
  }

  removeAttachment ( id: string ): void {
    this.attachments.update( ( list ) => list.filter( ( image ) => image.id !== id ) );
  }

  useSuggestion ( text: string ): void {
    this.draft.set( text );
    this.composer()?.nativeElement.focus();
  }

  onComposerKeydown ( event: KeyboardEvent ): void {
    if ( event.key === 'Enter' && !event.shiftKey && !event.isComposing ) {
      event.preventDefault();
      void this.send();
    }
  }

  autoGrow ( textarea: HTMLTextAreaElement ): void {
    textarea.style.height = 'auto';
    textarea.style.height = `${ Math.min( textarea.scrollHeight, 220 ) }px`;
  }

  async send (): Promise<void> {
    if ( !this.canSend() ) return;
    this.notice.set( '' );
    this.messages.update( ( list ) => [
      ...list,
      { role: 'user', text: this.draft().trim(), images: this.attachments() },
    ] );
    this.draft.set( '' );
    this.attachments.set( [] );
    const composer = this.composer()?.nativeElement;
    if ( composer ) this.autoGrow( composer );
    this.scrollToBottom();

    this.thinking.set( true );
    try {
      const turn = await this.api.chat( this.toPayload( this.messages() ) );
      this.usage.set( turn.usage );
      const plan = turn.action === 'generate' && turn.prompt ? {
        prompt: turn.prompt,
        size: turn.size || '1024x1024',
        background: turn.background || 'opaque',
        target: turn.target || null,
        referenceImageIds: turn.referenceImageIds || [],
      } : undefined;
      this.messages.update( ( list ) => [ ...list, { role: 'assistant', text: turn.reply, images: [], plan } ] );
      this.thinking.set( false );
      this.scrollToBottom();
      if ( plan ) await this.generate( this.messages().length - 1 );
    } catch ( error ) {
      this.thinking.set( false );
      this.handleError( error );
    }
  }

  /** Runs (or retries) the generation planned on the assistant message at `index`. */
  async generate ( index: number ): Promise<void> {
    const plan = this.messages()[ index ]?.plan;
    if ( !plan ) return;
    this.patchMessage( index, { generating: true, error: undefined } );
    this.scrollToBottom();

    try {
      const references = await Promise.all(
        plan.referenceImageIds
          .map( ( id ) => this.findImage( id ) )
          .filter( ( image ): image is ChatImage => !!image )
          .map( ( image ) => toReferenceImage( image.dataUrl ) ),
      );
      const result = await this.api.generate( plan.prompt, plan.size, plan.background, references );
      this.usage.set( result.usage );
      const [ width, height ] = plan.target ?
        [ plan.target.width, plan.target.height ] :
        plan.size.split( 'x' ).map( Number );
      const image: ChatImage = {
        id: `g${ this.nextGeneratedId++ }`,
        kind: 'generated',
        dataUrl: plan.target ? await cropToSize( result.image, width, height ) : result.image,
        prompt: plan.prompt,
        width,
        height,
      };
      this.patchMessage( index, { generating: false, images: [ image ] } );
      this.scrollToBottom();
    } catch ( error ) {
      if ( error instanceof ApiError && error.usage ) this.usage.set( error.usage );
      const message = error instanceof Error ? error.message : 'Image generation failed.';
      this.patchMessage( index, { generating: false, error: message } );
      if ( error instanceof ApiError && error.status === 401 ) this.handleError( error );
    }
  }

  download ( image: ChatImage ): void {
    const dimensions = image.width && image.height ? `-${ image.width }x${ image.height }` : '';
    void downloadDataUrl( image.dataUrl, `todd-image-${ image.id.slice( 1 ) }${ dimensions }.png` );
  }

  startOver (): void {
    if ( this.hasGeneratedImages() && !confirm( 'Start over? Images you haven\'t downloaded will be gone.' ) ) return;
    this.messages.set( [] );
    this.attachments.set( [] );
    this.draft.set( '' );
    this.notice.set( '' );
  }

  async signOut (): Promise<void> {
    if ( this.hasGeneratedImages() && !confirm( 'Sign out? Images you haven\'t downloaded will be gone.' ) ) return;
    this.messages.set( [] );
    this.attachments.set( [] );
    await this.auth.signOut();
  }

  private async addFiles ( files: File[] ): Promise<void> {
    const room = MAX_ATTACHMENTS_PER_MESSAGE - this.attachments().length;
    if ( files.length > room ) {
      this.notice.set( `You can attach up to ${ MAX_ATTACHMENTS_PER_MESSAGE } images per message.` );
    }
    for ( const file of files.slice( 0, Math.max( 0, room ) ) ) {
      try {
        const prepared = await prepareUpload( file );
        this.attachments.update( ( list ) => [
          ...list,
          { id: `u${ this.nextUploadId++ }`, kind: 'upload', name: file.name, ...prepared },
        ] );
      } catch ( error ) {
        this.notice.set( error instanceof Error ? error.message : 'Could not attach that file.' );
      }
    }
  }

  private toPayload ( messages: ChatMessage[] ): ChatMessagePayload[] {
    const recentUploadIds = new Set(
      messages.flatMap( ( message ) => message.images )
        .filter( ( image ) => image.kind === 'upload' )
        .slice( -MAX_THUMBNAILS_PER_TURN )
        .map( ( image ) => image.id ),
    );
    return messages.map( ( message ) => ( {
      role: message.role,
      text: message.text,
      images: message.images.map( ( image ) => image.kind === 'upload' ?
        {
          id: image.id,
          kind: image.kind,
          name: image.name,
          thumbnail: recentUploadIds.has( image.id ) ? image.thumbnail : undefined,
        } :
        { id: image.id, kind: image.kind, prompt: image.prompt } ),
    } ) );
  }

  /** CSS aspect-ratio for the loading placeholder, matching what's being made. */
  placeholderRatio ( plan?: GenerationPlan ): string {
    if ( plan?.target ) return `${ plan.target.width } / ${ plan.target.height }`;
    const [ width, height ] = ( plan?.size || '1024x1024' ).split( 'x' );
    return `${ width } / ${ height }`;
  }

  private findImage ( id: string ): ChatImage | undefined {
    for ( const message of this.messages() ) {
      const match = message.images.find( ( image ) => image.id === id );
      if ( match ) return match;
    }
    return undefined;
  }

  private patchMessage ( index: number, patch: Partial<ChatMessage> ): void {
    this.messages.update( ( list ) => list.map( ( message, i ) => ( i === index ? { ...message, ...patch } : message ) ) );
  }

  private async refreshUsage (): Promise<void> {
    try {
      this.usage.set( await this.api.getUsage() );
    } catch {
      // Usage is informational; the backend still enforces the limit.
    }
  }

  private handleError ( error: unknown ): void {
    if ( error instanceof ApiError && error.status === 401 ) {
      this.notice.set( 'Your session expired. Sign in again to keep going.' );
      return;
    }
    this.notice.set( error instanceof Error ? error.message : 'Something went wrong. Please try again.' );
  }

  private scrollToBottom (): void {
    setTimeout( () => {
      const element = this.scroller()?.nativeElement;
      element?.scrollTo( { top: element.scrollHeight, behavior: 'smooth' } );
    } );
  }
}
