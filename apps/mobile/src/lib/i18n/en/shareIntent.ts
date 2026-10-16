// Files shared into the app from other apps (Android share sheet).
const shareIntent = {
  signInTitle: 'Sign in',
  signInBody: 'Sign in to upload shared files.',
  uploadedTitle: 'Uploaded',
  uploadedBody: {
    one: '{count} file is now in your space — folder "{folder}".',
    few: '{count} files are now in your space — folder "{folder}".',
    other: '{count} files are now in your space — folder "{folder}".',
  },
  openMySpace: 'Open MySpace',
  errorTitle: 'Error',
  errorBody: "The shared file couldn't be uploaded.",
};

export default shareIntent;
