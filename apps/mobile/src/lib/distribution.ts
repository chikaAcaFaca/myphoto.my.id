/**
 * Which store this build ships through.
 *
 *   EXPO_PUBLIC_DISTRIBUTION=direct  → sideloaded APK from myphotomy.space:
 *                                      in-app plan purchase (web checkout) OK.
 *   anything else (default: play)    → Google Play build: CONSUMPTION-ONLY.
 *
 * Google Play's payments policy lets an app unlock things bought elsewhere,
 * but only if the app itself sells nothing: no buy buttons, no prices, no
 * links or deep links into a checkout. Selling through our own MoR (Creem)
 * from inside a Play build would get the app rejected or removed. Default is
 * `play` so a forgotten env var fails safe, not into a policy violation.
 */
export const DISTRIBUTION: 'play' | 'direct' =
  process.env.EXPO_PUBLIC_DISTRIBUTION === 'direct' ? 'direct' : 'play';

export const CAN_SELL_IN_APP = DISTRIBUTION === 'direct';
