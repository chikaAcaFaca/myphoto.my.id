# MyPhoto.my.id — Plan izrade Android aplikacije i novi cenovnik

**Datum:** 19. mart 2026.
**Pripremio:** Claude AI asistent

---

## DEO 1: PRONADJENI BAGOVI

### 1.1 Referral link — localhost bug
**Fajl:** `apps/web/.env` — linija 31
```
NEXT_PUBLIC_APP_URL=http://localhost:3001
```
**Problem:** Ako na Vercel-u NIJE podesena env varijabla `NEXT_PUBLIC_APP_URL`, referral linkovi ce koristiti `http://localhost:3001/register?ref=XXXXX` umesto `https://myphoto.my.id/register?ref=XXXXX`.

**Resenje:** Proveriti na Vercel Dashboard → Settings → Environment Variables da li postoji `NEXT_PUBLIC_APP_URL=https://myphoto.my.id`. Ako ne postoji — DODATI.

### 1.2 S3 CORS — localhost u produkciji
**Fajl:** `apps/web/src/lib/s3.ts` — linija 122
```
AllowedOrigins: ['https://myphoto.my.id', 'https://*.vercel.app', 'http://localhost:3000']
```
**Problem:** Localhost origin u CORS konfiguraciji. Nije veliki security rizik jer S3 koristi i autentifikaciju, ali treba ocistiti za produkciju.

---

## DEO 2: NOVI FUNNEL I STORAGE SISTEM

### 2.1 Kako korisnik dobija besplatan prostor

| Akcija | Nagrada | Kumulativno |
|--------|---------|-------------|
| Registracija (web/mobile) | +1 GB | 1 GB |
| Instalacija Android/iOS app + ukljuci autobackup | +1 GB | 2 GB |
| Instalacija Desktop app + ukljuci sinhronizaciju | +1 GB | 3 GB |
| Svaki referral (do 14 prijatelja) | +512 MB | max +7 GB |
| **Ukupno moguce besplatno** | | **10 GB** |

### 2.2 MyDisk Free tier
- Ako korisnik zeli da koristi MyDisk opciju sa Free tier-om, placa **3.99 EUR/godisnje**
- Koliki god da je njegov besplatni prostor DOBIJA MAXIMALNIH 10GB UKUPNO ZNAČI MOŽE ODMAH POSLE REGISTRACIJE DA UPLATI TIH 10gb I KORISTI IH BEZ DA ŠALJE REFFERAL LINKOVE ODMAH IMA MAX 10gb(max 10 GB za MyDisk deo KOJI MOŽE A NEMORA DA AUTOMATSKI POVEŽE SA AUTOBACKUP FOLDEROM SA SLIKAMA)
- Referral linkovi su uvek ukljuceni u svaki deljeni dokument/folder/album
- Referrali UVEK daju nagradu (+1GB) onima koji se registruju preko njih ALI MORAJU DA SKINU APLIKACIJU NA TELEFON ANDROID ILI WEBAPP NA SAJTU I DA PREBACE BAREM 100mb FAJLOVA BILO SLIKA ILI 

### 2.3 Deljeni folderi — zauzimanje prostora
Kada korisnik pristupi deljenom folderu/albumu:
- Velicina deljenog sadrzaja se **dodaje na zauzeti prostor** svakog korisnika koji ima pristup
- Primer: Mladenci dele 5 GB slika sa svadbe → svakom gostu se dodaje 5 GB na zauzeti prostor
- Ako gost ima 2 GB slobodnog prostora, moze videti samo 2 GB od 5 GB slika
- Ostatak je zakljucan sa ponudom za nadogradnju (upsell) 

### 2.4 Upsell flow za deljene foldere
Korisnik vidi deljeni folder od 5 GB ali ima samo 2 GB slobodnog:
1. Vidi prvih 2 GB sadrzaja
2. Na ostale fajlove vidi blur/lock overlay
3. NA PRVI SLEDEĆI U OVOM SLUČAJU JE 3,99€ GODIŠNJA PRETPLATA
4. Poruka: "Nadogradite na MiniPhoto (64 GB) za samo 0.99 EUR/mesec ili 9.99 EUR/godisnje da vidite sve slike"
5. Ili: "Pozovite prijatelje i dobijte +512 MB za svakog (do 10 GB besplatno)" 


