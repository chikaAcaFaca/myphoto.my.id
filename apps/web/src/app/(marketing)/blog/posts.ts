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
    slug: 'google-prostor-je-pun-sta-da-radim',
    date: '2026-10-12',
    sr: {
      title: 'Google prostor je pun: šta da radim?',
      description:
        'Stigla ti je poruka da je Google prostor pun? Evo šta to znači za Gmail i slike, kako da oslobodiš mesto za 10 minuta i kako da slike sačuvaš jeftinije.',
      author: 'MyPhoto Tim',
      readingTime: '6 min',
      tags: ['Google prostor', 'Google Photos', 'Gmail', 'backup'],
      content: `
## Šta znači „Prostor na Google nalogu je pun"

Svaki Google nalog dobija 15 GB besplatno, ali taj prostor **dele Gmail, Google Drive i Google Photos**. Kad se napuni:

- **Gmail ne prima nove mejlove**, a pošiljaoci dobijaju poruku da je tvoje sanduče puno
- **Google Photos prestaje da čuva nove slike** sa telefona
- **Drive ne prima nove fajlove**

Zato ovo nije sitnica: ako ne reaguješ, gubiš mejlove i nove slike više nisu nigde sačuvane osim na telefonu.

## Korak 1: vidi šta zauzima prostor

Otvori **one.google.com/storage** (ili u Google aplikaciji: Nalog → Prostor). Tu vidiš koliko troše Gmail, Drive i Photos, i Google ti sam predlaže šta može da se obriše.

## Korak 2: očisti Gmail (najbrži dobitak)

U pretragu Gmail-a ukucaj:

- \`has:attachment larger:10M\`: mejlovi sa velikim prilozima
- \`older_than:2y category:promotions\`: stare reklame

Označi i obriši, pa **isprazni Otpad**. Dok je u Otpadu, mejl i dalje zauzima prostor.

## Korak 3: očisti Drive

Na **drive.google.com/drive/quota** fajlovi su poređani po veličini. Stari video snimci, rezervne kopije telefona i duplikati obično oslobode najviše.

## Korak 4: Google Photos

U Google Photos: **Biblioteka → Uslužni programi → Upravljanje prostorom**. Tu su mutne slike, snimci ekrana i veliki video snimci, spremni za brisanje.

Pazi na dugme „Oslobodi prostor" u Photos-u: ono briše slike **sa telefona**, ne iz clouda. Prostor na Google nalogu se time ne oslobađa.

## Korak 5: premesti slike tamo gde je jeftinije

Ako ti posle čišćenja i dalje fali mesta, imaš dve opcije:

1. **Google One**: 100 GB za €1,99 mesečno (€19,99 godišnje), deli se sa Gmail-om i Drive-om.
2. **Poseban servis za slike**, pa Google prostor ostane za mejl.

**MyPhoto** je napravljen baš za to: aplikacija sama čuva slike i video sa telefona u cloud (serveri u Frankfurtu), na srpskom je i počinje sa **1 GB besplatno**. Kome treba više, **24 GB košta €4,99 godišnje**, a **64 GB €9,99 godišnje** (cene bez PDV-a).

## Ukratko

1. Pogledaj šta troši prostor (one.google.com/storage)
2. Obriši velike priloge u Gmail-u i isprazni Otpad
3. Obriši velike fajlove na Drive-u
4. Očisti mutne slike i snimke ekrana
5. Slike čuvaj odvojeno, pa Gmail nikad više ne staje

[Probaj MyPhoto besplatno →](https://myphotomy.space/download)
      `.trim(),
    },
    en: {
      title: 'Google storage is full: what do I do?',
      description:
        'Got the "Google storage is full" warning? What it means for Gmail and your photos, how to free space in 10 minutes, and a cheaper home for your photos.',
      author: 'MyPhoto Team',
      readingTime: '6 min',
      tags: ['Google storage', 'Google Photos', 'Gmail', 'backup'],
      content: `
## What "Your Google storage is full" means

Every Google account gets 15 GB free, but **Gmail, Google Drive and Google Photos share it**. When it fills up:

- **Gmail stops receiving email**, and senders are told your mailbox is full
- **Google Photos stops backing up** new photos from your phone
- **Drive accepts no new files**

So it matters: if you ignore it, you lose email and new photos are saved nowhere but your phone.

## Step 1: see what takes the space

Open **one.google.com/storage**. It shows how much Gmail, Drive and Photos use and suggests what to clean up.

## Step 2: clean Gmail (the quickest win)

Search Gmail for:

- \`has:attachment larger:10M\`: emails with big attachments
- \`older_than:2y category:promotions\`: old promotions

Select, delete, then **empty the Bin**. Mail in the Bin still counts.

## Step 3: clean Drive

**drive.google.com/drive/quota** lists files by size. Old videos, phone backups and duplicates usually free the most.

## Step 4: Google Photos

In Google Photos: **Library → Utilities → Manage storage** shows blurry photos, screenshots and large videos ready to delete.

Careful with "Free up space" in Photos: it deletes photos **from your phone**, not from the cloud, so it does not free Google storage.

## Step 5: move photos somewhere cheaper

If you still need room after cleaning:

1. **Google One**: 100 GB for €1.99/month (€19.99/year), shared with Gmail and Drive.
2. **A separate photo service**, so your Google storage stays free for email.

**MyPhoto** is built for exactly that: the app backs up your phone's photos and videos automatically (servers in Frankfurt) and starts with **1 GB free**. Need more? **24 GB is €4.99 a year** and **64 GB €9.99 a year** (prices excl. VAT).

## In short

1. See what uses the space (one.google.com/storage)
2. Delete big Gmail attachments and empty the Bin
3. Delete big Drive files
4. Clear blurry photos and screenshots
5. Keep photos separately, so Gmail never stops again

[Try MyPhoto free →](https://myphotomy.space/download)
      `.trim(),
    },
  },
  {
    slug: 'kako-osloboditi-prostor-na-google-photos',
    date: '2026-10-12',
    sr: {
      title: 'Kako osloboditi prostor na Google Photos (bez brisanja uspomena)',
      description:
        'Google Photos troši tvojih 15 GB? Kako da obrišeš ono što ti ne treba, a sačuvaš sve važne slike, korak po korak.',
      author: 'MyPhoto Tim',
      readingTime: '5 min',
      tags: ['Google Photos', 'prostor', 'saveti'],
      content: `
## Zašto se Google Photos tako brzo puni

Svaka slika sa novog telefona ima 3–8 MB, a minut videa u 4K i preko 300 MB. Uz WhatsApp i Viber slike koje se same čuvaju, 15 GB nestane za nekoliko meseci.

## 1. Obriši ono što sigurno ne treba

U Google Photos otvori **Biblioteka → Uslužni programi → Upravljanje prostorom**. Google grupiše:

- **snimke ekrana**: obično ih ima stotine
- **mutne slike**
- **velike video snimke**: često jedan video zauzima koliko 100 slika

Pregledaj grupu, označi sve i obriši.

## 2. Isključi backup WhatsApp i Viber foldera

Slike iz grupa i memovi koje si primio se čuvaju zajedno sa tvojim. U podešavanjima backup-a isključi foldere **WhatsApp Images**, **Viber** i **Download** ako ti ne trebaju.

## 3. Ne zaboravi Otpad

Obrisane slike ostaju u Otpadu 60 dana i **i dalje troše prostor**. Isprazni ga ručno.

## 4. Velike video snimke preseli

Video troši najviše. Snimke koje želiš da sačuvaš preuzmi na računar ili ih čuvaj na servisu sa više prostora, pa ih obriši iz Google Photos-a.

## 5. Kad čišćenje nije dovoljno

Ako imaš puno slika koje ne želiš da brišeš, treba ti više prostora. Upoređenje za male potrebe:

| | Cena |
|---|---|
| Google One 100 GB | €19,99 godišnje (deli se sa Gmail-om) |
| MyPhoto 24 GB | €4,99 godišnje |
| MyPhoto 64 GB | €9,99 godišnje |

MyPhoto cene su bez PDV-a. MyPhoto aplikacija sama čuva nove slike i video sa telefona, a Google prostor ti ostaje za mejl.

[Preuzmi MyPhoto, 1 GB besplatno →](https://myphotomy.space/download)
      `.trim(),
    },
    en: {
      title: 'How to free up space in Google Photos (without deleting memories)',
      description:
        'Is Google Photos eating your 15 GB? How to delete what you do not need and keep every photo that matters, step by step.',
      author: 'MyPhoto Team',
      readingTime: '5 min',
      tags: ['Google Photos', 'storage', 'tips'],
      content: `
## Why Google Photos fills up so fast

A photo from a modern phone is 3–8 MB, and a minute of 4K video is over 300 MB. Add WhatsApp images saved automatically and 15 GB is gone in months.

## 1. Delete what you surely do not need

In Google Photos open **Library → Utilities → Manage storage**. Google groups:

- **screenshots**: usually hundreds of them
- **blurry photos**
- **large videos**: one video often takes as much as 100 photos

Review a group, select all, delete.

## 2. Stop backing up WhatsApp folders

Group photos and memes you received are backed up with yours. In backup settings turn off **WhatsApp Images**, **Viber** and **Download** if you do not need them.

## 3. Do not forget the Bin

Deleted items stay in the Bin for 60 days and **still use space**. Empty it yourself.

## 4. Move large videos

Video takes the most. Download the clips you want to keep to a computer or a service with more room, then delete them from Google Photos.

## 5. When cleaning is not enough

If you have lots of photos you want to keep, you need more space. For small needs:

| | Price |
|---|---|
| Google One 100 GB | €19.99 a year (shared with Gmail) |
| MyPhoto 24 GB | €4.99 a year |
| MyPhoto 64 GB | €9.99 a year |

MyPhoto prices exclude VAT. The MyPhoto app backs up new photos and videos automatically, and your Google storage stays free for email.

[Get MyPhoto, 1 GB free →](https://myphotomy.space/download)
      `.trim(),
    },
  },
  {
    slug: 'kako-sacuvati-slike-sa-telefona',
    date: '2026-10-12',
    sr: {
      title: 'Kako sačuvati slike sa telefona pre nego što ga promeniš, prodaš ili izgubiš',
      description:
        'Tri načina da slike sa Android telefona budu na sigurnom: kabl i računar, Google, ili automatski backup. Šta ko izabere i zašto.',
      author: 'MyPhoto Tim',
      readingTime: '5 min',
      tags: ['backup', 'Android', 'novi telefon'],
      content: `
## Telefon se kad-tad pokvari, izgubi ili zameni

Ako su slike samo na telefonu, sa njim nestaju i one. Najčešće se to sazna prekasno: kad se telefon razbije ili ostane u taksiju.

## Način 1: kabl i računar

Poveži telefon kablom, na telefonu izaberi **Prenos fajlova**, i na računaru kopiraj folder **DCIM/Camera**.

- **Plus:** besplatno, sve slike u originalu
- **Minus:** radiš ručno, i slike su opet samo na jednom mestu (računaru)

## Način 2: Google Photos

Uključi backup u Google Photos aplikaciji.

- **Plus:** automatski
- **Minus:** 15 GB se deli sa Gmail-om i Drive-om, pa se brzo napuni (vidi [Google prostor je pun](/blog/google-prostor-je-pun-sta-da-radim))

## Način 3: aplikacija za automatski backup

MyPhoto aplikacija sama šalje svaku novu sliku i video u cloud, preko WiFi-a ili mobilnih podataka, kako izabereš.

- **Plus:** automatski, prostor samo za slike i fajlove, serveri u Frankfurtu, srpski jezik
- **Minus:** besplatno je 1 GB; za više je 24 GB €4,99 godišnje

## Pre prodaje telefona

1. Proveri da li su **sve slike** sačuvane: otvori aplikaciju za backup i vidi da li broj slika odgovara
2. Sačuvaj i **WhatsApp/Viber** slike ako ti trebaju (folderi su odvojeni od kamere)
3. Tek onda vrati telefon na fabrička podešavanja

## Na novom telefonu

Instaliraj istu aplikaciju i prijavi se istim nalogom: sve slike su odmah tu.

[Preuzmi MyPhoto, 1 GB besplatno →](https://myphotomy.space/download)
      `.trim(),
    },
    en: {
      title: 'How to save the photos on your phone before you replace, sell or lose it',
      description:
        'Three ways to keep the photos on your Android phone safe: cable and computer, Google, or automatic backup. Who should pick what, and why.',
      author: 'MyPhoto Team',
      readingTime: '5 min',
      tags: ['backup', 'Android', 'new phone'],
      content: `
## Sooner or later a phone breaks, gets lost or replaced

If your photos live only on the phone, they go with it. Most people find out too late: when the screen cracks or the phone stays in a taxi.

## Option 1: cable and computer

Connect the phone, choose **File transfer** on the phone and copy the **DCIM/Camera** folder to the computer.

- **Pro:** free, every photo in original quality
- **Con:** manual, and the photos are again in only one place

## Option 2: Google Photos

Turn on backup in the Google Photos app.

- **Pro:** automatic
- **Con:** the 15 GB is shared with Gmail and Drive and fills up fast (see [Google storage is full](/blog/google-prostor-je-pun-sta-da-radim))

## Option 3: an automatic backup app

The MyPhoto app sends every new photo and video to the cloud by itself, over Wi-Fi or mobile data, as you choose.

- **Pro:** automatic, storage only for photos and files, servers in Frankfurt
- **Con:** 1 GB is free; beyond that, 24 GB is €4.99 a year

## Before you sell the phone

1. Check that **all photos** are backed up: open the backup app and compare the count
2. Save **WhatsApp/Viber** images too if you need them (separate folders)
3. Only then factory-reset the phone

## On the new phone

Install the same app and sign in with the same account: all your photos are there.

[Get MyPhoto, 1 GB free →](https://myphotomy.space/download)
      `.trim(),
    },
  },
  {
    slug: 'kako-napraviti-stiker-od-slike',
    date: '2026-10-12',
    sr: {
      title: 'Kako napraviti stiker od svoje slike za Viber i WhatsApp',
      description:
        'Od bilo koje slike napravi stiker bez pozadine ili mim sa tekstom za 10 sekundi, na telefonu, besplatno.',
      author: 'MyPhoto Tim',
      readingTime: '3 min',
      tags: ['stikeri', 'mimovi', 'Viber', 'WhatsApp'],
      content: `
## Najbolji stikeri su oni sa tvojim licima

Drugar koji pravi grimasu, pas, šef na slavlju: stiker od takve slike nasmeje celu grupu više od bilo kog gotovog paketa.

## Korak po korak u MyPhoto aplikaciji

1. Otvori sliku u aplikaciji MyPhoto
2. Izaberi **Napravi stiker**: aplikacija sama ukloni pozadinu i ostavi osobu ili predmet
3. Po želji dodaj **tekst** (gore i dole, kao klasičan mim)
4. Sačuvaj stiker: on ide u poseban album na telefonu
5. U Viberu, WhatsApp-u ili Telegramu izaberi **prikači sliku** i otvori taj album

Sve se radi na telefonu, za nekoliko sekundi.

## Mim umesto stikera

Za mim ne treba uklanjati pozadinu: izaberi sliku, upiši tekst i podeli. Najbolje prolaze kratki tekstovi, do 6–8 reči.

## Meme Wall

Mimove možeš da objaviš i na **Meme Wall**, gde ih vide, lajkuju i dele drugi korisnici. Kad neko preko tvog mima napravi nalog i sačuva prvih 100 MB, ti dobijaš **250 MB više prostora**.

[Preuzmi MyPhoto i napravi prvi stiker →](https://myphotomy.space/download)
      `.trim(),
    },
    en: {
      title: 'How to turn your own photo into a sticker for Viber and WhatsApp',
      description:
        'Turn any photo into a background-free sticker or a captioned meme in 10 seconds, on your phone, for free.',
      author: 'MyPhoto Team',
      readingTime: '3 min',
      tags: ['stickers', 'memes', 'Viber', 'WhatsApp'],
      content: `
## The best stickers have your own faces

A friend pulling a face, the dog, the boss at a party: a sticker made from that gets more laughs than any ready-made pack.

## Step by step in the MyPhoto app

1. Open the photo in the MyPhoto app
2. Choose **Make sticker**: the app removes the background and keeps the person or object
3. Add **text** if you like (top and bottom, like a classic meme)
4. Save the sticker: it goes into its own album on the phone
5. In Viber, WhatsApp or Telegram choose **attach photo** and open that album

It all happens on the phone in seconds.

## A meme instead of a sticker

A meme needs no background removal: pick a photo, type the caption, share. Short captions, 6–8 words at most, work best.

## Meme Wall

You can post memes on the **Meme Wall**, where other users see, like and share them. When someone signs up through your meme and backs up their first 100 MB, you get **250 MB more storage**.

[Get MyPhoto and make your first sticker →](https://myphotomy.space/download)
      `.trim(),
    },
  },
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
- **EU serveri** — vaše slike se čuvaju u data centru u Frankfurtu
- **Nema AI treniranja** — vaše slike se ne koriste za treniranje modela
- **Šifrovanje** — slike su šifrovane u prenosu (HTTPS) i na serveru
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
- **EU servers** — your photos are stored in a Frankfurt data centre
- **No AI training** — your photos are never used to train models
- **Encryption** — photos are encrypted in transit (HTTPS) and at rest
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
| Gde su slike | SAD + globalno | EU (Frankfurt) |
| Šifrovanje | U prenosu i na serveru | U prenosu i na serveru |
| Prostor deljen sa mejlom | Da (Gmail, Drive) | Ne, samo za slike i fajlove |
| Jezik i podrška | Globalno | Srpski i engleski |

