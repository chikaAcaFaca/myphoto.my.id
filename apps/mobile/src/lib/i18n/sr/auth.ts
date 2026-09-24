import type en from '../en/auth';

const auth: typeof en = {
  email: 'Email',
  password: 'Lozinka',
  orEmail: 'ili email',
  continueWithGoogle: 'Nastavi sa Google',
  googleLoginFailed: 'Google prijava nije uspela',
  login: {
    title: 'Dobrodošli nazad',
    subtitle: 'Prijavite se da pristupite svojim slikama',
    fillAllFields: 'Popunite sva polja',
    failed: 'Prijava nije uspela',
    forgotPassword: 'Zaboravljena lozinka?',
    signIn: 'Prijavi se',
    or: 'ili',
    noAccount: 'Nemate nalog? ',
    signUpFree: 'Registrujte se besplatno',
  },
  register: {
    title: 'Kreirajte nalog',
    subtitle: '1 GB besplatno, odmah',
    enterName: 'Unesite vaše ime',
    fillAllFields: 'Popunite sva polja',
    passwordTooShort: 'Lozinka mora imati najmanje 6 karaktera',
    passwordsDontMatch: 'Lozinke se ne poklapaju',
    failed: 'Registracija nije uspela',
    namePlaceholder: 'Vaše ime',
    passwordPlaceholder: 'Lozinka (min 6 karaktera)',
    confirmPasswordPlaceholder: 'Potvrdite lozinku',
    referralPlaceholder: 'Referral kod (opciono, +512 MB)',
    createAccount: 'Kreiraj nalog',
    benefitFree: '1 GB besplatno odmah',
    benefitBackup: '+1 GB kad uključite auto-backup',
    benefitReferral: '+512 MB za svakog prijatelja (do 15)',
    benefitEu: 'EU serveri, GDPR zaštita',
    haveAccount: 'Već imate nalog? ',
    signIn: 'Prijavite se',
  },
};

export default auth;
