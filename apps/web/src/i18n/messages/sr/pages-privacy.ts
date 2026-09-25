import type { privacy as En } from '../en/pages-privacy';
import type { DeepStrings } from '../types';

export const privacy: DeepStrings<typeof En> = {
  meta: {
    title: 'Politika privatnosti',
    description:
      'Politika privatnosti MyPhoto — kako čuvamo i štitimo vaše fotografije. EU serveri, GDPR usklađenost, i nikada ne koristimo vaše slike za AI trening.',
    ogTitle: 'Politika privatnosti | MyPhoto',
    ogDescription: 'Kako čuvamo i štitimo vaše fotografije. EU serveri, GDPR, bez AI treninga na vašim slikama.',
  },
  home: 'Početna',
  title: 'Politika privatnosti',
  lastUpdated: 'Poslednje ažuriranje: {date}',
  laws: 'GDPR (EU 2016/679) | ZZPL (Srbija) | CCPA/COPPA (SAD)',
  badges: {
    noAi: 'Ne koristimo slike za AI trening',
    euServers: 'EU Serveri (Frankfurt)',
    compliant: 'GDPR & ZZPL Compliant',
  },
  s1: {
    title: '1. Uvod',
    p1: 'MyPhoto (myphotomy.space) ("MyPhoto", "mi", "nas", "naš") se obavezuje da štiti vašu privatnost. Ova Politika privatnosti ("Politika") opisuje kako prikupljamo, koristimo, čuvamo i štitimo vaše podatke kada koristite naš servis za čuvanje fotografija i videa.',
    p2: 'Ova Politika se primenjuje u skladu sa Opštom uredbom o zaštiti podataka (GDPR — Uredba EU 2016/679), Zakonom o zaštiti podataka o ličnosti Republike Srbije (ZZPL — "Sl. glasnik RS", br. 87/2018), California Consumer Privacy Act (CCPA) i Children\'s Online Privacy Protection Act (COPPA).',
    philosophyTitle: 'Naša osnovna filozofija: vaše slike su vaše i samo vaše.',
    philosophyText:
      'Ne koristimo vaše fotografije za trening AI modela. Ne skeniramo sadržaj za reklame. Ne prodajemo vaše podatke. Ne delimo ih sa trećim stranama osim kada je to neophodno za pružanje Servisa.',
  },
  s2: {
    title: '2. Definicije',
    personalData:
      '**"Lični podaci"** — svaka informacija koja se odnosi na identifikovano ili identifikabilno fizičko lice (GDPR Član 4(1), ZZPL Član 4)',
    specialCategories:
      '**"Posebne kategorije podataka"** — biometrijski podaci (face recognition), podaci iz fotografija koji mogu otkriti rasno/etničko poreklo, zdravstveno stanje itd. (GDPR Član 9)',
    controller: '**"Rukovalac" (Controller)** — MyPhoto (myphotomy.space), koji određuje svrhe i sredstva obrade ličnih podataka',
    processor:
      '**"Obrađivač" (Processor)** — treće strane koje obrađuju podatke u naše ime (cloud provajderi, payment procesori)',
    processing: '**"Obrada"** — svaka radnja izvršena nad ličnim podacima (prikupljanje, čuvanje, brisanje, prenos)',
    dpo: '**"DPO"** — Data Protection Officer / Lice za zaštitu podataka o ličnosti',
  },
  s3: {
    title: '3. Kontrolor podataka',
    intro: 'Rukovalac (kontrolor) vaših ličnih podataka u smislu GDPR Člana 4(7) i ZZPL Člana 4 je:',
    email: 'Email:',
    dpo: 'DPO:',
    outro: 'Za sva pitanja vezana za obradu vaših ličnih podataka, možete kontaktirati našeg DPO-a na gore navedenu adresu.',
  },
  s4: {
    title: '4. Koje podatke prikupljamo',
    intro: 'Prikupljamo samo podatke koji su neophodni za rad Servisa:',
    account: {
      title: 'a) Podaci o nalogu',
      email: 'Email adresa (obavezno — za autentifikaciju i komunikaciju)',
      name: 'Ime i prezime (opciono)',
      photo: 'Profilna slika (opciono)',
      password: 'Lozinka (hashirana, bcrypt — nikada ne čuvamo u plain text-u)',
    },
    content: {
      title: 'b) Korisnički sadržaj',
      files: 'Fotografije i video zapisi koje uploadujete',
      exif: 'EXIF metapodaci (datum, lokacija, kamera — ako su prisutni u fajlu)',
      albums: 'Albumi, tagovi i organizacione strukture koje kreirate',
    },
    technical: {
      title: 'c) Tehnički podaci',
      ip: 'IP adresa (za sigurnost i sprečavanje zloupotrebe)',
      browser: 'Tip browser-a i operativnog sistema',
      usage: 'Informacije o upotrebi storage-a i pristupanju fajlovima',
    },
    payment: {
      title: 'd) Podaci o plaćanju',
      processor: 'Obrađuju se putem našeg merchant-of-record partnera (Creem) — **mi ne čuvamo podatke o karticama**',
      stored: 'Čuvamo samo: ID transakcije, iznos, datum i status pretplate',
    },
  },
  s5: {
    title: '5. Kako prikupljamo podatke',
    direct: '**Direktno od vas:** prilikom registracije, upload-a fajlova, kontaktiranja podrške, podešavanja naloga',
    auto: '**Automatski:** tehničke podatke (IP, browser, kolačići) prikupljamo automatski prilikom korišćenja Servisa',
    thirdParty:
      '**Od trećih strana:** ako se prijavite putem Google OAuth-a, dobijamo vašu email adresu i ime iz Google naloga',
  },
  s6: {
    title: '6. Pravni osnov obrade (GDPR Član 6)',
    intro: 'Svaku obradu ličnih podataka zasnivamo na jednom od sledećih pravnih osnova:',
    contract:
      '**Izvršenje ugovora** (Član 6(1)(b)) — obrada neophodna za pružanje Servisa (čuvanje fajlova, generisanje thumbnail-ova, deljenje)',
    consent:
      '**Saglasnost** (Član 6(1)(a)) — za AI funkcije (smart search, auto-tagging), face recognition (Član 9(2)(a) za biometrijske podatke), analitičke kolačiće',
    legitimate:
      '**Legitimni interes** (Član 6(1)(f)) — sigurnost sistema, prevencija zloupotrebe, sprečavanje prevara, poboljšanje Servisa',
    legal: '**Zakonska obaveza** (Član 6(1)(c)) — poštovanje poreskih, računovodstvenih i regulatornih propisa',
    withdraw:
      'Saglasnost možete povući u bilo kom trenutku putem podešavanja naloga ili kontaktiranjem DPO-a. Povlačenje saglasnosti ne utiče na zakonitost obrade izvršene pre povlačenja (GDPR Član 7(3)).',
  },
  s7: {
    title: '7. Svrhe obrade podataka',
    intro: 'Vaše podatke koristimo isključivo za sledeće svrhe:',
    service: 'Pružanje Servisa — čuvanje, organizovanje i deljenje vaših fotografija i videa',
    ai: 'AI funkcije — smart search, auto-tagging, face recognition (samo ako ih vi eksplicitno aktivirate)',
    thumbnails: 'Generisanje thumbnail-ova i optimizovanih verzija za brži prikaz',
    notifications: 'Obaveštenja o nalogu, plaćanju i sigurnosnim događajima',
    support: 'Tehnička podrška kada je zatražite',
    security: 'Sigurnost — detekcija zloupotrebe, sprečavanje neovlašćenog pristupa',
    legal: 'Poštovanje zakonskih obaveza (poreskih, regulatornih)',
  },
  s8: {
    title: '8. AI funkcije i obrada slika',
    boxTitle: 'Vaše fotografije se nikada ne koriste za trening AI modela.',
    boxText:
      'AI funkcije obrađuju vaše slike isključivo za funkcionalnosti Servisa koje ste vi aktivirali (pretraga, tagovanje, prepoznavanje lica). Rezultati obrade se čuvaju samo u vašem nalogu i nisu dostupni nikome drugom.',
    smartSearch:
      '**Smart search i auto-tagging:** opt-in funkcije — aktiviraju se samo na vaš zahtev (GDPR osnov: saglasnost)',
    face: '**Face recognition:** zahteva eksplicitnu saglasnost za obradu biometrijskih podataka (GDPR Član 9(2)(a)). Možete obrisati sve face podatke u bilo kom trenutku',
    noSale: '**Bez prodaje ili deljenja:** AI-generisani tagovi i metapodaci nikada se ne dele sa trećim stranama',
  },
  s9: {
    title: '9. Deljenje podataka sa trećim stranama',
    boxTitle: 'Ne prodajemo vaše podatke. Ne delimo ih za reklamne svrhe.',
    intro:
      'Vaše podatke delimo isključivo sa sledećim kategorijama primalaca, uz odgovarajuće ugovorne zaštite (GDPR Član 28 — ugovor o obradi podataka):',
    cloud: '**Cloud infrastruktura:** za čuvanje fajlova na EU serverima (Frankfurt, Nemačka)',
    payment: '**Merchant of record (Creem):** za obradu plaćanja — primaju samo podatke neophodne za transakciju',
    email: '**Email servis:** za slanje transakcijskih email-ova (potvrde, obaveštenja)',
    disclosure:
      'Takođe možemo otkriti podatke ako to zahteva zakon, sudski nalog ili ako je neophodno za zaštitu naših prava, bezbednosti korisnika ili javnosti.',
  },
  s10: {
    title: '10. Međunarodni transfer podataka',
    intro: 'Svi korisnički fajlovi i primarni podaci se čuvaju na serverima u **Evropskoj Uniji (Frankfurt, Nemačka)**.',
    neverOutside: 'Vaši fajlovi se **nikada ne prenose van EU** bez vaše izričite saglasnosti',
    scc: 'Kada je transfer van EU/EEA neophodan (npr. payment procesor), koristimo **standardne ugovorne klauzule** (SCC) odobrene od strane Evropske komisije (GDPR Član 46(2)(c))',
    adequacy: 'Za transfer u zemlje sa odlukom o adekvatnosti (GDPR Član 45), oslanjamo se na tu odluku',
    serbia:
      'U skladu sa ZZPL Članom 65, transfer podataka iz Srbije podleže istim zaštitnim merama, uključujući odluke Poverenika o adekvatnosti zaštite.',
  },
  s11: {
    title: '11. Sigurnost podataka',
    intro: 'Primenjujemo tehničke i organizacione mere zaštite u skladu sa GDPR Članom 32 i ZZPL Članom 50:',
    transit: '**Enkripcija u tranzitu:** TLS 1.3 za sve komunikacije',
    rest: '**Enkripcija u mirovanju:** AES-256 za sve fajlove na serverima',
    access: '**Kontrola pristupa:** princip minimalnog pristupa (least privilege) za sve zaposlene',
    passwords: '**Lozinke:** bcrypt hashiranje, nikada se ne čuvaju u plain text-u',
    incident:
      '**Incident response:** obaveštavamo korisnike i nadzorne organe o sigurnosnim incidentima u roku od 72 sata (GDPR Član 33)',
  },
  s12: {
    title: '12. Čuvanje podataka (Retention)',
    intro:
      'Podatke čuvamo samo onoliko dugo koliko je neophodno za svrhu za koju su prikupljeni (GDPR Član 5(1)(e), ZZPL Član 5):',
    account: '**Podaci o nalogu:** dok nalog postoji + 30 dana grace period nakon brisanja',
    files:
      '**Korisnički fajlovi:** dok nalog postoji. Trajno brisanje u roku od 30 dana od brisanja naloga (backup-i u roku od 90 dana)',
    logs: '**Tehnički logovi:** IP adrese i access logovi se čuvaju 90 dana za sigurnosne svrhe',
    payment: '**Podaci o plaćanju:** u skladu sa poreskim zakonodavstvom — do 10 godina za računovodstvene svrhe',
    ai: '**AI-generisani podaci:** tagovi i face recognition podaci se brišu odmah po deaktivaciji funkcije ili brisanju naloga',
  },
  s13: {
    title: '13. Kolačići i slične tehnologije',
    intro: 'MyPhoto koristi **isključivo neophodne (esencijalne) kolačiće** za funkcionisanje Servisa:',
    session: '**Sesijski kolačići:** za autentifikaciju i održavanje prijave (strogo neophodni)',
    csrf: '**CSRF tokeni:** za zaštitu od cross-site request forgery napada (strogo neophodni)',
    prefs: '**Korisničke preferencije:** tema (svetla/tamna), jezik (strogo neophodni)',
    notUsed: 'Šta NE koristimo:',
    advertising: 'Reklamne (advertising) kolačiće',
    tracking: 'Kolačiće za praćenje korisnika (ad tracking) trećih strana',
    social: 'Social media tracking piksele',
    analytics:
      'Analitički kolačići se aktiviraju samo uz vašu eksplicitnu saglasnost (opt-in), u skladu sa ePrivacy Direktivom (2002/58/EC) i GDPR.',
  },
  s14: {
    title: '14. GDPR prava korisnika',
    intro: 'Ako se nalazite u EU/EEA, imate sledeća prava po GDPR:',
    access: '**Pravo na pristup** (Član 15) — zatražite kopiju svih ličnih podataka koje čuvamo o vama',
    rectification: '**Pravo na ispravku** (Član 16) — ispravite netačne ili nepotpune lične podatke',
    erasure: '**Pravo na brisanje** (Član 17) — "pravo na zaborav", zatražite trajno brisanje svih podataka',
    portability:
      '**Pravo na prenosivost** (Član 20) — preuzmite sve podatke u mašinski čitljivom formatu (JSON, ZIP sa originalnim fajlovima)',
    restriction: '**Pravo na ograničenje obrade** (Član 18) — privremeno ograničite kako koristimo vaše podatke',
    objection: '**Pravo na prigovor** (Član 21) — prigovorite obradi zasnovanoj na legitimnom interesu',
    withdraw: '**Pravo na povlačenje saglasnosti** (Član 7(3)) — povucite prethodno datu saglasnost u bilo kom trenutku',
    automated:
      '**Automatizovano odlučivanje** (Član 22) — ne donosimo odluke zasnovane isključivo na automatizovanoj obradi koje bi imale pravne posledice po vas',
    complaint:
      'Imate pravo na žalbu nadzornom organu za zaštitu podataka u vašoj zemlji prebivališta, radu ili mestu navodnog kršenja (GDPR Član 77).',
  },
  s15: {
    title: '15. Srpski zakon — ZZPL',
    intro: 'Za korisnike iz Republike Srbije, dodatno se primenjuje:',
    zzpl: '**ZZPL** — Zakon o zaštiti podataka o ličnosti ("Sl. glasnik RS", br. 87/2018), usklađen sa GDPR. Sva GDPR prava navedena u sekciji 14 važe i po srpskom pravu',
    commissioner:
      '**Poverenik** — Imate pravo na žalbu Povereniku za informacije od javnog značaja i zaštitu podataka o ličnosti (ZZPL Član 82)',
    court: '**Sudska zaštita** — Pravo na tužbu pred nadležnim sudom za zaštitu prava po ZZPL (Član 84)',
    damages:
      '**Naknada štete** — Pravo na naknadu materijalne i nematerijalne štete usled nezakonite obrade (ZZPL Član 86)',
    contact: 'Kontakt Poverenika: **office@poverenik.rs** | Web: **poverenik.rs**',
    higher: 'U slučaju razlike između GDPR i ZZPL, primenjuje se odredba koja pruža viši nivo zaštite korisnika.',
  },
  s16: {
    title: '16. Prava korisnika u SAD (CCPA / COPPA)',
    ccpaTitle: 'California Consumer Privacy Act (CCPA):',
    ccpaIntro: 'Ako ste rezident Kalifornije, imate sledeća dodatna prava:',
    know: '**Pravo da znate:** koje lične podatke prikupljamo, koristimo i delimo',
    delete: '**Pravo na brisanje:** zatražite brisanje ličnih podataka',
    optOut: '**Pravo na opt-out od prodaje:** MyPhoto **ne prodaje** vaše lične podatke — ovo pravo je automatski ispunjeno',
    nonDiscrimination: '**Pravo na nediskriminaciju:** nećemo vas diskriminisati zbog ostvarivanja vaših prava',
    coppaTitle: "Children's Online Privacy Protection Act (COPPA):",
    coppa:
      'MyPhoto ne prikuplja svesno lične podatke dece mlađe od 13 godina. Naš Servis zahteva minimum **16 godina**. Ako saznamo da smo prikupili podatke deteta mlađeg od 13 godina, odmah ćemo ih obrisati. Ako ste roditelj i verujete da je vaše dete otvorilo nalog, kontaktirajte nas na **dpo@myphotomy.space**.',
  },
  s17: {
    title: '17. Ostvarivanje prava',
    intro: 'Za ostvarivanje bilo kog prava iz sekcija 14–16:',
    how: '**Kako:** pošaljite zahtev na [[dpo@myphotomy.space]] ili koristite opciju u podešavanjima naloga',
    deadline:
      '**Rok odgovora:** u roku od **30 dana** (može se produžiti za dodatnih 60 dana za složene zahteve, uz obaveštenje)',
    verification:
      '**Verifikacija identiteta:** možemo zatražiti potvrdu identiteta pre obrade zahteva, radi zaštite vaših podataka',
    free: '**Besplatno:** ostvarivanje prava je besplatno. Za očigledno neosnovane ili preterane zahteve, možemo naplatiti razumnu naknadu (GDPR Član 12(5))',
  },
  s18: {
    title: '18. Deca i maloletnici',
    intro: 'MyPhoto zahteva minimalni uzrast od **16 godina** za kreiranje naloga, u skladu sa:',
    gdpr: '**GDPR Član 8:** saglasnost za usluge informacionog društva — minimalno 16 godina (ili manje po pravu države članice, ali ne manje od 13)',
    coppa: '**COPPA:** zabranjuje prikupljanje podataka dece mlađe od 13 godina bez verifikovanog roditeljskog pristanka',
    zzpl: '**ZZPL Član 16:** obrada podataka maloletnih lica u Srbiji',
    outro:
      'Ne prikupljamo svesno podatke lica mlađih od 16 godina. Ako otkrijemo takav nalog, deaktivaćemo ga i obrisati sve povezane podatke.',
  },
  s19: {
    title: '19. Brisanje naloga i podataka',
    intro: 'Možete obrisati svoj nalog u bilo kom trenutku iz podešavanja naloga. Procedura brisanja:',
    immediately: '**Odmah:** nalog se deaktivira, prestaje pristup Servisu',
    days30: '**30 dana:** grace period — možete se predomisliti i reaktivirati nalog',
    days90: '**30–90 dana:** trajno brisanje svih podataka, uključujući backup-e',
    exceptions:
      '**Izuzeci:** podaci koje smo zakonski obavezni da čuvamo (poreski zapisi) čuvaju se u zakonski propisanom roku',
    before:
      '**Pre brisanja** preporučujemo da iskoristite Export funkciju za preuzimanje svih vaših fajlova u originalnom kvalitetu (GDPR pravo na prenosivost).',
  },
  s20: {
    title: '20. Izmene Politike privatnosti',
    intro: 'Zadržavamo pravo da izmenimo ovu Politiku. O izmenama vas obaveštavamo:',
    material: '**Materijalne promene:** obaveštenje putem email-a najmanje **30 dana** unapred',
    minor: '**Manje izmene:** obaveštenje putem notifikacije u aplikaciji',
    date: '**Datum:** svaka verzija ima jasno naznačen datum poslednjeg ažuriranja',
    outro:
      'Nastavak korišćenja Servisa nakon stupanja izmena na snagu predstavlja prihvatanje nove Politike. Za materijalne promene koje menjaju pravni osnov obrade, tražićemo vašu ponovnu saglasnost.',
  },
  s21: {
    title: '21. Kontakt i DPO',
    intro: 'Za sva pitanja vezana za privatnost i zaštitu podataka:',
    dpo: '**Zaštita podataka (DPO):** [[dpo@myphotomy.space]]',
    privacy: '**Opšta pitanja o privatnosti:** [[privacy@myphotomy.space]]',
    legal: '**Pravna služba:** [[legal@myphotomy.space]]',
    form: '**Kontakt forma:**',
    authorities: 'Nadzorni organi:',
    serbia:
      '**Srbija:** Poverenik za informacije od javnog značaja i zaštitu podataka o ličnosti — **office@poverenik.rs**',
    eu: '**EU:** nadzorni organ u vašoj zemlji prebivališta (lista na edpb.europa.eu)',
  },
  cta: {
    title: 'Vaša privatnost je naš prioritet',
    text: 'Započnite besplatno sa 2,5GB — bez kreditne kartice, bez kompromisa.',
    button: 'Započni besplatno',
  },
  footer: {
    rights: '© {year} MyPhoto. Sva prava zadržana.',
    privacy: 'Privatnost',
    terms: 'Uslovi',
    contact: 'Kontakt',
  },
};