**Pobednik: MyPhoto** za one koji žele slike u EU i podršku na svom jeziku.

## Kvalitet slike

- **Google Photos (besplatno)**: Kompresuje slike na 16MP, video na 1080p
- **Google Photos (Google One)**: Original kvalitet, ali troši storage
- **MyPhoto**: Uvek original kvalitet, bez kompresije

**Pobednik: MyPhoto** — nikada ne kompresuje vaše slike.

## Cena

| Plan | Google One | MyPhoto |
|---|---|---|
| Besplatan | 15GB (deljeno sa Gmail-om i Drive-om) | 1GB + do 1,5GB uz preporuke |
| Mali paket | 100GB za €1.99/mes ili €19.99/god | 24GB za €4.99/god, 64GB za €9.99/god |
| 150-200GB | 200GB za €2.99/mes | 150GB za €7.47 na 3 meseca |
| 250GB | — | €11.97 na 3 meseca ili €39.90/god |

Cene MyPhoto paketa su bez PDV-a. Google One deli prostor sa Gmail-om i Drive-om, a MyPhoto prostor je samo za slike i fajlove.

**Pobednik: zavisi od potrebe.** Kome treba do 64GB, MyPhoto je jeftiniji (€4.99–9.99 godišnje). Za 100GB i više Google One je jeftiniji po gigabajtu.

