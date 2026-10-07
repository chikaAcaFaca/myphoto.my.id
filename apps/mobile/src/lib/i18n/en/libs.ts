// User-facing messages raised by smaller libs (screens show them via err.message).
const libs = {
  auth: {
    googleNoIdToken: "Google didn't return an ID token.",
    googleSignInError: 'Google sign-in failed.',
    googleNotConfigured: 'Google Client ID is not configured in .env',
    googleNotReady: "Google sign-in isn't ready yet — try again in a few seconds.",
    notSignedIn: "You're not signed in.",
    enterPassword: 'Enter your password.',
    differentGoogleAccount: 'A different Google account was selected.',
    deleteFailed: 'Account deletion failed (HTTP {status}).',
  },
  cloudDownload: {
    noDownloadUrl: "Couldn't get a download link.",
    downloadFailed: 'Download failed.',
  },
};

export default libs;
