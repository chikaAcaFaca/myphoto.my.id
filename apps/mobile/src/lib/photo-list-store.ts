/**
 * Viewer photo list — a tiny module-level hand-off so the photo viewer can
 * swipe left/right through the SAME ordered set the gallery showed, without
 * serialising a (potentially huge) list through route params.
 *
 * A gallery screen calls setViewerPhotos(orderedList) right before it
 * router.push('/photo-viewer', { id }); the viewer reads getViewerPhotos() on
 * mount, finds the tapped id, and pages from there. If the store doesn't hold
 * the id (deep link / older caller), the viewer falls back to a single photo
 * built from its route params.
 */

export interface ViewerPhoto {
  id: string;
  name?: string;
  type?: string; // 'image' | 'video'
  isFavorite?: string;
  isArchived?: string;
  isTrashed?: string;
  localUri?: string;
  isUploaded?: string;
}

let photos: ViewerPhoto[] = [];

export function setViewerPhotos(list: ViewerPhoto[]): void {
  photos = list;
}

export function getViewerPhotos(): ViewerPhoto[] {
  return photos;
}
