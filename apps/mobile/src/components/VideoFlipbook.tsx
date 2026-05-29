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
 */
import { useEffect, useRef, useState } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';

// Process-wide frame cache: uri -> extracted frame file URIs.
const flipbookCache = new Map<string, string[]>();
// Cap concurrent extractions globally so a fast scroll over many videos
// doesn't fire 30 simultaneous one-shot decodes.
let activeExtractions = 0;
const MAX_CONCURRENT_EXTRACT = 2;

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
        const dur = durationMs && durationMs > 0 ? durationMs : 4000;
        // Three frames across the clip → enough for a believable loop.
        const times = [0.12, 0.45, 0.78].map((p) => Math.floor(dur * p));
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
    const t = setInterval(() => setIdx((i) => (i + 1) % frames.length), 600);
    return () => clearInterval(t);
  }, [active, frames]);

  const src = active && frames.length ? frames[idx % frames.length] : fallbackUri;
  return <Image source={{ uri: src }} style={style} resizeMode="cover" />;
}
