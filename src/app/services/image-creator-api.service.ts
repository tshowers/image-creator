import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Usage {
  used: number;
  /** Null when `unlimited` (the master tenant has no daily cap). */
  limit: number | null;
  remaining: number | null;
  unlimited?: boolean;
}

export type ImageSize = '1024x1024' | '1536x1024' | '1024x1536' | '1248x2688';
export type ImageBackground = 'opaque' | 'transparent';

/** Exact pixel size the user asked for; the result is cropped to it. */
export interface TargetSize {
  width: number;
  height: number;
}

/** What the backend sees of the conversation - text plus lightweight image references. */
export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  text: string;
  images: Array<{
    id: string;
    kind: 'upload' | 'generated';
    name?: string;
    thumbnail?: string;
    prompt?: string;
  }>;
}

export interface ChatTurnResponse {
  action: 'ask' | 'generate' | 'limit';
  reply: string;
  prompt?: string;
  size?: ImageSize;
  background?: ImageBackground;
  target?: TargetSize | null;
  referenceImageIds?: string[];
  usage: Usage;
}

export interface GenerateResponse {
  image: string;
  usage: Usage;
}

export class ApiError extends Error {
  constructor ( message: string, readonly status: number, readonly usage?: Usage ) {
    super( message );
  }
}

@Injectable( { providedIn: 'root' } )
export class ImageCreatorApiService {
  private readonly http = inject( HttpClient );
  private readonly auth = inject( AuthService );
  private readonly baseUrl = `${ environment.backendURL }/image-creator`;

  async getUsage (): Promise<Usage> {
    const result = await this.request<{ usage: Usage }>( 'GET', 'usage' );
    return result.usage;
  }

  chat ( messages: ChatMessagePayload[] ): Promise<ChatTurnResponse> {
    return this.request<ChatTurnResponse>( 'POST', 'chat', { messages } );
  }

  generate (
    prompt: string,
    size: ImageSize,
    background: ImageBackground,
    referenceImages: string[],
  ): Promise<GenerateResponse> {
    return this.request<GenerateResponse>( 'POST', 'generate', { prompt, size, background, referenceImages } );
  }

  private async request<T> ( method: 'GET' | 'POST', path: string, body?: unknown ): Promise<T> {
    const token = await this.auth.getIdToken();
    const headers = new HttpHeaders( { Authorization: `Bearer ${ token }` } );
    const url = `${ this.baseUrl }/${ path }`;
    try {
      return await firstValueFrom(
        method === 'GET' ? this.http.get<T>( url, { headers } ) : this.http.post<T>( url, body, { headers } ),
      );
    } catch ( error ) {
      if ( error instanceof HttpErrorResponse ) {
        const message = error.status === 0 ?
          'Could not reach TODD. Check your connection and try again.' :
          error.status === 413 ?
            'Those images are too large to send together. Try fewer or smaller attachments.' :
            error.error?.message || 'Something went wrong. Please try again.';
        throw new ApiError( message, error.status, error.error?.usage );
      }
      throw error;
    }
  }
}
