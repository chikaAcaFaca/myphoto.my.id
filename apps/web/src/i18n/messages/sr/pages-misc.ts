import type {
  shell as EnShell,
  contact as EnContact,
  support as EnSupport,
  deleteAccount as EnDeleteAccount,
  desktopAuth as EnDesktopAuth,
  meme as EnMeme,
  user as EnUser,
} from '../en/pages-misc';
import type { DeepStrings } from '../types';

export const shell: DeepStrings<typeof EnShell> = {
  home: 'Početna',
  rights: 'Sva prava zadržana.',
  privacy: 'Privatnost',
  terms: 'Uslovi',
  contact: 'Kontakt',
};

export const contact: DeepStrings<typeof EnContact> = {
  meta: {
    title: 'Kontakt',
    description:
      'Kontaktirajte MyPhoto tim — pitanja o privatnom cloud storage-u, planovima, GDPR-u i podršci. Odgovaramo brzo, na srpskom i engleskom.',
    ogTitle: 'Kontakt | MyPhoto',
    ogDescription: 'Pitanja o privatnom cloud storage-u, planovima i podršci. Javite nam se.',
  },
  title: 'Kontaktirajte nas',
  subtitle: 'Imate pitanje, predlog ili vam treba pomoć? Rado ćemo vam odgovoriti.',
  formTitle: 'Pošaljite poruku',
  nameLabel: 'Ime i prezime',
  namePlaceholder: 'Vaše ime',
  emailLabel: 'Email adresa',
  emailPlaceholder: 'vas@email.com',
  subjectLabel: 'Tema',
  subjectPlaceholder: 'Izaberite temu',
  subjects: {
    general: 'Opšte pitanje',
    technical: 'Tehnička podrška',
    billing: 'Plaćanje i pretplata',
    bug: 'Prijava problema',
    suggestion: 'Predlog za poboljšanje',
    partnership: 'Partnerstvo',
  },
  messageLabel: 'Poruka',
  messagePlaceholder: 'Opišite vaše pitanje ili predlog...',
  send: 'Pošalji poruku',
  mailSubject: 'Kontakt sa MyPhoto (myphotomy.space)',
  mailName: 'Ime',
  infoTitle: 'Kontakt informacije',
  emailTitle: 'Email',
  emailHint: 'Za opšta pitanja i podršku',
  hoursTitle: 'Radno vreme podrške',
  hours: 'Pon - Pet: 09:00 - 17:00 CET',
  hoursHint: 'Odgovaramo u roku od 24h',
  locationTitle: 'Lokacija',
  location: 'Evropska Unija',
  locationHint: 'Serveri u Frankfurtu, Nemačka',
  faqTitle: 'Možda je odgovor već tu?',
  faqText: 'Pogledajte najčešća pitanja na stranici za podršku pre nego što pošaljete poruku.',
  faqLink: 'Pogledaj FAQ',
  ctaTitle: 'Još niste korisnik?',
  ctaText: 'Započnite besplatno sa 2,5GB — registracija za 30 sekundi.',
  ctaButton: 'Započni besplatno',
};

