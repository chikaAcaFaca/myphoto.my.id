export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  readingTime: string;
  tags: string[];
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'zasto-je-privatnost-vasih-fotografija-vazna',
    title: 'Zašto je privatnost vaših fotografija važna u 2025',
    description:
      'Saznajte zašto je zaštita privatnosti vaših fotografija ključna u digitalnom dobu i kako da izaberete siguran cloud storage.',
    date: '2025-01-15',
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

MyPhoto.my.id je dizajniran sa privatnošću na prvom mestu:
- **EU serveri** — vaši podaci nikada ne napuštaju Evropu
- **Nema AI treniranja** — vaše slike se ne koriste za treniranje modela
- **End-to-end enkripcija** — samo vi imate pristup
- **GDPR usklađenost** — potpuno usklađen sa evropskim zakonima
- **Transparentnost** — znate tačno šta se dešava sa vašim podacima

## Zaključak

Privatnost nije luksuz — to je pravo. Izaberite cloud storage koji poštuje vaše podatke. Isprobajte MyPhoto besplatno sa do 15GB prostora i uverite se sami.
    `.trim(),
  },
  {
    slug: 'kako-automatski-backup-ovati-slike-sa-android-telefona',
    title: 'Kako automatski backup-ovati sve slike sa Android telefona',
    description:
      'Korak po korak vodič za automatski backup svih fotografija i videa sa vašeg Android telefona u privatni cloud.',
    date: '2025-01-20',
    author: 'MyPhoto Tim',
    readingTime: '4 min',
    tags: ['android', 'backup', 'vodič'],
    content: `
## Zašto je backup slika važan?

Telefoni se gube, kradu ili kvare. Bez backup-a, gubite godine uspomena. Automatski backup osigurava da svaka nova slika bude bezbedno sačuvana u cloud-u.

## Korak 1: Instalirajte MyPhoto aplikaciju

1. Otvorite Google Play Store na vašem telefonu
2. Pretražite "MyPhoto.my.id"
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

## Bonus: Dobijte +4GB besplatno!

Kada instalirate aplikaciju i uključite automatski backup, dobijate **+4GB besplatnog prostora** — ukupno 5GB! Plus, za svakog prijatelja kog pozovete dobijate još +1GB (do 15GB ukupno).

## Šta se backup-uje?

- Sve fotografije (JPEG, PNG, HEIC, RAW)
- Svi video zapisi (MP4, MOV, AVI)
- Originalni kvalitet — bez kompresije
- EXIF podaci (lokacija, datum, uređaj)

## Često postavljana pitanja

**Da li backup troši puno baterije?**
Ne. MyPhoto koristi Android Background Fetch koji je optimizovan za minimalnu potrošnju baterije.

**Šta ako nemam dovoljno prostora?**
Besplatan plan počinje sa 1GB, a sa aplikacijom i backup-om dobijate 5GB. Pozovite prijatelje za do 15GB besplatno, ili nadogradite na Starter plan (150GB za $2.49/mes).

**Da li mogu backup-ovati samo određene foldere?**
Da! U podešavanjima možete izabrati tačno koje foldere želite da backup-ujete.
    `.trim(),
  },
  {
    slug: 'google-photos-vs-myphoto-detaljno-poredjenje',
    title: 'Google Photos vs MyPhoto: Detaljno poređenje',
    description:
      'Uporedite Google Photos i MyPhoto.my.id po privatnosti, ceni, kvalitetu slike i funkcijama. Saznajte koji je bolji za vas.',
    date: '2025-02-01',
    author: 'MyPhoto Tim',
    readingTime: '6 min',
    tags: ['poređenje', 'google photos', 'alternativa'],
    content: `
## Google Photos vs MyPhoto — šta je bolje za vaše slike?

Google Photos je najpopularniji servis za čuvanje slika, ali da li je i najbolji? Uporedimo ga sa MyPhoto.my.id po ključnim kriterijumima.

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
| Besplatan | 15GB (deljeno) | 1GB + do 14GB bonus |
| 100-150GB | $1.99/mes | $2.49/mes (150GB) |
| 200-250GB | $2.99/mes | $3.49/mes (250GB) |

Google One deli storage sa Gmail i Drive. MyPhoto je posvećen samo fotografijama.

**Pobednik: Izjednačeno** — Google je jeftiniji, MyPhoto nudi više za slike.

## AI funkcije

Oba servisa nude AI pretragu, ali sa ključnom razlikom: Google koristi vaše slike za treniranje, MyPhoto ne.

## Zaključak

Ako vam je privatnost važna i želite originalni kvalitet bez kompromisa, MyPhoto je bolji izbor. Ako vam je bitna samo cena i već koristite Google ekosistem, Google Photos može biti dovoljan.

Isprobajte MyPhoto besplatno i uverite se sami.
    `.trim(),
  },
  {
    slug: '5-razloga-da-prebacite-slike-sa-google-photos',
    title: '5 razloga da prebacite slike sa Google Photos-a',
    description:
      'Otkrijte 5 ključnih razloga zašto sve više korisnika prelazi sa Google Photos na privatne alternative poput MyPhoto.',
    date: '2025-02-10',
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

## Alternativa: MyPhoto.my.id

MyPhoto nudi:
- **1GB besplatno** + do 14GB bonus (app + pozivi prijatelja)
- **Originalni kvalitet** — bez kompresije
- **EU serveri** — GDPR zaštita
- **Bez AI treniranja** — vaše slike su samo vaše
- **Jednostavan uvoz** — prebacite slike sa Google Photos u par klikova

Isprobajte besplatno i vidite razliku.
    `.trim(),
  },
  {
    slug: 'gdpr-i-vase-fotografije-sta-treba-da-znate',
    title: 'GDPR i vaše fotografije: Šta treba da znate',
    description:
      'Sve što treba da znate o GDPR zaštiti vaših fotografija u cloud storage-u. Vaša prava i kako da ih zaštitite.',
    date: '2025-02-20',
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
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}
