import type { marketing as En } from '../en/marketing';
import type { DeepStrings } from '../types';

export const marketing: DeepStrings<typeof En> = {
  shared: {
    startFree: 'Započnite besplatno',
    switchToday: 'Prebacite se danas',
    seePlans: 'Pogledajte planove',
    faqTitle: 'Često postavljana pitanja',
    detailedComparison: 'Detaljno poređenje',
    feature: 'Funkcija',
    breadcrumbHome: 'Početna',
    breadcrumbFeatures: 'Funkcije',
    breadcrumbCompare: 'Poređenje',
    freeNoCard: '1 GB besplatno na startu — do 2,5 GB uz preporuke. Bez kreditne kartice. Bez obaveza.',
  },

  nav: {
    backup: 'Backup',
    privacy: 'Privatnost',
    sharing: 'Deljenje',
    compare: 'Poređenje',
    pricing: 'Cene',
    memeWall: '🔥 MemeWall',
    download: 'Preuzimanje',
    blog: 'Blog',
    openApp: 'Otvori App',
    login: 'Prijava',
    freeAccount: 'Besplatan nalog',
  },

  footer: {
    product: 'Proizvod',
    autoBackup: 'Auto Backup',
    privateStorage: 'Privatni Storage',
    photoSharing: 'Deljenje Slika',
    pricing: 'Cene',
    download: 'Preuzimanje',
    memeWall: 'MemeWall',
    compare: 'Poređenje',
    vsGoogle: 'vs Google Photos',
    vsIcloud: 'vs iCloud',
    resources: 'Resursi',
    blog: 'Blog',
    support: 'Podrška',
    contact: 'Kontakt',
    legal: 'Pravno',
    privacy: 'Privatnost',
    terms: 'Uslovi korišćenja',
    copyright: '© {year} MyPhoto (myphotomy.space) — NASRM Kapetan Bogdan Studio. EU serveri, GDPR zaštita.',
  },

  home: {
    androidBanner: {
      title: 'Android aplikacija je tu.',
      download: 'Preuzmi APK',
      guide: 'Uputstvo za instalaciju',
      close: 'Zatvori',
    },
    header: {
      login: 'Prijava',
      startFree: 'Započni besplatno',
    },
    hero: {
      word1: 'Vaše',
      word2: 'slike.',
      gradient1: 'Samo',
      gradient2: 'vaše.',
      subtitle: 'Privatni cloud storage sa AI funkcijama. Bez kompresije, bez kompromisa.',
      proofStrong: 'Original kvalitet',
      proofRest: '· EU serveri · GDPR — tvoje slike ostaju samo tvoje',
      ctaPrimary: 'Započni besplatno — 1 GB',
      ctaSecondary: 'Pogledaj planove',
      badgeNoAi: 'Ne koristimo slike za AI trening',
      badgeEu: 'EU Serveri',
      badgeGdpr: 'GDPR Compliant',
    },
    proof: {
      tagline: 'Napravljeno za fotografe, porodice i sve koji drže do privatnosti',
      freeLabel: 'besplatno na startu',
      compressionLabel: 'kompresija — original kvalitet',
      euLabel: 'serveri · GDPR',
    },
    comparison: {
      title: 'Zašto MyPhoto?',
      subtitle: 'Uporedite nas sa konkurencijom',
      feature: 'Funkcija',
      cta: 'Prebacite se danas',
      partial: 'Delimično',
      rows: {
        original: 'Original kvalitet (bez kompresije)',
        eu: 'EU serveri',
        gdpr: 'GDPR usklađenost',
        noAi: 'Bez AI treninga na vašim slikama',
        starter: 'Početni plan',
        pricePerGb: 'Cena po GB',
        family: 'Family sharing',
      },
    },
    features: {
      title: 'Sve što vam treba',
      subtitle: 'Vaše uspomene nisu naš proizvod',
      cloud: {
        title: 'Siguran Cloud Storage',
        description: 'Vaši fajlovi su enkriptovani i čuvani na enterprise-grade infrastrukturi u EU.',
      },
      original: {
        title: 'Original Kvalitet',
        description: 'Bez kompresije. Svaki piksel sačuvan. RAW format podrška.',
      },
      gdpr: {
        title: 'GDPR Compliant',
        description: 'Podaci na EU serverima. Pravo na brisanje garantovano.',
      },
      ai: {
        title: 'AI Pretraga',
        description: 'Pretražujte slike prirodnim jezikom. "Plaža u Hrvatskoj" — AI pronalazi.',
      },
      family: {
        title: 'Family Sharing',
        description: 'Delite storage sa porodicom. Svako ima privatni prostor.',
      },
      sync: {
        title: 'Brza Sinhronizacija',
        description: 'Upload i pristup slikama munjevitom brzinom sa bilo kog uređaja.',
      },
    },
    aiDemo: {
      titleStart: 'Pretražite slike',
      titleGradient: 'rečima',
      subtitle: 'AI pretraga razume prirodni jezik — opišite sliku i pronađite je',
      query: 'zalazak sunca na moru',
      cta: 'Probajte AI — besplatno',
      results: {
        dubrovnik: 'Zalazak sunca — Dubrovnik',
        zlatniRat: 'More — Zlatni rat',
        montenegro: 'Plaža — Crna Gora',
        zadar: 'Sumrak — Zadar',
      },
    },
    steps: {
      title: 'Kako funkcioniše?',
      subtitle: 'Tri jednostavna koraka do sigurnog čuvanja',
      cta: 'Započnite za 30 sekundi',
      upload: {
        title: 'Upload',
        description: 'Prevucite slike ili koristite auto-sync. Sve u originalnom kvalitetu.',
      },
      organize: {
        title: 'AI Organizuje',
        description: 'AI automatski taguje, prepoznaje lica i kategorizuje vaše slike.',
      },
      share: {
        title: 'Delite & Čuvajte',
        description: 'Sigurno deljenje sa porodicom. Vaše uspomene, zauvek sačuvane.',
      },
    },
    pricing: {
      title: 'Izaberite plan',
      subtitle: 'Započnite besplatno, nadogradite kad poželite',
      monthly: 'Mesečno',
      yearly: 'Godišnje',
      twoMonthsFree: '2 mes. gratis',
      mostPopular: 'NAJPOPULARNIJI',
      free: 'Besplatno',
      perMonth: '/mes',
      perYear: '/god',
      startFree: 'Započni besplatno',
      choosePlan: 'Izaberi plan',
      seeAll: 'Pogledaj sve planove',
      tierFeatures: {
        backup: 'MyPhoto auto-backup slika i videa',
        myspace: 'MySpace cloud storage za fajlove',
        ai: 'AI pretraga, auto-tagging, face recognition',
      },
    },
    why: {
      title: 'Zašto ljudi biraju MyPhoto',
      subtitle: 'Iskrene prednosti — bez sitnih slova i bez kompromisa oko tvoje privatnosti',
      cta: 'Pridružite se — besplatno',
      original: {
        title: 'Original kvalitet',
        text: 'Nula kompresije. Fotografije se čuvaju u punoj rezoluciji — tačno onakve kakve si ih napravio.',
      },
      private: {
        title: 'Privatno po dizajnu',
        text: 'Ne treniramo AI na tvojim slikama. EU serveri, GDPR usklađenost i enkripcija podataka.',
      },
      ai: {
        title: 'AI pretraga',
        text: 'Ukucaj „zalazak sunca na moru" i pronađi tačno te slike — bez ručnog označavanja.',
      },
      sharing: {
        title: 'Deljenje sa kontrolom',
        text: 'Deli albume linkom, biraj ko šta vidi, i deli prostor sa porodicom.',
      },
    },
    finalCta: {
      title: 'Započnite za 30 sekundi',
      subtitle: '1 GB besplatno na startu — do 2,5 GB uz preporuke. Bez kreditne kartice. Bez obaveza.',
      start: 'Započni besplatno',
      compare: 'Uporedi planove',
    },
    footer: {
      description: 'Privatni cloud storage za vaše slike i video zapise. Bez kompresije, sa AI funkcijama i GDPR zaštitom.',
      product: 'Proizvod',
      pricing: 'Cene',
      register: 'Registracija',
      login: 'Prijava',
      support: 'Podrška',
      help: 'Pomoć',
      contact: 'Kontakt',
      legal: 'Pravno',
      privacy: 'Privatnost',
      terms: 'Uslovi korišćenja',
      rights: 'MyPhoto — Sva prava zadržana.',
    },
    stickyCta: 'Započni besplatno — 1 GB',
  },

  blog: {
    meta: {
      title: 'Blog — MyPhoto',
      description: 'Saveti o privatnosti fotografija, cloud backup-u, GDPR zaštiti i poređenju servisa za čuvanje slika.',
      jsonLdDescription: 'Saveti o privatnosti fotografija, cloud backup-u i GDPR zaštiti.',
      notFound: 'Članak nije pronađen',
    },
    heading: 'Blog',
    subtitle: 'Saveti o privatnosti, backup-u i čuvanju vaših najvrednijih uspomena.',
    readMore: 'Čitaj više',
    backToBlog: 'Nazad na blog',
    cta: {
      title: 'Isprobajte MyPhoto besplatno',
      text: '1 GB besplatnog prostora — do 2,5 GB uz preporuke. Bez kreditne kartice.',
      button: 'Kreirajte besplatan nalog',
    },
  },

  photoBackup: {
    meta: {
      title: 'Automatski backup svih slika i videa | MyPhoto',
      description:
        'Aplikacija za automatski backup koja čuva sve vaše slike i videe u sigurnom cloud-u. Original kvalitet, bez kompresije. EU serveri, GDPR usklađenost.',
      ogDescription:
        'Aplikacija za automatski backup koja čuva sve vaše slike i videe u sigurnom cloud-u. Original kvalitet, EU serveri.',
      ogAlt: 'MyPhoto — automatski backup slika',
      jsonLdDescription: 'Aplikacija za automatski backup slika sa sigurnim cloud storage-om. Original kvalitet, EU serveri, GDPR usklađenost.',
      breadcrumb: 'Backup slika',
    },
    hero: {
      title: 'Automatski backup svih slika i videa',
      subtitle:
        'Nikad više ne brinite o izgubljenim slikama. MyPhoto automatski čuva svaki momenat u originalnom kvalitetu na sigurnim EU serverima.',
      cta: 'Započnite besplatno',
    },
    how: {
      title: 'Kako funkcioniše?',
      subtitle: 'Tri jednostavna koraka do potpune sigurnosti vaših uspomena',
    },
    steps: {
      install: {
        title: 'Instalirajte aplikaciju',
        description: 'Preuzmite MyPhoto aplikaciju sa Google Play Store-a i prijavite se na svoj nalog.',
      },
      enable: {
        title: 'Uključite auto backup',
        description: 'Jednim klikom aktivirajte automatski backup svih slika i videa sa vašeg telefona.',
      },
      enjoy: {
        title: 'Uživajte u sigurnosti',
        description: 'Vaše slike se automatski čuvaju u originalnom kvalitetu na sigurnim EU serverima.',
      },
    },
    whyTitle: 'Zašto izabrati MyPhoto za backup?',
    features: {
      background: {
        title: 'Automatski u pozadini',
        description: 'Backup se pokreće automatski kada ste na Wi-Fi mreži. Bez baterijske potrošnje.',
      },
      original: {
        title: 'Original kvalitet',
        description: 'Svaki piksel sačuvan. Bez kompresije, bez gubitka kvaliteta. RAW podrška.',
      },
      encryption: {
        title: 'Enkripcija u prenosu',
        description: 'TLS enkripcija tokom prenosa i AES-256 enkripcija na serveru.',
      },
      eu: {
        title: 'EU serveri',
        description: 'Podaci se čuvaju isključivo na serverima u Evropskoj Uniji (Frankfurt).',
      },
      devices: {
        title: 'Višestruki uređaji',
        description: 'Backup sa svih vaših uređaja na jedan nalog. Telefon, tablet, desktop.',
      },
      anywhere: {
        title: 'Pristup svuda',
        description: 'Pristupite svim slikama sa bilo kog uređaja putem web pregledača ili aplikacije.',
      },
    },
    android: {
      title: 'Preuzmite Android aplikaciju',
      text: 'Instalirajte MyPhoto na vaš Android telefon i aktivirajte automatski backup za sve vaše slike i video zapise.',
      play: 'Preuzmite sa Google Play',
      web: 'Ili započnite na webu',
    },
    faqs: {
      battery: {
        q: 'Da li backup troši puno baterije?',
        a: 'Ne. MyPhoto koristi optimizovane pozadinske procese koji minimalno utiču na bateriju. Backup se podrazumevano pokreće samo na Wi-Fi mreži.',
      },
      compression: {
        q: 'Da li se slike kompresuju prilikom backup-a?',
        a: 'Ne. Sve slike i videi se čuvaju u originalnom kvalitetu, bez ikakve kompresije ili smanjenja rezolucije.',
      },
      lostPhone: {
        q: 'Šta se dešava ako izgubim telefon?',
        a: 'Sve vaše slike su sigurno sačuvane u cloud-u. Prijavite se na novi uređaj i pristupite svim uspomenama.',
      },
      freeSpace: {
        q: 'Koliko prostora dobijem besplatno?',
        a: 'Besplatni plan počinje sa 1GB. Za svakog pozvanog prijatelja koji počne da koristi MyPhoto (otpremi 100MB) dobijate +250MB — do 6 prijatelja, dakle ukupno do 2,5GB. Memovi koje objavite na meme zidu troše vaš prostor.',
      },
    },
    final: {
      title: 'Sačuvajte vaše uspomene danas',
      cta: 'Započnite besplatno',
    },
  },

  photoSharing: {
    meta: {
      title: 'Bezbedno deljenje albuma | MyPhoto',
      description:
        'Jednostavno i bezbedno deljenje slika: albumi zaštićeni lozinkom, linkovi sa istekom i porodično deljenje. Delite slike bez kompromisa oko privatnosti.',
      ogDescription:
        'Jednostavno i bezbedno deljenje slika: albumi zaštićeni lozinkom, linkovi sa istekom i porodično deljenje.',
      ogAlt: 'MyPhoto — bezbedno deljenje slika',
      jsonLdDescription:
        'Bezbedno deljenje slika sa albumima zaštićenim lozinkom, linkovima sa istekom i porodičnim deljenjem.',
      breadcrumb: 'Deljenje slika',
    },
    hero: {
      title: 'Bezbedno delite albume',
      subtitle:
        'Delite vaše najlepše trenutke sa porodicom i prijateljima, bez kompromisa oko privatnosti i kvaliteta.',
      cta: 'Započnite besplatno',
    },
    how: {
      title: 'Kako funkcioniše deljenje?',
      subtitle: 'Tri jednostavna koraka do sigurnog deljenja',
    },
    steps: {
      select: {
        title: 'Izaberite slike ili album',
        description: 'Odaberite slike koje želite da podelite ili kreirajte novi album.',
      },
      access: {
        title: 'Podesite pristup',
        description: 'Odaberite ko može da vidi slike, postavite lozinku ili istek linka.',
      },
      share: {
        title: 'Podelite link',
        description: 'Pošaljite link putem poruke, emaila ili društvenih mreža.',
      },
    },
    featuresTitle: 'Funkcije deljenja',
    features: {
      oneClick: {
        title: 'Deljenje albuma jednim klikom',
        description: 'Kreirajte link za deljenje albuma sa porodicom i prijateljima. Bez potrebe da imaju nalog.',
      },
      password: {
        title: 'Zaštita lozinkom',
        description: 'Postavite lozinku na deljene albume za dodatni sloj sigurnosti i kontrole pristupa.',
      },
      expiring: {
        title: 'Linkovi sa istekom',
        description: 'Kreirajte linkove koji automatski ističu posle određenog vremena. Vi kontrolišete pristup.',
      },
      access: {
        title: 'Kontrola pristupa',
        description: 'Odredite ko može da pregleda, preuzme ili komentariše vaše slike. Potpuna kontrola u vašim rukama.',
      },
      original: {
        title: 'Deljenje u originalnom kvalitetu',
        description: 'Slike se dele u punom, originalnom kvalitetu. Bez kompresije, bez gubitka detalja.',
      },
      devices: {
        title: 'Pregled na svim uređajima',
        description: 'Deljeni albumi se prikazuju savršeno na telefonu, tabletu i desktop-u.',
      },
    },
    family: {
      title: 'Porodično deljenje',
      text: 'Pozovite članove porodice da dele storage dok svako zadržava privatnost svojih slika. Zajednički porodični album za najlepše momente.',
      badgeTitle: 'Family Sharing',
      badgeText: 'Do 5 članova • Privatni prostori • Zajednički album',
      items: {
        members: 'Dodajte do 5 članova porodice',
        privateSpace: 'Svako ima privatni prostor za slike',
        album: 'Deljeni porodični album',
        manage: 'Jednostavno upravljanje članovima',
        price: '€2/mesečno po dodatnom članu',
        pool: 'Zajednički storage pool',
      },
    },
    control: {
      title: 'Potpuna kontrola pristupa',
      subtitle: 'Vi odlučujete ko vidi vaše slike i koliko dugo',
      password: {
        title: 'Zaštita lozinkom',
        text: 'Samo osobe sa lozinkom mogu pristupiti deljenom albumu. Lozinku možete promeniti ili ukloniti u bilo kom trenutku.',
      },
      expiry: {
        title: 'Istek linka',
        text: 'Linkovi za deljenje mogu imati datum isteka. Posle tog datuma, link prestaje da radi automatski.',
      },
      download: {
        title: 'Dozvole za preuzimanje',
        text: 'Kontrolišite da li primaoci mogu da preuzmu originalne slike ili samo da ih pregledaju online.',
      },
      revoke: {
        title: 'Opoziv pristupa',
        text: 'Opozovite pristup bilo kada jednim klikom. Deljeni link odmah prestaje da radi.',
      },
    },
    final: {
      title: 'Počnite da delite uspomene',
      text: 'Sigurno deljenje slika sa porodicom i prijateljima. Do 2,5GB besplatno.',
      cta: 'Započnite besplatno',
    },
  },

  privateStorage: {
    meta: {
      title: 'Vaše slike, vaša privatnost | MyPhoto',
      description:
        'Privatni storage za slike sa GDPR usklađenošću, EU serverima i enkripcijom. Vaše slike se nikada ne koriste za AI trening. Siguran, privatan cloud za vaše uspomene.',
      ogDescription:
        'Privatni storage za slike sa GDPR usklađenošću, EU serverima i enkripcijom. Vaše slike se nikada ne koriste za AI trening.',
      ogAlt: 'MyPhoto — privatni storage za slike',
      jsonLdDescription:
        'Privatan i siguran storage za slike sa GDPR usklađenošću, EU serverima i end-to-end enkripcijom.',
      breadcrumb: 'Privatni storage',
    },
    hero: {
      title: 'Vaše slike, vaša privatnost',
      subtitle:
        'Vaše slike zaslužuju privatnost. MyPhoto čuva vaše uspomene na EU serverima sa GDPR zaštitom, bez kompromisa.',
      cta: 'Započnite besplatno',
    },
    promise: {
      title: 'Naše obećanje privatnosti',
      subtitle: 'Vaše uspomene nisu naš proizvod',
    },
    trust: {
      noAi: 'Ne koristimo slike za AI trening',
      noScan: 'Ne skeniramo sadržaj za reklame',
      noShare: 'Ne delimo podatke sa trećim stranama',
      noProfile: 'Ne profilišemo korisnike',
      eu: 'EU serveri, GDPR zaštita',
      export: 'Export svih podataka jednim klikom',
    },
    protectTitle: 'Kako štitimo vaše podatke',
    features: {
      noAi: {
        title: 'Bez AI treninga na vašim slikama',
        description: 'Vaše slike se nikada ne koriste za treniranje AI modela. Ne skeniramo sadržaj za reklame ili profilisanje.',
      },
      eu: {
        title: 'EU serveri (Frankfurt)',
        description: 'Svi podaci se čuvaju isključivo na serverima u Evropskoj Uniji, u skladu sa GDPR regulativom.',
      },
      aes: {
        title: 'AES-256 enkripcija',
        description: 'Vaši podaci su enkriptovani TLS-om u prenosu i AES-256 enkripcijom na serveru. Zero-knowledge opcija dostupna.',
      },
      gdpr: {
        title: 'GDPR usklađenost',
        description: 'Puno pravo na pristup, export i trajno brisanje svih vaših podataka u bilo kom trenutku.',
      },
      noThirdParty: {
        title: 'Bez deljenja sa trećim stranama',
        description: 'Vaši podaci se nikada ne dele sa trećim stranama. Bez reklamnih partnera, bez data brokera.',
      },
      transparent: {
        title: 'Transparentna politika privatnosti',
        description: 'Jasna i razumljiva politika privatnosti. Bez skrivenih klauzula ili sitnih slova.',
      },
    },
    gdpr: {
      title: 'Potpuna GDPR usklađenost',
      text: 'MyPhoto je dizajniran od temelja sa privatnošću na prvom mestu. Svaka funkcija je usklađena sa GDPR regulativom Evropske Unije.',
      access: 'Pravo na pristup svim vašim podacima',
      erasure: 'Pravo na brisanje (pravo da budete zaboravljeni)',
      portability: 'Pravo na portabilnost podataka (export jednim klikom)',
      dpa: 'DPA (Data Processing Agreement) dostupan',
      badgeTitle: 'GDPR Compliant',
      badgeText: 'EU serveri • AES-256 • Zero-knowledge opcija',
    },
    faqTitle: 'Pitanja o privatnosti',
    faqs: {
      aiTraining: {
        q: 'Da li se moje slike koriste za trening AI modela?',
        a: 'Ne. MyPhoto nikada ne koristi vaše slike za treniranje AI modela. Vaši podaci su vaši i služe isključivo za funkcije koje vi koristite.',
      },
      location: {
        q: 'Gde se čuvaju moji podaci?',
        a: 'Svi podaci se čuvaju na serverima u Evropskoj Uniji (Frankfurt, Nemačka), u potpunosti u skladu sa GDPR regulativom.',
      },
      gdpr: {
        q: 'Da li je MyPhoto GDPR usklađen?',
        a: 'Da. MyPhoto je u potpunosti GDPR usklađen. Imate pravo na pristup, export i trajno brisanje svih vaših podataka u bilo kom trenutku.',
      },
      encryption: {
        q: 'Kakvu enkripciju koristi MyPhoto?',
        a: 'Koristimo TLS enkripciju za podatke u prenosu i AES-256 enkripciju za podatke na serveru. Zero-knowledge enkripcija je dostupna za premium korisnike.',
      },
      delete: {
        q: 'Mogu li obrisati sve svoje podatke?',
        a: 'Da. U bilo kom trenutku možete obrisati sve svoje podatke jednim klikom. Brisanje je trajno i nepovratno, u skladu sa GDPR pravom na brisanje.',
      },
    },
    final: {
      title: 'Zaštitite vaše uspomene danas',
      text: 'Privatni cloud storage sa GDPR zaštitom. Do 2,5GB besplatno.',
      cta: 'Započnite besplatno',
    },
  },

  compareGoogle: {
    meta: {
      title: 'MyPhoto vs Google Photos: zašto preći? | MyPhoto',
      description:
        'Uporedite MyPhoto i Google Photos. Bolja privatnost, EU serveri, bez AI treninga na vašim slikama, original kvalitet i konkurentne cene. Najbolja alternativa za Google Photos.',
      ogDescription:
        'Uporedite MyPhoto i Google Photos. Bolja privatnost, EU serveri, original kvalitet i konkurentne cene.',
      ogAlt: 'Poređenje MyPhoto i Google Photos',
      breadcrumb: 'vs Google Photos',
    },
    hero: {
      title: 'MyPhoto vs Google Photos: zašto preći?',
      subtitle: 'Uporedite MyPhoto i Google Photos. Saznajte zašto sve više korisnika prelazi na privatniju alternativu.',
    },
    whyTitle: 'Zašto preći sa Google Photos-a?',
    reasons: {
      privacy: {
        title: 'Privatnost na prvom mestu',
        description: 'Google koristi vaše podatke za personalizaciju reklama. MyPhoto nikada ne skenira vaše slike niti deli podatke sa oglašivačima.',
      },
      eu: {
        title: 'EU serveri, ne američki',
        description: 'Vaši podaci su na serverima u Frankfurt-u, zaštićeni GDPR regulativom, a ne na US serverima podložnim CLOUD Act-u.',
      },
      compression: {
        title: 'Bez kompresije',
        description: 'Google Photos kompresuje slike u besplatnom planu. MyPhoto čuva svaki piksel u originalnom kvalitetu.',
      },
      price: {
        title: 'Bolja cena po GB',
        description: 'MyPhoto nudi €0.017 po GB u odnosu na Google-ovih €0.021 po GB. Više prostora za manje novca.',
      },
    },
    rows: {
      privacy: { feature: 'Privatnost slika', myphoto: 'Nikad za AI trening', google: 'Koristi za poboljšanje servisa' },
      servers: { feature: 'Lokacija servera', myphoto: 'EU (Frankfurt)', google: 'SAD (globalno)' },
      gdpr: { feature: 'GDPR usklađenost', myphoto: 'Potpuna', google: 'Delimična' },
      quality: { feature: 'Kvalitet čuvanja', myphoto: 'Original (bez kompresije)', google: 'Kompresovan u besplatnom planu' },
      pricePerGb: { feature: 'Cena po GB', myphoto: '€0.017/GB', google: '€0.021/GB' },
      freePlan: { feature: 'Besplatan plan', myphoto: '1 GB (do 2,5 GB uz preporuke)', google: '15 GB (deljen sa Gmail-om)' },
      aiSearch: { feature: 'AI pretraga', myphoto: 'Da (opcioni AI plan)', google: 'Da (uključeno)' },
      faces: { feature: 'Prepoznavanje lica', myphoto: 'Da (opcioni AI plan)', google: 'Da' },
      family: { feature: 'Family sharing', myphoto: 'Da (do 5 članova)', google: 'Da (do 5 članova)' },
      adScanning: { feature: 'Skeniranje za reklame', myphoto: 'Ne', google: 'Da' },
    },
    faqs: {
      whySwitch: {
        q: 'Zašto da pređem sa Google Photos-a na MyPhoto?',
        a: 'MyPhoto nudi stvarnu privatnost — vaše slike se nikada ne koriste za AI trening, čuvaju se na EU serverima uz GDPR usklađenost i ostaju u originalnom kvalitetu bez kompresije. Google Photos kompresuje slike u besplatnom planu i koristi vaše podatke u reklamne svrhe.',
      },
      cheaper: {
        q: 'Da li je MyPhoto jeftiniji od Google Photos-a?',
        a: 'MyPhoto nudi konkurentnu cenu od €0.017/GB, u odnosu na Google One sa €0.021/GB. Naš plan od 150GB počinje od €2.49 mesečno, dok Google nudi 100GB za €2.10 mesečno — pa MyPhoto daje više po gigabajtu.',
      },
      aiTraining: {
        q: 'Da li Google Photos koristi moje slike za AI trening?',
        a: 'Google koristi vaše podatke za unapređenje svojih servisa, uključujući AI modele. MyPhoto nikada ne koristi vaše slike za AI trening. Vaši podaci ostaju vaši i obrađuju se samo za funkcije koje sami uključite.',
      },
      import: {
        q: 'Mogu li da prebacim slike sa Google Photos-a na MyPhoto?',
        a: 'Da! Izvezite slike preko Google Takeout-a i otpremite ih na MyPhoto. Sve slike zadržavaju originalni kvalitet tokom prenosa.',
      },
      aiFeatures: {
        q: 'Da li MyPhoto ima AI funkcije kao Google Photos?',
        a: 'Da! MyPhoto nudi pametnu AI pretragu, automatsko tagovanje i prepoznavanje lica — sve kao opcioni AI dodatak. Razlika je u tome što se vaše slike nikada ne koriste za treniranje tih modela.',
      },
    },
    final: {
      title: 'Prebacite se danas',
      text: 'Pridružite se korisnicima koji su prešli sa Google Photos-a na privatniju alternativu. Do 2,5GB besplatno, bez obaveza.',
    },
  },

  compareIcloud: {
    meta: {
      title: 'MyPhoto vs iCloud: sloboda na svim platformama | MyPhoto',
      description:
        'Uporedite MyPhoto i iCloud Photos. Sloboda na svim platformama, bolja cena po GB, EU serveri i bez vezivanja za jednog proizvođača. Najbolja alternativa za iCloud.',
      ogDescription:
        'Uporedite MyPhoto i iCloud Photos. Podrška za sve platforme, EU serveri, bolja cena po GB.',
      ogAlt: 'Poređenje MyPhoto i iCloud',
      breadcrumb: 'vs iCloud',
    },
    hero: {
      title: 'MyPhoto vs iCloud: sloboda na svim platformama',
      subtitle: 'Oslobodite se Apple ekosistema. Pristupite vašim slikama sa bilo kog uređaja, uz bolju cenu i EU zaštitu podataka.',
    },
    whyTitle: 'Zašto izabrati MyPhoto umesto iCloud-a?',
    advantages: {
      devices: {
        title: 'Radi na svim uređajima',
        description: 'Pristupite svojim slikama sa Android-a, Windows-a, Linux-a ili bilo kog pregledača. Bez Apple ograničenja.',
      },
      lockIn: {
        title: 'Bez vendor lock-in',
        description: 'Promenite telefon, operativni sistem ili platformu kada god želite. Vaše slike su uvek dostupne.',
      },
      eu: {
        title: 'EU serveri',
        description: 'Podaci na serverima u Frankfurt-u, zaštićeni GDPR regulativom. iCloud čuva podatke pretežno u SAD.',
      },
      price: {
        title: 'Bolja cena po GB',
        description: 'MyPhoto nudi €0.017 po GB, u poređenju sa iCloud-ovih €0.020 po GB. Više prostora za vaš novac.',
      },
    },
    rows: {
      crossPlatform: { feature: 'Cross-platform podrška', myphoto: 'Android, Web, svi pregledači', icloud: 'Samo Apple uređaji' },
      pricePerGb: { feature: 'Cena po GB', myphoto: '€0.017/GB', icloud: '€0.020/GB' },
      starter: { feature: 'Početni plan', myphoto: '150 GB — €2.49/mes', icloud: '50 GB — €0.99/mes' },
      servers: { feature: 'Lokacija servera', myphoto: 'EU (Frankfurt)', icloud: 'SAD / globalno' },
      gdpr: { feature: 'GDPR usklađenost', myphoto: 'Potpuna', icloud: 'Delimična' },
      aiTraining: { feature: 'Privatnost — AI trening', myphoto: 'Nikad za AI trening', icloud: 'Ne koristi za AI trening' },
      quality: { feature: 'Kvalitet čuvanja', myphoto: 'Original kvalitet', icloud: 'Original kvalitet' },
      lockIn: { feature: 'Vendor lock-in', myphoto: 'Nema — export jednim klikom', icloud: 'Vezan za Apple ekosistem' },
      family: { feature: 'Family sharing', myphoto: 'Da (do 5 članova)', icloud: 'Da (do 5 članova)' },
      windowsLinux: { feature: 'Windows / Linux pristup', myphoto: 'Da (pun web app)', icloud: 'Ograničen (samo web)' },
    },
    freedom: {
      title: 'Sloboda bez ograničenja',
      text: 'Sa iCloud-om, vaše slike su zaključane u Apple ekosistemu. Prelazak na Android znači komplikovan transfer i gubitak pristupa. Sa MyPhoto-om, vaše slike su uvek dostupne sa bilo kog uređaja.',
      android: 'Android aplikacija',
      web: 'Pun web app (Windows, Linux, macOS)',
      export: 'Export svih podataka jednim klikom',
      noContract: 'Bez ugovorne obaveze',
      line1: 'Bilo koji uređaj.',
      line2: 'Bilo kad.',
      line3: 'Bilo gde.',
    },
    faqs: {
      bothPlatforms: {
        q: 'Mogu li da koristim MyPhoto i na Android-u i na iPhone-u?',
        a: 'Da! Za razliku od iCloud-a koji je ograničen na Apple uređaje, MyPhoto radi na Android-u, iOS-u (web) i na svakom uređaju sa web pregledačem. Prava sloboda na svim platformama.',
      },
      cheaper: {
        q: 'Da li je MyPhoto jeftiniji od iCloud-a?',
        a: 'MyPhoto nudi €0.017/GB u odnosu na iCloud sa €0.020/GB. Uz to, MyPhoto ima fleksibilnije planove od 150GB do 10TB, dok iCloud skače sa 50GB na 200GB uz manje opcija.',
      },
      transfer: {
        q: 'Mogu li da prebacim slike sa iCloud-a na MyPhoto?',
        a: 'Da! Preuzmite slike sa iCloud-a (preko icloud.com ili Apple Data & Privacy) i otpremite ih na MyPhoto. Svi originali ostaju bez gubitka kvaliteta.',
      },
      windowsLinux: {
        q: 'Da li MyPhoto radi na Windows-u i Linux-u?',
        a: 'Da! MyPhoto ima pun web app koji savršeno radi na Windows-u, Linux-u, macOS-u i u svakom modernom pregledaču. Apple uređaj nije potreban.',
      },
      switchPhone: {
        q: 'Šta se dešava ako pređem sa iPhone-a na Android?',
        a: 'Sa iCloud-om, prelazak na Android znači gubitak lakog pristupa slikama. Sa MyPhoto-om, vaše slike su uvek dostupne sa bilo kog uređaja, pa je promena platforme bezbolna.',
      },
    },
    final: {
      title: 'Prebacite se danas',
      text: 'Oslobodite vaše slike iz Apple ekosistema. Cross-platform pristup, EU serveri, do 2,5GB besplatno.',
    },
  },

  download: {
    meta: {
      title: 'Preuzmi MyPhoto aplikaciju — Desktop, Android, iOS',
      description: 'Preuzmite MyPhoto aplikaciju za automatsku sinhronizaciju fajlova na računaru, Android telefonu ili tabletu.',
    },
    title: 'Preuzmite MyPhoto',
    subtitle: 'Sinhronizujte fajlove automatski na svim uređajima',
    windows: {
      description: 'Desktop aplikacija sa automatskom sinhronizacijom fajlova, kao Dropbox',
      f1: '✓ Automatski prati promene',
      f2: '✓ Radi u pozadini (system tray)',
      f3: '✓ Sinhronizuje foldere',
      f4: '✓ Pokreće se sa Windowsom',
      button: '⬇️ Preuzmi za Windows',
      storeSoon: 'Microsoft Store — uskoro',
      requirements: 'Windows 10/11 · 64-bit',
      smartscreen:
        'Pri prvom pokretanju Windows može da pita „Unknown publisher" — klikni „More info → Run anyway" (bezbedno, naša aplikacija).',
    },
    android: {
      description: 'Mobilna aplikacija za telefon i tablet sa automatskim backup-om fotografija',
      f1: '✓ Auto-backup fotografija',
      f2: '✓ Pristup svim fajlovima',
      f3: '✓ Offline pregled',
      f4: '✓ Deljenje slika',
      button: '⬇️ Preuzmi APK',
      requirements: 'Android 8.0+ · ~200 MB ·',
      playSoon: 'Uskoro na Google Play',
      howTo: 'Kako da instalirate APK?',
      step1Before: 'Tapnite ',
      step1Strong: 'Preuzmi APK',
      step1After: ' i sačekajte da se preuzme.',
      step2Before: 'Otvorite preuzeti fajl iz notifikacija ili foldera ',
      step2Em: 'Downloads',
      step2After: '.',
      step3Before: 'Android će tražiti dozvolu za ',
      step3Strong: 'Instaliranje nepoznatih aplikacija',
      step3After: ' — uključite je za ovaj browser/file manager pa se vratite.',
      step4Before: 'Tapnite ',
      step4Strong: 'Instaliraj',
      step4After: '. Aplikacija će se pojaviti na home screen-u.',
      step5: 'Po prvom pokretanju odobrite pristup fotografijama da bi backup radio.',
      note: 'APK je naša zvanična build, isti koji ide u Play Store. Potpisivanje i bezbednost su standardni Android sideload.',
    },
    web: {
      title: 'Web App',
      description: 'Instalirajte direktno iz pregledača, radi na svim platformama',
      f1: '✓ Radi offline',
      f2: '✓ Nema instalacije',
      f3: '✓ Chrome, Edge, Safari',
      f4: '✓ Automatska ažuriranja',
      button: '🚀 Otvori Web App',
      note: 'Instalacija iz pregledača',
    },
    how: {
      title: 'Kako radi sinhronizacija?',
      s1Title: 'Instalirajte',
      s1Text: 'Preuzmite i instalirajte aplikaciju',
      s2Title: 'Prijavite se',
      s2Text: 'Koristite vaš MyPhoto nalog',
      s3Title: 'Izaberite folder',
      s3Text: 'Odredite koji folder da se prati',
      s4Title: 'Automatski sync',
      s4Text: 'Svaka promena se šalje u oblak',
    },
  },

  memeWallStart: {
    meta: {
      title: 'MemeWall — napravi i podeli memove besplatno | MyPhoto',
      description:
        'Napravi meme za sekunde, osvajaj lajkove, prati autore i postani zvezda zida. Skini MyPhoto aplikaciju ili otvori MemeWall na webu.',
      ogTitle: 'MemeWall — napravi i podeli memove besplatno',
      ogDescription: 'Napravi meme za sekunde, osvajaj lajkove i prati omiljene autore.',
    },
    hero: {
      line1: 'Tvoj humor.',
      line2: 'Ceo zid gleda.',
      subtitle: 'Napravi meme za sekunde, osvajaj lajkove i postani zvezda zida.',
      getApp: 'Skini aplikaciju',
      browse: 'Pogledaj memove ›',
      note: 'Besplatno · bez kartice · prvih 10 memova bez naloga',
    },
    band: {
      line1: 'Brzo. Lepo.',
      line2: 'Zarazno.',
      text: 'Vertikalni feed preko celog ekrana — kao što voliš. Swipe, lajk, komentar, repost.',
    },
    features: {
      create: { title: 'Napravi za sekunde', text: 'Slika, tekst, gotovo. Pozadina se skida jednim dodirom.' },
      likes: { title: 'Osvajaj lajkove', text: 'Lajkuj, komentariši i prati omiljene autore.' },
      repost: { title: 'Repost i deli', text: 'Repostuj na svoj profil i podeli bilo gde.' },
    },
    closing: {
      title: 'Postani zvezda zida.',
      text: 'Skini aplikaciju i objavi prvi meme za manje od minuta.',
      getApp: 'Skini aplikaciju',
      register: 'Registruj se na webu ›',
    },
  },

  memeWall: {
    subtitle: 'Javni zid memova — napravi, podeli, osvoji lajkove!',
    closeCreator: 'Zatvori kreator',
    makeYourMeme: 'Napravi svoj meme',
    loginToMake: 'Prijavi se i napravi meme',
    about: 'O MyPhoto',
    chooseImage: 'Izaberi sliku',
    changeImage: 'Promeni sliku',
    topText: 'Tekst gore',
    topTextPlaceholder: 'Tekst gore...',
    bottomText: 'Tekst dole',
    bottomTextPlaceholder: 'Tekst dole...',
    publishing: 'Objavljujem...',
    publish: '🔥 Objavi na MemeWall',
    loading: 'Učitavanje memova...',
    emptyTitle: 'MemeWall je prazan!',
    emptyText: 'Budi prvi koji će objaviti meme.',
    makeMeme: 'Napravi meme',
    like: 'Sviđa mi se',
    dislike: 'Ne sviđa mi se',
    loginToReact: 'Prijavi se da reaguješ',
    comments: 'Komentari',
    share: 'Podeli',
    loadMore: 'Učitaj više',
    gateTitle: 'Video si 10 najboljih!',
    gateText: 'Skini MyPhoto aplikaciju da vidiš sve memove, praviš svoje, lajkuješ i pratiš autore — sve na jednom mestu.',
    getApp: '📱 Skini aplikaciju',
    openWeb: 'Ili otvori na webu',
    footerTitle: 'Preuzmi MyPhoto aplikaciju',
    footerText: 'Auto-backup slika, cloud storage, meme generator i još mnogo toga.',
    registerFree: 'Registruj se besplatno',
    alerts: {
      addText: 'Dodaj tekst na meme.',
      chooseImage: 'Izaberi sliku za meme.',
      mustLogin: 'Morate biti ulogovani.',
      publishFailed: 'Objavljivanje nije uspelo.',
      publishError: 'Greška pri objavljivanju.',
      linkCopied: 'Link kopiran!',
    },
    shareText: '{caption} — Napravljeno u MyPhoto',
  },

  homeMemeWall: {
    title: '🔥 MemeWall',
    tagline: 'Najsvežiji memovi MyPhoto zajednice — skroluj, smej se, deli.',
    downloadApp: '📱 Skini aplikaciju',
    register: 'Registruj se besplatno',
    seeAll: 'Otvori ceo MemeWall',
  },
};
