import sharp from 'sharp';
import exifr from 'exifr';

export interface ExifData {
  takenAt?: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
  camera?: string;
  make?: string;
  model?: string;
  lens?: string;
  focalLength?: number;
  aperture?: number;
  iso?: number;
  exposureTime?: string;
  flash?: boolean;
  orientation?: number;
}

export async function extractExifData(imageBuffer: Buffer): Promise<ExifData> {
  try {
    // Use exifr for robust EXIF parsing
    const exif = await exifr.parse(imageBuffer, {
      // Enable all important tags
      pick: [
        'DateTimeOriginal',
        'DateTime',
        'CreateDate',
        'GPSLatitude',
        'GPSLongitude',
        'GPSLatitudeRef',
        'GPSLongitudeRef',
        'Make',
        'Model',
        'LensModel',
        'LensMake',
        'FocalLength',
        'FNumber',
        'ISO',
        'ISOSpeedRatings',
        'ExposureTime',
        'Flash',
        'Orientation',
      ],
      // Parse GPS coordinates to decimal
      gps: true,
    });

    if (!exif) {
      // Fallback to sharp metadata
      const metadata = await sharp(imageBuffer).metadata();
      return {
        orientation: metadata.orientation,
      };
    }

    const result: ExifData = {};

    // Date/Time
    if (exif.DateTimeOriginal) {
      result.takenAt = new Date(exif.DateTimeOriginal);
    } else if (exif.CreateDate) {
      result.takenAt = new Date(exif.CreateDate);
    } else if (exif.DateTime) {
      result.takenAt = new Date(exif.DateTime);
    }

    // GPS Location (exifr automatically converts to decimal)
    if (exif.latitude && exif.longitude) {
      result.location = {
        latitude: exif.latitude,
        longitude: exif.longitude,
      };
    }

    // Camera info
    if (exif.Make) {
      result.make = String(exif.Make).trim();
    }
    if (exif.Model) {
      result.model = String(exif.Model).trim();
    }
    if (result.make && result.model) {
      // Remove make from model if duplicated
      if (result.model.toLowerCase().startsWith(result.make.toLowerCase())) {
        result.camera = result.model;
      } else {
        result.camera = `${result.make} ${result.model}`;
      }
    } else if (result.model) {
      result.camera = result.model;
    }

    // Lens
    if (exif.LensModel) {
      result.lens = String(exif.LensModel).trim();
    } else if (exif.LensMake) {
      result.lens = String(exif.LensMake).trim();
    }

    // Shooting settings
    if (exif.FocalLength) {
      result.focalLength = Number(exif.FocalLength);
    }
    if (exif.FNumber) {
      result.aperture = Number(exif.FNumber);
    }
    if (exif.ISO) {
      result.iso = Number(exif.ISO);
    } else if (exif.ISOSpeedRatings) {
      result.iso = Array.isArray(exif.ISOSpeedRatings)
        ? exif.ISOSpeedRatings[0]
        : exif.ISOSpeedRatings;
    }
    if (exif.ExposureTime) {
      result.exposureTime = formatExposureTime(Number(exif.ExposureTime));
    }
    if (exif.Flash !== undefined) {
      // Flash fired if bit 0 is set
      result.flash = typeof exif.Flash === 'number'
        ? (exif.Flash & 1) === 1
        : Boolean(exif.Flash);
    }
    if (exif.Orientation) {
      result.orientation = Number(exif.Orientation);
    }

    return result;
  } catch (error) {
    console.error('EXIF extraction error:', error);
    // Fallback to basic sharp metadata
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        orientation: metadata.orientation,
      };
    } catch {
      return {};
    }
  }
}

function formatExposureTime(value: number): string {
  if (value >= 1) {
    return `${value}s`;
  }
  const denominator = Math.round(1 / value);
  return `1/${denominator}s`;
}

// Enhanced metadata extraction with Sharp + EXIF
export async function extractFullMetadata(imageBuffer: Buffer) {
  const metadata = await sharp(imageBuffer).metadata();
  const exif = await extractExifData(imageBuffer);

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    space: metadata.space,
    channels: metadata.channels,
    depth: metadata.depth,
    density: metadata.density,
    hasAlpha: metadata.hasAlpha,
    isProgressive: metadata.isProgressive,
    ...exif,
  };
}

// Extract GPS coordinates only (faster when you just need location)
export async function extractGPSCoordinates(
  imageBuffer: Buffer
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const gps = await exifr.gps(imageBuffer);
    if (gps && gps.latitude && gps.longitude) {
      return {
        latitude: gps.latitude,
        longitude: gps.longitude,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Extract only the date taken (faster when you just need the date)
export async function extractDateTaken(imageBuffer: Buffer): Promise<Date | null> {
  try {
    const exif = await exifr.parse(imageBuffer, {
      pick: ['DateTimeOriginal', 'CreateDate', 'DateTime'],
    });

    if (exif?.DateTimeOriginal) {
      return new Date(exif.DateTimeOriginal);
    }
    if (exif?.CreateDate) {
      return new Date(exif.CreateDate);
    }
    if (exif?.DateTime) {
      return new Date(exif.DateTime);
    }
    return null;
  } catch {
    return null;
  }
}

// Extract orientation for proper image display
export async function extractOrientation(imageBuffer: Buffer): Promise<number> {
  try {
    const exif = await exifr.parse(imageBuffer, {
      pick: ['Orientation'],
    });
    return exif?.Orientation || 1;
  } catch {
    return 1; // Default: no rotation
  }
}
