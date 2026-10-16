import type en from '../en/shareIntent';

const shareIntent: typeof en = {
  signInTitle: 'Prijava',
  signInBody: 'Prijavi se da bi otpremio podeljene fajlove.',
  uploadedTitle: 'Otpremljeno',
  uploadedBody: {
    one: '{count} fajl je u tvom prostoru — folder „{folder}".',
    few: '{count} fajla su u tvom prostoru — folder „{folder}".',
    other: '{count} fajlova je u tvom prostoru — folder „{folder}".',
  },
  openMySpace: 'Otvori MySpace',
  errorTitle: 'Greška',
  errorBody: 'Podeljeni fajl nije uspeo da se otpremi.',
};

export default shareIntent;
