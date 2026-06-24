export interface LocalImageDimensions {
  /** URI of the newly written watermarked image. */
  uri: string;
  sourceUri: string;
  fileName: string;
  width: number;
  height: number;
}

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface WatermarkMargins {
  /** Inset from the top edge, or downward offset for a centered position. */
  top?: number;
  /** Inset from the right edge, or leftward offset for a centered position. */
  right?: number;
  /** Inset from the bottom edge, or upward offset for a centered position. */
  bottom?: number;
  /** Inset from the left edge, or rightward offset for a centered position. */
  left?: number;
}

/**
 * Writes a watermarked copy beside the local image when possible and returns its URI.
 */
export function inspectLocalImage(
  localUri: string,
  text: string,
  position: WatermarkPosition,
  rotateDegree: number,
  /** Hexadecimal watermark color. Defaults to #FFFFFF. */
  colorCode?: string,
  /** Directional margins in image pixels. Every direction defaults to 0. */
  margins?: WatermarkMargins,
): Promise<LocalImageDimensions>;

export default inspectLocalImage;
