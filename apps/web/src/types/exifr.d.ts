declare module 'exifr' {
  interface ExifrOptions {
    pick?: string[];
    gps?: boolean;
    tiff?: boolean;
    xmp?: boolean;
    icc?: boolean;
    iptc?: boolean;
    jfif?: boolean;
    ihdr?: boolean;
    makerNote?: boolean;
    userComment?: boolean;
    sanitize?: boolean;
    mergeOutput?: boolean;
    chunked?: boolean;
    firstChunkSize?: number;
    chunkSize?: number;
  }

  interface ParsedExif {
    DateTimeOriginal?: Date | string;
    DateTime?: Date | string;
    CreateDate?: Date | string;
    GPSLatitude?: number;
    GPSLongitude?: number;
    GPSLatitudeRef?: string;
    GPSLongitudeRef?: string;
    latitude?: number;
    longitude?: number;
    Make?: string;
    Model?: string;
    LensModel?: string;
    LensMake?: string;
    FocalLength?: number;
    FNumber?: number;
    ISO?: number;
    ISOSpeedRatings?: number | number[];
    ExposureTime?: number;
    Flash?: number | boolean;
    Orientation?: number;
    [key: string]: any;
  }

  interface GPSResult {
    latitude: number;
    longitude: number;
  }

  export function parse(
    input: Buffer | ArrayBuffer | string | Blob | File,
    options?: ExifrOptions
  ): Promise<ParsedExif | undefined>;

  export function gps(
    input: Buffer | ArrayBuffer | string | Blob | File
  ): Promise<GPSResult | undefined>;

  export function orientation(
    input: Buffer | ArrayBuffer | string | Blob | File
  ): Promise<number | undefined>;

  export function thumbnail(
    input: Buffer | ArrayBuffer | string | Blob | File
  ): Promise<Buffer | Uint8Array | undefined>;

  export default {
    parse,
    gps,
    orientation,
    thumbnail,
  };
}