export const support: DeepStrings<typeof EnSupport> = {
  meta: {
    title: 'Podrška i pomoć',
    description:
      'Pomoć i podrška za MyPhoto — uputstva za backup fotografija, deljenje albuma, plaćanje i privatnost. Pronađite odgovore ili kontaktirajte naš tim.',
    ogTitle: 'Podrška i pomoć | MyPhoto',
    ogDescription: 'Uputstva za backup, deljenje albuma, plaćanje i privatnost. Tu smo da pomognemo.',
  },
  title: 'Kako vam možemo pomoći?',
  subtitle: 'Pronađite odgovore na najčešća pitanja ili nas kontaktirajte direktno.',
  ctaTitle: 'Niste pronašli odgovor?',
  ctaText: 'Naš tim za podršku je tu da vam pomogne. Javite nam se i odgovorićemo u roku od 24h.',
  ctaButton: 'Kontaktirajte nas',
  categories: {
    account: 'Nalog',
    billing: 'Plaćanje',
    storage: 'Upload i storage',
    sharing: 'Deljenje',
    ai: 'AI funkcije',
    privacy: 'Privatnost i sigurnost',
  },
  faq: {
    account: {
      create: {
        q: 'Kako da kreiram nalog?',
        a: 'Kliknite na "Započni besplatno" na početnoj stranici. Možete se registrovati putem Google naloga ili email adrese. Registracija traje oko 30 sekundi i dobijate 1GB prostora, a do 2,5GB besplatno uz bonuse za aplikaciju i desktop.',
      },
      password: {
        q: 'Kako da promenim lozinku?',
        a: 'Idite na Podešavanja > Nalog > Promena lozinke. Ako ste se registrovali putem Google naloga, lozinka se menja preko Google-a.',
      },
      delete: {
        q: 'Kako da obrišem nalog?',
        a: 'U Podešavanjima naloga možete zatražiti brisanje. Svi vaši podaci će biti trajno obrisani u roku od 30 dana. Pre brisanja, preporučujemo da exportujete svoje fajlove.',
      },
      devices: {
        q: 'Da li mogu da koristim servis sa više uređaja?',
        a: 'Da! Pristupite MyPhoto-u sa bilo kog uređaja — telefon, tablet ili računar. Vaše slike su sinhronizovane i dostupne svuda.',
      },
    },
    billing: {
      plans: {
        q: 'Koji su dostupni planovi?',
        a: 'Nudimo besplatan plan (1GB, do 2,5GB sa bonusima) i više plaćenih planova. Aktuelne veličine i cene su na stranici sa cenama.',
      },
      cancel: {
        q: 'Mogu li da otkažem pretplatu?',
        a: 'Da, možete otkazati u bilo kom trenutku iz podešavanja naloga. Vaš plan ostaje aktivan do kraja plaćenog perioda.',
      },
      periods: {
        q: 'Koji periodi plaćanja su dostupni?',
        a: 'Nudimo mesečno, kvartalno (2.5% popust), polugodišnje (5% popust) i godišnje plaćanje (2 meseca besplatno). Duži period — veći popust.',
      },
      methods: {
        q: 'Koje metode plaćanja prihvatate?',
        a: 'Prihvatamo sve glavne kreditne i debitne kartice (Visa, Mastercard, American Express) putem sigurnog payment procesora.',
      },
    },
    storage: {
      formats: {
        q: 'Koji formati fajlova su podržani?',
        a: 'Podržavamo sve popularne formate: JPEG, PNG, WebP, HEIC, GIF, MP4, MOV i mnoge druge. RAW formati su takođe podržani.',
      },
      compression: {
        q: 'Da li se kvalitet slika kompresuje?',
        a: 'Ne! Čuvamo vaše slike u originalnom kvalitetu, bez kompresije. Svaki piksel ostaje sačuvan tačno onako kako ste ga snimili.',
      },
      full: {
        q: 'Šta se dešava kad popunim storage?',
        a: 'Nećete moći da uploadujete nove fajlove. Vaši postojeći fajlovi ostaju sigurni. Možete nadograditi plan ili osloboditi prostor brisanjem fajlova.',
      },
      export: {
        q: 'Mogu li da exportujem sve svoje slike?',
        a: 'Da! Jednim klikom možete preuzeti sve svoje slike u originalnom kvalitetu. Vaši podaci su uvek vaši.',
      },
    },
    sharing: {
      share: {
        q: 'Kako da podelim sliku?',
        a: 'Otvorite sliku u galeriji, kliknite na ikonu za deljenje i kopirajte link. Možete ga poslati bilo kome — ne moraju da imaju nalog.',
      },
      family: {
        q: 'Šta je Family Sharing?',
        a: 'Family Sharing vam omogućava da dodate do 5 članova porodice koji dele zajednički storage. Svačije slike ostaju privatne — samo storage je zajednički.',
      },
      control: {
        q: 'Mogu li da kontrolišem ko vidi moje slike?',
        a: 'Da, imate potpunu kontrolu. Deljenje je isključeno po defaultu. Kada delite, možete u svakom trenutku deaktivirati link.',
      },
    },
    ai: {
      smartSearch: {
        q: 'Šta je Smart Search?',
        a: 'Smart Search vam omogućava da pretražujete slike opisom — na primer "slike sa plaže" ili "zalazak sunca". AI analizira sadržaj vaših slika i pronalazi tačno ono što tražite.',
      },
      training: {
        q: 'Da li koristite moje slike za AI trening?',
        a: 'Ne, nikada. Vaše slike se koriste isključivo za AI funkcije koje vi aktivirate (pretraga, tagovanje, prepoznavanje lica). Ne delimo ih sa trećim stranama niti ih koristimo za trening modela.',
      },
      faces: {
        q: 'Kako funkcioniše Face Recognition?',
        a: 'AI automatski detektuje i grupiše lica na vašim slikama. Možete im dodeliti imena i lako pronaći sve slike određene osobe. Ova funkcija radi samo na vašim slikama i podaci ne napuštaju EU servere.',
      },
    },
    privacy: {
      location: {
        q: 'Gde se čuvaju moji podaci?',
        a: 'Vaši podaci se čuvaju na serverima u Evropskoj Uniji (Frankfurt, Nemačka), u skladu sa GDPR regulativom.',
      },
      gdpr: {
        q: 'Da li ste GDPR compliant?',
        a: 'Da. U potpunosti poštujemo GDPR regulativu. Imate pravo na pristup, ispravku, brisanje i prenosivost vaših podataka.',
      },
      access: {
        q: 'Ko ima pristup mojim slikama?',
        a: 'Samo vi i korisnici sa kojima eksplicitno podelite slike. Naš tim nema pristup vašem sadržaju osim u slučaju tehničke podrške na vaš zahtev.',
      },
    },
  },
};

