export const ACCEPTED_IMAGE_TYPES = [ 'image/png', 'image/jpeg', 'image/webp' ];
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const REFERENCE_MAX_DIMENSION = 1536;
const THUMBNAIL_MAX_DIMENSION = 512;
// Keeps a PNG reference lossless when it's small; larger ones become JPEG so
// several references still fit in one request to the backend.
const MAX_PNG_REFERENCE_BYTES = 1024 * 1024;

export interface PreparedImage {
  /** Full-resolution original shown in the chat. */
  dataUrl: string;
  /** Small JPEG so TODD's chat model can see the upload cheaply. */
  thumbnail: string;
}

export async function prepareUpload ( file: File ): Promise<PreparedImage> {
  if ( !ACCEPTED_IMAGE_TYPES.includes( file.type ) ) {
    throw new Error( `${ file.name } isn't a PNG, JPEG, or WebP image.` );
  }
  if ( file.size > MAX_SOURCE_BYTES ) {
    throw new Error( `${ file.name } is larger than 20 MB.` );
  }
  const dataUrl = await readAsDataUrl( file );
  const thumbnail = encode( await loadImage( dataUrl ), THUMBNAIL_MAX_DIMENSION, 'image/jpeg', 0.8 );
  return { dataUrl, thumbnail };
}

/** Re-encodes an image for sending to the image model as a reference. */
export async function toReferenceImage ( dataUrl: string ): Promise<string> {
  const image = await loadImage( dataUrl );
  const png = encode( image, REFERENCE_MAX_DIMENSION, 'image/png' );
  if ( approximateBytes( png ) <= MAX_PNG_REFERENCE_BYTES ) return png;
  return encode( image, REFERENCE_MAX_DIMENSION, 'image/jpeg', 0.9 );
}

/**
 * Scales to cover and center-crops to an exact pixel size. The backend tells
 * the image model to keep key content inside the band that survives.
 */
export async function cropToSize ( dataUrl: string, width: number, height: number ): Promise<string> {
  const image = await loadImage( dataUrl );
  if ( image.naturalWidth === width && image.naturalHeight === height ) return dataUrl;
  const scale = Math.max( width / image.naturalWidth, height / image.naturalHeight );
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const canvas = document.createElement( 'canvas' );
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext( '2d' )!;
  context.imageSmoothingQuality = 'high';
  context.drawImage( image, ( width - drawWidth ) / 2, ( height - drawHeight ) / 2, drawWidth, drawHeight );
  return canvas.toDataURL( 'image/png' );
}

export async function downloadDataUrl ( dataUrl: string, filename: string ): Promise<void> {
  const blob = await ( await fetch( dataUrl ) ).blob();
  const url = URL.createObjectURL( blob );
  const link = document.createElement( 'a' );
  link.href = url;
  link.download = filename;
  document.body.appendChild( link );
  link.click();
  link.remove();
  setTimeout( () => URL.revokeObjectURL( url ), 1000 );
}

function readAsDataUrl ( file: File ): Promise<string> {
  return new Promise( ( resolve, reject ) => {
    const reader = new FileReader();
    reader.onload = () => resolve( String( reader.result ) );
    reader.onerror = () => reject( new Error( `Couldn't read ${ file.name }.` ) );
    reader.readAsDataURL( file );
  } );
}

function loadImage ( src: string ): Promise<HTMLImageElement> {
  return new Promise( ( resolve, reject ) => {
    const image = new Image();
    image.onload = () => resolve( image );
    image.onerror = () => reject( new Error( "Couldn't open that image." ) );
    image.src = src;
  } );
}

function encode ( image: HTMLImageElement, maxDimension: number, type: string, quality?: number ): string {
  const scale = Math.min( 1, maxDimension / Math.max( image.naturalWidth, image.naturalHeight ) );
  const canvas = document.createElement( 'canvas' );
  canvas.width = Math.max( 1, Math.round( image.naturalWidth * scale ) );
  canvas.height = Math.max( 1, Math.round( image.naturalHeight * scale ) );
  const context = canvas.getContext( '2d' )!;
  if ( type === 'image/jpeg' ) {
    // JPEG has no alpha; paint transparent areas white instead of black.
    context.fillStyle = '#ffffff';
    context.fillRect( 0, 0, canvas.width, canvas.height );
  }
  context.drawImage( image, 0, 0, canvas.width, canvas.height );
  return canvas.toDataURL( type, quality );
}

function approximateBytes ( dataUrl: string ): number {
  const base64 = dataUrl.slice( dataUrl.indexOf( ',' ) + 1 );
  return Math.floor( base64.length * 3 / 4 );
}
