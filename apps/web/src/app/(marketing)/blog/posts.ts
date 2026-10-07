import type { Locale } from '@/i18n/config';

/** Per-language text of a blog post. */
export interface BlogPostContent {
  title: string;
  description: string;
  author: string;
  readingTime: string;
  tags: string[];
  content: string;
}

export interface BlogPost {
  /** Slugs are shared across languages (and indexed) — never change them. */
  slug: string;
  date: string;
  en: BlogPostContent;
  sr: BlogPostContent;
}

/** A post flattened to a single language, ready to render. */
export interface LocalizedBlogPost extends BlogPostContent {
  slug: string;
  date: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'zasto-je-privatnost-vasih-fotografija-vazna',
    date: '2025-01-15',
    sr: {
      title: 'Zašto je privatnost vaših fotografija važna u 2025',
      description:
        'Saznajte zašto je zaštita privatnosti vaših fotografija ključna u digitalnom dobu i kako da izaberete siguran cloud storage.',
      author: 'MyPhoto Tim',
      readingTime: '5 min',
      tags: ['privatnost', 'GDPR', 'sigurnost'],
      content: `
## Vaše fotografije govore više o vama nego što mislite

Svaka fotografija koju napravite sadrži meta-podatke: lokaciju, vreme, uređaj, pa čak i biometrijske podatke poput lica. Kada te slike upload-ujete na besplatne cloud servise, postavlja se pitanje — ko ima pristup tim podacima?

## Problem sa "besplatnim" servisima

Mnogi popularni servisi za čuvanje slika koriste vaše fotografije za:
- **Treniranje AI modela** — vaša lica i scene postaju deo dataseta
- **Ciljano reklamiranje** — AI analizira vaše slike da bi vam prikazao relevantne reklame
- **Profilisanje** — kreiranje detaljnog profila vaših navika, lokacija i kontakata

## Šta je GDPR i zašto je važan?

GDPR (General Data Protection Regulation) je evropski zakon koji štiti vaše podatke. Ključna prava:
1. **Pravo na brisanje** — možete zahtevati potpuno brisanje svih podataka
2. **Pravo na prenosivost** — možete preuzeti sve svoje podatke u standardnom formatu
3. **Pravo na informisanost** — morate znati kako se vaši podaci koriste
4. **Pravo na prigovor** — možete se usprotiviti obradi vaših podataka

## Kako MyPhoto štiti vašu privatnost

MyPhoto je dizajniran sa privatnošću na prvom mestu:
- **EU serveri** — vaši podaci nikada ne napuštaju Evropu
- **Nema AI treniranja** — vaše slike se ne koriste za treniranje modela
- **End-to-end enkripcija** — samo vi imate pristup
- **GDPR usklađenost** — potpuno usklađen sa evropskim zakonima
- **Transparentnost** — znate tačno šta se dešava sa vašim podacima

## Zaključak

Privatnost nije luksuz — to je pravo. Izaberite cloud storage koji poštuje vaše podatke. Isprobajte MyPhoto besplatno sa 1GB prostora (do 2,5GB uz preporuke) i uverite se sami.
      `.trim(),
    },
    en: {
      title: 'Why the privacy of your photos matters in 2025',
      description:
        'Find out why protecting the privacy of your photos is crucial in the digital age, and how to choose cloud storage you can trust.',
      author: 'MyPhoto Team',
      readingTime: '5 min',
      tags: ['privacy', 'GDPR', 'security'],
      content: `
## Your photos say more about you than you think

Every photo you take carries metadata: location, time, device — and even biometric data like faces. When you upload those photos to "free" cloud services, the question is simple: who gets access to that data?

## The problem with "free" services

Many popular photo storage services use your photos for:
- **Training AI models** — your faces and scenes become part of a dataset
- **Targeted advertising** — AI analyzes your photos to serve you relevant ads
- **Profiling** — building a detailed picture of your habits, locations and contacts

## What is the GDPR and why does it matter?

The GDPR (General Data Protection Regulation) is the European law that protects your data. Your key rights:
1. **Right to erasure** — you can demand that all your data is deleted
2. **Right to portability** — you can download all your data in a standard format
3. **Right to be informed** — you must be told how your data is used
4. **Right to object** — you can object to your data being processed

## How MyPhoto protects your privacy

MyPhoto is designed with privacy first:
- **EU servers** — your data never leaves Europe
- **No AI training** — your photos are never used to train models
- **End-to-end encryption** — only you have access
- **GDPR compliance** — fully aligned with European law
- **Transparency** — you know exactly what happens to your data

## The bottom line

Privacy isn't a luxury — it's a right. Choose cloud storage that respects your data. Try MyPhoto free with 1 GB of storage (up to 2.5 GB by inviting friends) and see for yourself.
      `.trim(),
    },
  },
  {
    slug: 'kako-automatski-backup-ovati-slike-sa-android-telefona',
    date: '2025-01-20',
    sr: {
      title: 'Kako automatski backup-ovati sve slike sa Android telefona',
      description:
        'Korak po korak vodič za automatski backup svih fotografija i videa sa vašeg Android telefona u privatni cloud.',
      author: 'MyPhoto Tim',
      readingTime: '4 min',
      tags: ['android', 'backup', 'vodič'],
      content: `
## Zašto je backup slika važan?

Telefoni se gube, kradu ili kvare. Bez backup-a, gubite godine uspomena. Automatski backup osigurava da svaka nova slika bude bezbedno sačuvana u cloud-u.

## Korak 1: Instalirajte MyPhoto aplikaciju

1. Otvorite Google Play Store na vašem telefonu
2. Pretražite "MyPhoto"
3. Instalirajte aplikaciju (besplatna)
4. Prijavite se ili kreirajte besplatan nalog

## Korak 2: Uključite automatski backup

1. Otvorite MyPhoto aplikaciju
2. Idite u **Podešavanja** → **Backup**
3. Uključite **Automatski backup**
4. Izaberite foldere za backup (ili ostavite "Svi" za kompletni backup)
5. Izaberite kvalitet: **Original** (preporučeno) ili Visok

## Korak 3: Podesite mrežna podešavanja

- **Samo WiFi** — backup samo kada ste na WiFi (preporučeno)
- **WiFi + Mobilni** — backup uvek (troši mobilne podatke)
- **Ručni** — backup samo kada vi pokrenete

## Bonus: Dobijte do +1,5GB besplatno!

Besplatan nalog počinje sa 1GB. Za svakog prijatelja kog pozovete dobijate **+250MB besplatnog prostora** — čim se registruje i otpremi 100MB. Do 6 prijatelja, dakle ukupno do **2,5GB besplatno**.

## Šta se backup-uje?

- Sve fotografije (JPEG, PNG, HEIC, RAW)
- Svi video zapisi (MP4, MOV, AVI)
- Originalni kvalitet — bez kompresije
- EXIF podaci (lokacija, datum, uređaj)

## Često postavljana pitanja

**Da li backup troši puno baterije?**
Ne. MyPhoto koristi Android Background Fetch koji je optimizovan za minimalnu potrošnju baterije.

**Šta ako nemam dovoljno prostora?**
Besplatan plan počinje sa 1GB. Pozovite prijatelje i dobijte +250MB za svakog (do 2,5GB ukupno), ili nadogradite na neki od plaćenih planova — aktuelne cene su na stranici sa cenama.

**Da li mogu backup-ovati samo određene foldere?**
Da! U podešavanjima možete izabrati tačno koje foldere želite da backup-ujete.
      `.trim(),
    },
    en: {
      title: 'How to automatically back up every photo on your Android phone',
      description:
        'A step-by-step guide to automatically backing up all the photos and videos on your Android phone to a private cloud.',
      author: 'MyPhoto Team',
      readingTime: '4 min',
      tags: ['android', 'backup', 'guide'],
      content: `
## Why back up your photos?

Phones get lost, stolen or broken. Without a backup, years of memories go with them. Automatic backup makes sure every new photo is safely stored in the cloud.

## Step 1: Install the MyPhoto app

1. Open the Google Play Store on your phone
2. Search for "MyPhoto"
3. Install the app (it's free)
4. Sign in or create a free account

## Step 2: Turn on automatic backup

1. Open the MyPhoto app
2. Go to **Settings** → **Backup**
3. Turn on **Automatic backup**
4. Pick the folders to back up (or leave "All" for a complete backup)
5. Choose the quality: **Original** (recommended) or High

## Step 3: Set your network preferences

- **Wi-Fi only** — back up only when you're on Wi-Fi (recommended)
- **Wi-Fi + mobile data** — always back up (uses mobile data)
- **Manual** — back up only when you start it yourself

## Bonus: get up to +1.5 GB free!

A free account starts with 1 GB. For every friend you invite you get **+250 MB of free storage** — as soon as they sign up and upload 100 MB. Up to 6 friends, so up to **2.5 GB free** in total.

## What gets backed up?

- All photos (JPEG, PNG, HEIC, RAW)
- All videos (MP4, MOV, AVI)
- Original quality — no compression
- EXIF data (location, date, device)

## Frequently asked questions

**Does backup drain my battery?**
No. MyPhoto uses Android Background Fetch, which is optimized for minimal battery use.

**What if I run out of space?**
The free plan starts at 1 GB. Invite friends and get +250 MB for each one (up to 2.5 GB in total), or upgrade to one of the paid plans — current prices are on the pricing page.

**Can I back up only certain folders?**
Yes! In the settings you can choose exactly which folders to back up.
      `.trim(),
    },
  },
  {
    slug: 'google-photos-vs-myphoto-detaljno-poredjenje',
    date: '2025-02-01',
    sr: {
      title: 'Google Photos vs MyPhoto: Detaljno poređenje',
      description:
        'Uporedite Google Photos i MyPhoto po privatnosti, ceni, kvalitetu slike i funkcijama. Saznajte koji je bolji za vas.',
      author: 'MyPhoto Tim',
      readingTime: '6 min',
      tags: ['poređenje', 'google photos', 'alternativa'],
      content: `
## Google Photos vs MyPhoto — šta je bolje za vaše slike?

Google Photos je najpopularniji servis za čuvanje slika, ali da li je i najbolji? Uporedimo ga sa MyPhoto po ključnim kriterijumima.

## Privatnost

| | Google Photos | MyPhoto |
|---|---|---|
| AI treniranje | Da — koristi vaše slike | Ne — nikada |
| Reklamiranje | Da — analizira sadržaj | Ne — bez reklama |
| GDPR | Delimično | Potpuno usklađen |
| Serveri | SAD + globalno | EU (Frankfurt) |
| Enkripcija | U tranzitu | End-to-end |

**Pobednik: MyPhoto** — vaše slike ostaju privatne.

## Kvalitet slike

- **Google Photos (besplatno)**: Kompresuje slike na 16MP, video na 1080p
- **Google Photos (Google One)**: Original kvalitet, ali troši storage
- **MyPhoto**: Uvek original kvalitet, bez kompresije

**Pobednik: MyPhoto** — nikada ne kompresuje vaše slike.

## Cena

| Plan | Google One | MyPhoto |
|---|---|---|
| Besplatan | 15GB (deljeno) | 1GB + do 1,5GB uz preporuke |
| 100-150GB | €1.99/mes | €2.49/mes (150GB) |
| 200-250GB | €2.99/mes | €3.49/mes (250GB) |

Google One deli storage sa Gmail i Drive. MyPhoto je posvećen samo fotografijama.

**Pobednik: Izjednačeno** — Google je jeftiniji, MyPhoto nudi više za slike.

## AI funkcije

Oba servisa nude AI pretragu, ali sa ključnom razlikom: Google koristi vaše slike za treniranje, MyPhoto ne.

## Zaključak

Ako vam je privatnost važna i želite originalni kvalitet bez kompromisa, MyPhoto je bolji izbor. Ako vam je bitna samo cena i već koristite Google ekosistem, Google Photos može biti dovoljan.

Isprobajte MyPhoto besplatno i uverite se sami.
      `.trim(),
    },
    en: {
      title: 'Google Photos vs MyPhoto: an in-depth comparison',
      description:
        'Compare Google Photos and MyPhoto on privacy, price, image quality and features — and find out which one is right for you.',
      author: 'MyPhoto Team',
      readingTime: '6 min',
      tags: ['comparison', 'google photos', 'alternative'],
      content: `
## Google Photos vs MyPhoto — which is better for your photos?

Google Photos is the most popular photo storage service, but is it the best? Let's compare it with MyPhoto on the criteria that matter.

## Privacy

| | Google Photos | MyPhoto |
|---|---|---|
| AI training | Yes — uses your photos | No — never |
| Advertising | Yes — analyzes content | No — ad-free |
| GDPR | Partial | Fully compliant |
| Servers | US + global | EU (Frankfurt) |
| Encryption | In transit | End-to-end |

**Winner: MyPhoto** — your photos stay private.

## Image quality

- **Google Photos (free)**: compresses photos to 16 MP and video to 1080p
- **Google Photos (Google One)**: original quality, but it eats into your storage
- **MyPhoto**: always original quality, no compression

**Winner: MyPhoto** — it never compresses your photos.

## Price

| Plan | Google One | MyPhoto |
|---|---|---|
| Free | 15 GB (shared) | 1 GB + up to 1.5 GB from referrals |
| 100–150 GB | €1.99/mo | €2.49/mo (150 GB) |
| 200–250 GB | €2.99/mo | €3.49/mo (250 GB) |

Google One shares its storage with Gmail and Drive. MyPhoto is dedicated to your photos.

**Winner: a tie** — Google is cheaper, MyPhoto gives you more for your photos.

## AI features

Both services offer AI search, with one key difference: Google uses your photos for training, MyPhoto doesn't.

## The bottom line

If privacy matters to you and you want original quality without compromise, MyPhoto is the better choice. If price is all that matters and you're already in the Google ecosystem, Google Photos may be enough.

Try MyPhoto for free and see for yourself.
      `.trim(),
    },
  },
  {
    slug: '5-razloga-da-prebacite-slike-sa-google-photos',
    date: '2025-02-10',
    sr: {
      title: '5 razloga da prebacite slike sa Google Photos-a',
      description:
        'Otkrijte 5 ključnih razloga zašto sve više korisnika prelazi sa Google Photos na privatne alternative poput MyPhoto.',
      author: 'MyPhoto Tim',
      readingTime: '4 min',
      tags: ['google photos', 'migracija', 'privatnost'],
      content: `
## Zašto korisnici napuštaju Google Photos?

Google Photos je dugo bio podrazumevani izbor, ali sve više korisnika traži alternative. Evo 5 glavnih razloga.

## 1. Vaše slike treniraju Google AI

Google koristi fotografije korisnika za treniranje svojih AI modela — uključujući Gemini. To znači da vaša lica, lokacije i privatni momenti postaju deo ogromnog dataseta.

## 2. Besplatan prostor je sve manji

Google je 2021. ukinuo neograničen besplatni storage. Sada delite 15GB između Gmail-a, Drive-a i Photos-a. Za većinu korisnika to je premalo.

## 3. Kompresija uništava kvalitet

Osim ako ne plaćate Google One, Google Photos kompresuje vaše slike. Za profesionalne fotografe ili entuzijaste, to je neprihvatljivo.

## 4. Nema kontrole nad vašim podacima

Vaši podaci su na Google-ovim serverima, uglavnom u SAD-u. GDPR zahtevi su teško sprovodivi kada su vaši podaci van EU.

## 5. Lock-in efekat

Što više slika imate na Google Photos, teže je preći na drugi servis. Google to namerno otežava.

## Alternativa: MyPhoto

MyPhoto nudi:
- **1GB besplatno** + do 1,5GB uz preporuke (+250MB po prijatelju)
- **Originalni kvalitet** — bez kompresije
- **EU serveri** — GDPR zaštita
- **Bez AI treniranja** — vaše slike su samo vaše
- **Jednostavan uvoz** — prebacite slike sa Google Photos u par klikova

Isprobajte besplatno i vidite razliku.
      `.trim(),
    },
    en: {
      title: '5 reasons to move your photos off Google Photos',
      description:
        'Discover the 5 key reasons more and more people are leaving Google Photos for private alternatives like MyPhoto.',
      author: 'MyPhoto Team',
      readingTime: '4 min',
      tags: ['google photos', 'migration', 'privacy'],
      content: `
## Why are people leaving Google Photos?

Google Photos has long been the default choice, but more and more people are looking for alternatives. Here are the 5 main reasons.

## 1. Your photos train Google's AI

Google uses its users' photos to train its AI models — including Gemini. That means your faces, locations and private moments become part of a massive dataset.

## 2. Free storage keeps shrinking

In 2021 Google ended unlimited free storage. Now you share 15 GB across Gmail, Drive and Photos. For most people, that's not nearly enough.

## 3. Compression ruins quality

Unless you pay for Google One, Google Photos compresses your images. For professional photographers and enthusiasts, that's unacceptable.

## 4. No control over your data

Your data sits on Google's servers, mostly in the US. GDPR requests are hard to enforce when your data lives outside the EU.

## 5. The lock-in effect

The more photos you keep in Google Photos, the harder it is to switch. Google makes that difficult on purpose.

## The alternative: MyPhoto

MyPhoto offers:
- **1 GB free** + up to 1.5 GB by inviting friends (+250 MB per friend)
- **Original quality** — no compression
- **EU servers** — GDPR protection
- **No AI training** — your photos are yours alone
- **Easy import** — move your photos from Google Photos in a few clicks

Try it free and see the difference.
      `.trim(),
    },
  },
  {
    slug: 'gdpr-i-vase-fotografije-sta-treba-da-znate',
    date: '2025-02-20',
    sr: {
      title: 'GDPR i vaše fotografije: Šta treba da znate',
      description:
        'Sve što treba da znate o GDPR zaštiti vaših fotografija u cloud storage-u. Vaša prava i kako da ih zaštitite.',
      author: 'MyPhoto Tim',
      readingTime: '5 min',
      tags: ['GDPR', 'privatnost', 'pravni'],
      content: `
## Šta je GDPR?

GDPR (General Data Protection Regulation) je evropski zakon o zaštiti podataka koji je stupio na snagu 2018. godine. Odnosi se na sve kompanije koje obrađuju podatke građana EU — bez obzira gde se kompanija nalazi.

## Da li se GDPR odnosi na fotografije?

**Da!** Fotografije sadrže lične podatke:
- **Biometrijski podaci** — lica na fotografijama
- **Lokacijski podaci** — GPS koordinate u EXIF metapodacima
- **Vremenski podaci** — kada i gde ste bili
- **Podaci o uređaju** — koji telefon koristite

## Vaša prava pod GDPR-om

### Pravo na pristup (Član 15)
Imate pravo da znate koje vaše podatke kompanija čuva i kako ih koristi.

### Pravo na brisanje (Član 17)
Možete zahtevati potpuno brisanje svih vaših podataka — uključujući sve kopije i backup-e.

### Pravo na prenosivost (Član 20)
Možete zahtevati da vam se svi podaci isporuče u standardnom, mašinski čitljivom formatu.

### Pravo na prigovor (Član 21)
Možete se usprotiviti obradi vaših podataka za marketing ili profilisanje.

## Kako MyPhoto poštuje GDPR

1. **EU data centar** — svi podaci se čuvaju u Frankfurt-u, Nemačka
2. **Minimalna obrada** — obrađujemo samo podatke potrebne za funkcionisanje servisa
3. **Nema prodaje podataka** — nikada ne prodajemo ili delimo vaše podatke
4. **Nema AI treniranja** — vaše slike se ne koriste za treniranje modela
5. **Jednostavno brisanje** — obrišite nalog i sve podatke u par klikova
6. **Eksport podataka** — preuzmite sve slike u originalnom kvalitetu

## Šta treba proveriti kod vašeg provajdera?

Kada birate cloud storage za slike, pitajte:
1. Gde se čuvaju moji podaci?
2. Da li se moje slike koriste za AI treniranje?
3. Mogu li obrisati sve podatke?
4. Da li je kompanija GDPR usklađena?
5. Ko ima pristup mojim slikama?

## Zaključak

GDPR vam daje moćna prava. Koristite ih. Izaberite cloud storage koji poštuje ta prava od prvog dana.
      `.trim(),
    },
    en: {
      title: 'The GDPR and your photos: what you need to know',
      description:
        'Everything you need to know about GDPR protection for photos in cloud storage — your rights and how to exercise them.',
      author: 'MyPhoto Team',
      readingTime: '5 min',
      tags: ['GDPR', 'privacy', 'legal'],
      content: `
## What is the GDPR?

The GDPR (General Data Protection Regulation) is the European data protection law that took effect in 2018. It applies to every company that processes the data of EU citizens — wherever that company is based.

## Does the GDPR apply to photos?

**Yes!** Photos contain personal data:
- **Biometric data** — the faces in your photos
- **Location data** — GPS coordinates in the EXIF metadata
- **Time data** — when and where you were
- **Device data** — which phone you use

## Your rights under the GDPR

### Right of access (Article 15)
You have the right to know what data a company holds about you and how it uses it.

### Right to erasure (Article 17)
You can demand that all your data is deleted — including every copy and backup.

### Right to data portability (Article 20)
You can ask for all your data to be delivered in a standard, machine-readable format.

### Right to object (Article 21)
You can object to your data being processed for marketing or profiling.

## How MyPhoto respects the GDPR

1. **EU data center** — all data is stored in Frankfurt, Germany
2. **Minimal processing** — we only process the data needed to run the service
3. **No selling data** — we never sell or share your data
4. **No AI training** — your photos are never used to train models
5. **Easy deletion** — delete your account and all your data in a few clicks
6. **Data export** — download all your photos in original quality

## What to check with your provider

When choosing cloud storage for your photos, ask:
1. Where is my data stored?
2. Are my photos used for AI training?
3. Can I delete all my data?
4. Is the company GDPR compliant?
5. Who has access to my photos?

## The bottom line

The GDPR gives you powerful rights. Use them. Choose cloud storage that respects those rights from day one.
      `.trim(),
    },
  },
];

/** Flatten a post to one language (falls back to English). */
export function localizePost(post: BlogPost, locale: Locale): LocalizedBlogPost {
  const c = post[locale] ?? post.en;
  return { slug: post.slug, date: post.date, ...c };
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}