export const deleteAccount: DeepStrings<typeof EnDeleteAccount> = {
  meta: {
    title: 'Brisanje naloga',
    description: 'Kako trajno obrisati vaš MyPhoto nalog i sve povezane podatke.',
  },
  title: 'Brisanje MyPhoto naloga',
  appliesBefore: 'Ova stranica se odnosi na aplikaciju ',
  appliesMiddle: ' (Android, web i desktop) čiji je izdavač',
  howTitle: 'Kako obrisati nalog',
  howApp: 'U Android aplikaciji:',
  howAppPath: 'Podešavanja → Obriši nalog',
  howWeb: 'Na sajtu:',
  howWebPath: 'Podešavanja → Privatnost → Obriši nalog i sve podatke',
  howWebAfter: ', ili dugmetom ispod.',
  howEmail: 'Ako više ne možete da se prijavite, pišite na',
  howEmailAfter: 'sa adrese registrovane na nalogu. Ovakve zahteve izvršavamo u roku od 30 dana.',
  deletedTitle: 'Šta se briše',
  deletedText:
    'Odmah i trajno: sve fotografije, video snimci i fajlovi (originali i sličice), albumi, MySpace folderi, memovi i komentari, linkovi za deljenje, registracije uređaja, AI tagovi i grupe lica, vaš profil i vaši podaci za prijavu.',
  keptTitle: 'Šta se zadržava',
  keptText:
    'Evidenciju plaćanja i račune čuva naš platni provajder (merchant of record) onoliko dugo koliko nalaže poreski zakon. Čuvamo anonimni zapis (bez imena, emaila i sadržaja) da je brisanje izvršeno. Šifrovane rezervne kopije se rotiraju i potpuno brišu u roku od 30 dana.',
  signInToDelete: 'Prijavite se da obrišete nalog',
  deleteButton: 'Obriši nalog',
};

export const desktopAuth: DeepStrings<typeof EnDesktopAuth> = {
  subtitle: 'Prijavite se preko Google naloga da povežete desktop aplikaciju.',
  continue: 'Nastavi sa Google',
  wait: 'Sačekajte…',
  badLink: 'Neispravan link (nedostaje port ili state). Pokušajte ponovo iz aplikacije.',
  signingIn: 'Prijavljivanje preko Google naloga…',
  connecting: 'Povezivanje sa MyPhoto aplikacijom…',
  done: 'Prijava uspešna! Možete zatvoriti ovu karticu i vratiti se u MyPhoto aplikaciju.',
  failed: 'Google prijava nije uspela.',
};

export const meme: DeepStrings<typeof EnMeme> = {
  notFoundTitle: 'Meme nije pronađen',
  notFound: 'Meme nije pronađen',
  goHome: 'Idi na MyPhoto',
  metaDescription: '{caption} — Napravljeno u MyPhoto. Napravi i ti svoj meme besplatno!',
  ogDescription: 'Napravi i ti svoj meme besplatno u MyPhoto!',
  twitterDescription: 'Napravi i ti svoj meme besplatno!',
  ctaTitle: 'Napravi i ti svoj meme!',
  ctaText: 'Besplatna registracija. Napravi meme, podeli na MemeWall-u, osvoji lajkove!',
  ctaButton: 'Registruj se besplatno',
  featuresTitle: 'MyPhoto — više od memova',
  featBackup: 'Auto-backup slika sa telefona',
  featStorage: 'Cloud storage za fajlove (MySpace)',
  featAi: 'AI pretraga i tagovanje',
  featMeme: 'Meme generator + MemeWall',
  featFamily: 'Family plan — deli sa porodicom',
  featPrivacy: 'EU serveri, GDPR, bez AI treninga',
  justNow: 'upravo sad',
  minutesAgo: 'pre {n} min',
  hoursAgo: 'pre {n} h',
  daysAgo: 'pre {n} d',
  shareText: '{caption} — Napravljeno u MyPhoto',
  linkCopied: 'Link kopiran!',
  commentFailed: 'Slanje komentara nije uspelo.',
  commentError: 'Greška pri slanju komentara.',
  commentsTitle: 'Komentari ({count})',
  commentLabel: 'Napiši komentar',
  commentPlaceholder: 'Napiši komentar...',
  commentSubmit: 'Objavi komentar',
  commentSending: 'Šaljem...',
  signIn: 'Prijavi se',
  signInToComment: 'da ostaviš komentar.',
  commentsLoading: 'Učitavanje komentara...',
  noComments: 'Još nema komentara. Budi prvi!',
};

export const user: DeepStrings<typeof EnUser> = {
  loading: 'Učitavanje profila...',
  notFound: 'Korisnik nije pronađen',
  goMemeWall: 'Idi na MemeWall',
  memes: 'memova',
  followers: 'pratilaca',
  following: 'prati',
  follow: 'Zaprati',
  unfollow: 'Otprati',
  publicMemes: 'Javni memovi',
  memesLoading: 'Učitavanje memova...',
  noMemes: 'Ovaj korisnik još nije objavio nijedan meme.',
};
