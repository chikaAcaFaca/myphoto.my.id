// Install guide video per site language (avatar explains the install), served
// from public/videos with a .jpg poster of the same name. Empty = no video.
// Plain module so both the client install guide and the server /download page
// can read it.
export const INSTALL_VIDEOS: Record<'sr' | 'en', string> = {
  sr: '/videos/install-sr.mp4',
  en: '/videos/install-en.mp4',
};
