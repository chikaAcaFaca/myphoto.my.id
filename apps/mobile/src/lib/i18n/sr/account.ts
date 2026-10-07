import type en from '../en/account';

const account: typeof en = {
  title: 'Brisanje naloga',
  deletedTitle: 'Nalog je obrisan',
  deletedMessage: 'Svi vaši podaci su trajno uklonjeni.',
  wrongPassword: 'Pogrešna lozinka.',
  deleteFailed: 'Brisanje nije uspelo. Pokušajte ponovo.',
  warning:
    'Trajno se brišu sve fotografije, video snimci, MySpace fajlovi, albumi, memovi, deljeni linkovi i sam nalog{email}. Ovo se ne može poništiti.',
  typeToConfirm: 'Upišite DELETE za potvrdu',
  password: 'Lozinka',
  googleHint: 'Posle potvrde, Google će tražiti da ponovo izaberete svoj nalog.',
  deleteForever: 'Obriši nalog zauvek',
};

export default account;