---

## DEO 3: NOVI CENOVNIK

### Pravilo konverzije
- Stare cene su bile u EUR
- Nove cene: tretiramo stare EUR vrednosti kao USD, pa delimo sa 1.12
- Formula: nova_cena_EUR = stara_cena_EUR / 1.12
- Zaokruzujemo na 2 decimale

### 3.1 NOVI TIER-OVI (dodajemo)

| Tier | Storage | Mesecno | Godisnje | Napomena |
|------|---------|---------|----------|----------|
| **MiniPhoto** | 64 GB | 0.99 EUR | 9.99 EUR | Samo slike/video, + MyDisk | ZAHTEVA I DESKTOP APLIKACIJU ZA SINHRONIZACIJU DOKUMENATA RACUNAR MOBILNI
| **MyMiniDisk** | 32 GB | 0.69 EUR | 6.99 EUR | Samo MyDisk dokumenti, MOGU I SLIKE | ANDROID APLIKACIJA MOŽE SLIKE DA PODELI SA PRIJATELJIMA I PORODICOM NA ZAJEDNIČKOM CLAUDU U OKVIRU MYPHOTO.MY.ID PORTALA. JEDAN PLAĆA VELIKI PROSTOR I ODREDI JOŠ DO 5 ČLANOVA SVOJE PORODICE KOJI MOGU DA IMAJU PRISTUP NJEGOVIM SLKAMA ILI POJEDNIAČNIM FOLDERIMA U OKVIRU MYDISK FOLDERA VAĆI I ZA TIMOVE STOM TIMOVI DELE VEĆE 

### 3.2 PRERACUNATE CENE — Standard (bez AI)
REMOWEBG FREE FICHER 
| Tier | Storage | Stara mes. | Nova mes. | Stara god. | Nova god. |
|------|---------|-----------|-----------|-----------|-----------|
| Free | 1 GB | 0.00 | 0.00 | 0.00 | 0.00 |
| MiniPhoto **(NOVO)** | 64 GB | — | 0.99 | — | 9.99 |
| MyMiniDisk **(NOVO)** | 32 GB | — | 0.69 | — | 6.99 |
| MyDisk | 50 GB | 0.99 | 0.88 | 9.90 | 8.84 |
| Starter | 150 GB | 2.49 | 2.22 | 24.90 | 22.23 |
| Plus | 250 GB | 3.49 | 3.2 | 34.90 | 31.99 |
| Standard | 500 GB | 5.99 | 5.35 | 59.90 | 53.48 |
| Pro | 750 GB | 8.99 | 8.03 | 89.90 | 80.27 |
| Pro+ | 1.25 TB | 13.49 | 11.99 | 134.90 | 119.90 |
| Premium | 2.5 TB | 24.99 | 22.29 | 249.90 | 222.99 |
| Business | 5 TB | 45.99 | 44.99 | 459.90 | 449.99 |
| Enterprise | 10 TB | 84.99 | 80.99 | 849.90 | 809.99 |

### 3.3 PRERACUNATE CENE — AI tier

| Tier | Storage | Stara mes. AI | Nova mes. AI | Stara god. AI | Nova god. AI |
|------|---------|-------------|-------------|-------------|-------------|
| Starter AI | 150 GB | 2.99 | 2.69 | 29.90 | 26.90 |
| Plus AI | 250 GB | 4.49 | 3.99 | 44.90 | 39.99 |
| Standard AI | 500 GB | 7.99 | 7.19 | 79.90 | 71.99 |
| Pro AI | 750 GB | 11.99 | 10.99 | 119.90 | 109.99 |
| Pro+ AI | 1.25 TB | 17.99 | 15.99 | 179.90 | 159.99 |
| Premium AI | 2.5 TB | 31.99 | 29.99 | 319.90 | 299.99 |
| Business AI | 5 TB | 54.99 | 53.99 | 549.90 | 539.99 |
| Enterprise AI | 10 TB | 94.99 | 89.99 | 949.90 | 899.99 |