## AI funkcije

Google Photos nudi AI pretragu i grupisanje lica. MyPhoto nema AI pretragu — fokus je na privatnom backup-u u originalnom kvalitetu, a vaše slike se nikada ne koriste za treniranje AI modela.

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
| Where photos live | US + global | EU (Frankfurt) |
| Encryption | In transit and at rest | In transit and at rest |
| Storage shared with email | Yes (Gmail, Drive) | No, photos and files only |
| Language and support | Global | Serbian and English |

**Winner: MyPhoto** if you want your photos in the EU and support in your language.

## Image quality

- **Google Photos (free)**: compresses photos to 16 MP and video to 1080p
- **Google Photos (Google One)**: original quality, but it eats into your storage
- **MyPhoto**: always original quality, no compression

**Winner: MyPhoto** — it never compresses your photos.

## Price

| Plan | Google One | MyPhoto |
|---|---|---|
| Free | 15 GB (shared with Gmail and Drive) | 1 GB + up to 1.5 GB from referrals |
| Small plan | 100 GB for €1.99/mo or €19.99/yr | 24 GB for €4.99/yr, 64 GB for €9.99/yr |
| 150–200 GB | 200 GB for €2.99/mo | 150 GB for €7.47 per 3 months |
| 250 GB | — | €11.97 per 3 months or €39.90/yr |

