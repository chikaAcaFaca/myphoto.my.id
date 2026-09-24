import type en from '../en/libs';

const libs: typeof en = {
  auth: {
    googleNoIdToken: 'Google nije vratio ID token',
    googleSignInError: 'Google prijava nije uspela.',
    googleNotConfigured: 'Google Client ID nije konfigurisan u .env',
    googleNotReady: 'Google auth nije spreman — pokušaj ponovo za par sekundi.',
    notSignedIn: 'Niste prijavljeni',
    enterPassword: 'Unesite lozinku',
    differentGoogleAccount: 'Izabran je drugi Google nalog',
    deleteFailed: 'Brisanje nije uspelo (HTTP {status})',
  },
  cloudDownload: {
    noDownloadUrl: 'Nije moguće dobiti link za preuzimanje.',
    downloadFailed: 'Preuzimanje nije uspelo.',
  },
};

export default libs;