// ### 3.4 KVARTALNE I POLUGODISNJE CENE (standard, preracunate)
OVO NEĆEMO 
Kvartalna = mesecna × 3 × 0.975 (2.5% popust)
Polugodisnja = mesecna × 6 × 0.95 (5% popust)

| Tier | Nova kvart. | Nova polugod. |
|------|------------|--------------|
| MiniPhoto | 2.90 | 5.64 |
| MyMiniDisk | 2.02 | 3.93 |
| MyDisk | 2.57 | 5.02 |
| Starter | 6.49 | 12.65 |
| Plus | 9.13 | 17.78 |
| Standard | 15.65 | 30.50 |
| Pro | 23.49 | 45.77 |
| Pro+ | 35.22 | 68.63 |
| Premium | 65.26 | 127.17 |
| Business | 120.10 | 234.04 |
| Enterprise | 221.95 | 432.52 |

### 3.5 Referral sistem — promene

| Parametar | Staro | Novo |
|-----------|-------|------|
| Bonus po referralu | 1 GB | 512 MB |
| Max referrala | 10 | 14 |
| Max referral bonus | 10 GB | 7 GB |
| Registracija bonus | 1 GB | 1 GB |
| App install bonus | 4 GB | 1 GB (Android/iOS) |
| Desktop install bonus | 0 | 512MB | DA BI RADIO MYDISK
| **Max besplatno** | **15 GB** | **10 GB** |

### 3.6 MyDisk Free pristup
- Korisnik moze koristiti MyDisk sa Free tier-om DO 3GB ALI MORA DA IH ZARADI [ REGISTRACIJA (1GB) + APP INSTALL AUTOBACKUP ON (1GB) + DESKTOP INSTALL BONUS (512MB) + 1 REFFERAL (512MB) ]
- Placa **3.99 EUR/godisnje** fiksno ODMAH MEŽE DA KORISTI 10GB AUTOBACKUP NEMOŽE DA ISKLJUČI TEK NA VEĆIM TIERIMA I MOŽE DA DODELI DEDIKATED SPACE ZA MAY DISK A A OSTALO ZA MYPHOTO 
- Dobija pristup MyDisk-u sa svim besplatnim GB koje ima (max 10 GB)
- Ukljucuje slike/video backup — samo fajlovi/dokumenti TREBA DA MU NAPRAVIMO TESNIM KORISNIČKO ISKUSTVO DA BI SMO GA NATERALI NA VEĆI TIER 

---

## DEO 4: PLAN IZRADE ANDROID APLIKACIJE

### 4.1 Tehnologija
- **Expo (React Native)** — deli logiku sa web app-om
- **EAS Build** — automatski build na cloud-u
- **OTA Updates** — JS promene se deployuju bez Play Store-a

### 4.2 Funkcionalnosti Android app-a

| Funkcionalnost | Prioritet | Opis |
|---------------|-----------|------|
| Registracija/Login | P0 | Google OAuth + email, referral code podrska |
| Auto-backup slika | P0 | Background service, skenira galeriju, uploaduje nove slike |
| MyDisk browser | P0 | Pregled, download, upload fajlova i foldera |
| Deljenje fajlova/foldera | P0 | Share link sa Read/ReadWrite dozvolama |
| Push notifikacije | P1 | Novi deljeni sadrzaj, backup status |
| Remove-BG (offline) | P1 | ONNX model bundlovan u app, GPU akceleracija |
| Galerija slika | P1 | Pregled uploadovanih slika, albumi |
| Desktop sync status | P2 | Prikaz sta se sinhronizuje |
| Paddle placanja (in-app) | P0 | Pretplate direktno iz app-a |
| Referral sistem | P0 | Deljenje referral linka, prikaz statusa |

### 4.3 Faze razvoja