MyPhoto prices exclude VAT. Google One shares its storage with Gmail and Drive; MyPhoto storage is for your photos and files only.

**Winner: it depends.** Up to 64 GB, MyPhoto is cheaper (€4.99–9.99 a year). From 100 GB up, Google One costs less per gigabyte.

## AI features

Google Photos offers AI search and face grouping. MyPhoto doesn't offer AI search — it focuses on private backup in original quality, and your photos are never used to train AI models.

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

## 1. Slike su na serverima širom sveta

Google čuva podatke u data centrima širom sveta. Ko želi da mu porodične slike budu u Evropi, pod evropskim zakonima, mora da potraži drugi servis.

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

## 1. Your photos live on servers around the world

Google stores data in data centres worldwide. If you want your family photos kept in Europe, under European law, you need another service.

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

1. **EU data centar** — slike i fajlovi se čuvaju u Frankfurtu, Nemačka
2. **Minimalna obrada** — obrađujemo samo podatke potrebne za funkcionisanje servisa
3. **Nema prodaje podataka** — nikada ne prodajemo vaše podatke niti ih koristimo za reklame
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

1. **EU data center** — photos and files are stored in Frankfurt, Germany
2. **Minimal processing** — we only process the data needed to run the service
3. **No selling data** — we never sell your data or use it for ads
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
