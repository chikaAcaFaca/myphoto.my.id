/**
 * A crash-safe "moving picture" preview for a video tile in a dense grid.
 *
 * Mounting many expo-av <Video> players in the photo grid was crashing the
 * app (each one is a live native MediaPlayer/decoder — 9 of them + background
 * upload I/O = OOM / native AV crash). Instead of a real player we extract a
 * few still frames with expo-video-thumbnails and cross-fade between them on a
 * timer, so the tile reads as motion (like a GIF / Live Photo) with ZERO
 * persistent decoders — just bitmaps that the OS can evict freely.
 *
 * Frames are cached process-wide by URI so re-scrolling never re-extracts, and
 * extraction failures fall back silently to the static thumbnail.
 *
 * Sampling matters: we pull several frames from a SHORT window at the START of
 * the clip (not spread across the whole thing) so the loop reads as real motion
 * — 6 frames out of the first ~2s looks like a moving clip; 3 frames spread
 * across a 2-minute video just looked like 3 unrelated stills. All extraction
 * runs on-device (expo-video-thumbnails) — zero server cost.
 */
import { useEffect, useRef, useState } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';

// Process-wide frame cache: uri -> extracted frame file URIs.
const flipbookCache = new Map<string, string[]>();
// Cap concurrent extractions globally so a fast scroll over many videos
// doesn't fire a burst of one-shot decodes.
let activeExtractions = 0;
const MAX_CONCURRENT_EXTRACT = 2;

// Sample N frames from the first PREVIEW_WINDOW_MS of the clip.
// 24 frames across 3 seconds (~8 fps) reads as continuous motion — close to
// real video playback rather than a slideshow. Initial extraction is heavier
// (still capped to 2 concurrent globally) but it's a one-time cost per clip;
// cached forever after.
const FRAME_COUNT = 24;
const PREVIEW_WINDOW_MS = 3000;
// 24 × 125ms = 3s loop → frames replay at the same cadence they were sampled.
const FRAME_INTERVAL_MS = 125;

export function VideoFlipbook({
  videoUri,
  fallbackUri,
  durationMs,
  active,
  style,
}: {
  videoUri: string;
  fallbackUri: string;
  durationMs?: number;
  active: boolean;
  style?: StyleProp<ImageStyle>;
}) {
  const [frames, setFrames] = useState<string[]>(() => flipbookCache.get(videoUri) || []);
  const [idx, setIdx] = useState(0);

  // Extract frames once per URI, only while the tile is active (visible).
  useEffect(() => {
    if (!active) return;
    if (flipbookCache.has(videoUri)) { setFrames(flipbookCache.get(videoUri)!); return; }

    let cancelled = false;
    const run = async () => {
      // Light back-pressure: if we're already extracting the max, retry
      // shortly — keeps CPU spikes bounded during a fast scroll.
      if (activeExtractions >= MAX_CONCURRENT_EXTRACT) {
        setTimeout(() => { if (!cancelled) run(); }, 250);
        return;
      }
      activeExtractions++;
      try {
        const dur = durationMs && durationMs > 0 ? durationMs : PREVIEW_WINDOW_MS;
        // Sample consecutive frames from a short window at the start of the
        // clip (capped at the clip length for very short videos), skipping a
        // tiny lead-in so we don't grab a black first frame.
        const windowEnd = Math.min(PREVIEW_WINDOW_MS, dur);
        const start = Math.min(100, windowEnd * 0.05);
        const step = (windowEnd - start) / Math.max(1, FRAME_COUNT - 1);
        const times = Array.from({ length: FRAME_COUNT }, (_, i) => Math.floor(start + step * i));
        const out: string[] = [];
        for (const t of times) {
          if (cancelled) return;
          try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: t, quality: 0.4 });
            out.push(uri);
          } catch { /* skip this frame */ }
        }
        if (!cancelled && out.length) {
          flipbookCache.set(videoUri, out);
          setFrames(out);
        }
      } finally {
        activeExtractions = Math.max(0, activeExtractions - 1);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [active, videoUri, durationMs]);

  // Cycle frames while active. No timer when not animating (saves work when
  // the tile scrolls off or we only got a single frame).
  useEffect(() => {
    if (!active || frames.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % frames.length), FRAME_INTERVAL_MS);
    return () => clearInterval(t);
  }, [active, frames]);

  const src = active && frames.length ? frames[idx % frames.length] : fallbackUri;
  return <Image source={{ uri: src }} style={style} resizeMode="cover" />;
}