**Faza 1 — MVP (2-3 nedelje)**
- [ ] Expo projekat setup + navigacija
- [ ] Firebase Auth (Google + email)
- [ ] Auto-backup slika (background task)
- [ ] Osnovna galerija
- [ ] MyDisk browser (list, upload, download)
- [ ] Push notifikacije
- [ ] Play Store listing

**Faza 2 — Monetizacija (1-2 nedelje)** OVDE MI TREBA DETALJNO PUTSTVO 
- [ ] Paddle in-app placanja
- [ ] Upsell UI (kad je prostor pun)
- [ ] Referral sistem u app-u
- [ ] Deljenje fajlova/foldera

**Faza 3 — AI i Premium (1-2 nedelje)**
- [ ] Remove-BG sa bundlovanim modelom FREE FITCHER
- [ ] Face recognition
- [ ] Smart search
- [ ] Offline podrska

### 4.4 Potrebno za Play Store
1. Google Developer nalog — $25 (jednokratno, dozivotno) IMAM NA NALOGU CHIKA.ACA.COOL.FACA@GMAIL.COM
2. Privacy Policy — vec postoji na /privacy
3. App ikone (512x512 PNG) + feature graphic (1024x500)
4. Minimum 2 screenshot-a telefona
5. Potpisan AAB fajl (EAS Build generise) OVO NEZNAM ŠTA JE?
6. Opis app-a na srpskom i engleskom (APP TREBA DA BUDE NA JEZIKU KORISNIKA KOJI JE PODESIO U TELEFONU)

### 4.5 CI/CD Pipeline
```
git push → GitHub Actions:
  ├── Web: Vercel auto-deploy (2 min) → LIVE
  ├── Desktop: electron-builder → GitHub Releases (5 min)
  └── Android: EAS Build → AAB → Play Store upload (10-15 min)
       └── JS-only promene: EAS Update → OTA (5 min, bez Play Store-a)
```

### 4.6 Troskovi

| Stavka | Cena | Ucestalost |
|--------|------|-----------|
| Google Developer nalog | $25 | Jednom |
| EAS Build (Expo) | Besplatno (30 build/mes) | Mesecno |
| Apple Developer (buduci iOS) | $99/god | Godisnje | OVO NEMAM MOŽE LI ONI VAN ISTORE DA INSTALIRAJU APP? DA IM DAMO DA JE SKINU? 
| Wasabi S3 storage | ~$6.99/TB/mes | Mesecno |
| Vercel hosting | $0 (posle optimizacije) | Mesecno |

---

## DEO 5: AKCIONI PLAN — REDOSLED RADA
0. PROCITAJ OVAJ DOKUMENT I POSTAVITI DODATNA PITANJA PA KADA IH PROĐEMO NASTAVI SA RADOM PO DOGOVORENOM PLANU. BITNO
1. **ODMAH** — Popraviti referral link bug (NEXT_PUBLIC_APP_URL na Vercel-u)
2. **ODMAH** — Azurirati cene u constants/index.ts (nova konverzija USD→EUR)
3. **ODMAH** — Dodati MiniPhoto i MyMiniDisk tier-ove
4. **ODMAH** — Promeniti referral bonus na 512 MB, max 20 referrala
5. **ODMAH** — Dodati desktop install bonus (+1 GB)
6. **ODMAH** — Promeniti app install bonus na 1 GB (sa 4 GB)
7. **SLEDECE** — Implementirati deljeni folder zauzimanje prostora
8. **SLEDECE** — Implementirati upsell za deljene foldere (blur/lock)
9. **SLEDECE** — MyDisk Free tier (3.99 EUR/god)
10. **ANDROID** — Pokrenuti Expo projekat, implementirati po fazama

---

**NAPOMENA:** Pregledaj ovaj dokument, unesi izmene koje zelis, i na osnovu tvojih prepravki nastavljam sa implementacijom. 

PREPRAVKE PROČITAJ I POSTAVI PITANJA AKO SAM NEŠTO OSTAVIO NEJASNO
