import Link from 'next/link';
import { Cloud, ArrowLeft, FileText, Check, Scale } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold">MyPhoto</span>
          </Link>
          <Link href="/" className="btn-ghost flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Početna
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">Uslovi korišćenja</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Poslednje ažuriranje: {new Date().toLocaleDateString('sr-Latn-RS', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Scale className="h-4 w-4" />
            <span>Merodavno pravo: Republika Srbija | EU/GDPR | US/DMCA</span>
          </div>
        </div>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">

          {/* ═══════════════ BLOK 1: OSNOVE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">1. Uvod i prihvatanje uslova</h2>
            <p>
              Dobrodošli na MyPhoto.my.id (&quot;Servis&quot;, &quot;Platforma&quot;). Ovi Uslovi korišćenja
              (&quot;Uslovi&quot;) predstavljaju pravno obavezujući ugovor između vas (&quot;Korisnik&quot;)
              i MyPhoto.my.id (&quot;MyPhoto&quot;, &quot;mi&quot;, &quot;nas&quot;) koji reguliše vaš pristup i
              korišćenje Platforme.
            </p>
            <p className="mt-2">
              Korišćenjem Servisa, kreiranjem naloga ili pristupanjem bilo kom delu Platforme,
              potvrđujete da ste pročitali, razumeli i prihvatili ove Uslove u celosti.
              Ako se ne slažete sa bilo kojim delom ovih Uslova, ne koristite naš Servis.
            </p>
            <p className="mt-2">
              Morate imati najmanje <strong>16 godina</strong> za korišćenje ovog Servisa.
              Ovo ograničenje je u skladu sa GDPR (Član 8), COPPA (Children&apos;s Online Privacy
              Protection Act) i Zakonom o zaštiti podataka o ličnosti Republike Srbije. Korišćenjem
              Servisa potvrđujete da ispunjavate ovaj starosni uslov.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">2. Definicije</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>&quot;Servis&quot;</strong> — web aplikacija MyPhoto.my.id, uključujući sve poddomene, API-je i mobilne aplikacije</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>&quot;Korisnik&quot;</strong> — svako fizičko ili pravno lice koje pristupa ili koristi Servis</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>&quot;Sadržaj&quot;</strong> — svi fajlovi, fotografije, video zapisi, metapodaci i ostali materijali koje Korisnik uploaduje na Platformu</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>&quot;Lični podaci&quot;</strong> — svaka informacija koja se odnosi na identifikovano ili identifikabilno fizičko lice, u skladu sa GDPR Članom 4(1) i ZZPL Članom 4</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>&quot;Platforma&quot;</strong> — tehnička infrastruktura, serveri, softver i mreža koji čine osnovu Servisa</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>&quot;Nalog&quot;</strong> — registrovani korisnički profil sa jedinstvenim kredencijalima za pristup Servisu</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">3. Opis usluge</h2>
            <p>
              MyPhoto.my.id je cloud storage servis za čuvanje, organizovanje i deljenje
              fotografija i video zapisa. Servis obuhvata sledeće funkcionalnosti:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Čuvanje fotografija i videa u originalnom kvalitetu sa end-to-end enkripcijom u tranzitu
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                AI funkcije: smart search, auto-tagging, face recognition (opt-in, uz eksplicitnu saglasnost)
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Deljenje slika i albuma sa drugim korisnicima putem sigurnih linkova
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Family sharing sa do 5 članova porodice
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Export i preuzimanje svih podataka u standardnim formatima (GDPR prenosivost)
              </li>
            </ul>
          </section>

          {/* ═══════════════ BLOK 2: NALOG I KORIŠĆENJE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">4. Registracija i nalog</h2>
            <p>
              Za korišćenje Servisa potreban vam je nalog. Registracija je moguća putem
              Google naloga ili email adrese. Kreiranjem naloga potvrđujete da:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Imate najmanje 16 godina (u skladu sa GDPR Članom 8 i COPPA regulativom)
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Pružate tačne i potpune informacije prilikom registracije
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Ste odgovorni za sigurnost svog naloga, lozinke i svih aktivnosti na nalogu
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Ćete nas odmah obavestiti o neovlašćenom pristupu putem legal@myphoto.my.id
              </li>
            </ul>
            <p className="mt-3">
              MyPhoto zadržava pravo da odbije registraciju ili ukine nalog koji krši ove Uslove,
              uz obrazloženje i mogućnost žalbe.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">5. Dozvoljeno korišćenje</h2>
            <p className="mb-3">Korišćenjem Servisa se obavezujete da nećete:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Uploadovati nelegalan sadržaj, uključujući ali ne ograničavajući se na materijal koji krši autorska prava
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Uploadovati CSAM (Child Sexual Abuse Material) — prijavljujemo nadležnim organima bez izuzetka
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Koristiti Servis za distribuciju malvera, ransomware-a ili štetnog softvera
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Pokušavati neovlašćen pristup drugim nalozima, serverima ili infrastrukturi (haking)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Koristiti Servis za masovni spam, phishing ili automatizovano korišćenje bez pisane dozvole
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Uploadovati sadržaj koji promoviše nasilje, govor mržnje ili diskriminaciju
              </li>
            </ul>
            <p className="mt-3">
              Kršenje ovih pravila može rezultirati trenutnom suspenzijom naloga, brisanjem sadržaja
              i prijavljivanjem nadležnim organima u skladu sa zakonom.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">6. Vlasništvo nad sadržajem (Intelektualna svojina)</h2>
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="font-semibold text-green-800 dark:text-green-400">
                Vi zadržavate sva prava intelektualne svojine nad sadržajem koji uploadujete.
              </p>
              <p className="mt-2 text-green-700 dark:text-green-300">
                MyPhoto ne polaže nikakva vlasnička prava nad vašim fajlovima. Ne koristimo
                vaš sadržaj za trening AI modela, prodaju trećim licima niti za bilo koje druge
                svrhe osim pružanja Servisa koji ste eksplicitno zatražili.
              </p>
            </div>
            <p className="mt-3">
              Uploadovanjem sadržaja nam dajete ograničenu, neekskluzivnu, besplatnu licencu
              isključivo za sledeće svrhe:
            </p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Čuvanje i backup sadržaja na našim serverima
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Generisanje thumbnail-ova i optimizovanih verzija za prikaz
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                AI tagovanje i pretraga (samo ako ste aktivirali ovu funkciju)
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Prikaz sadržaja vama i korisnicima sa kojima ga eksplicitno delite
              </li>
            </ul>
            <p className="mt-3">
              Ova licenca se automatski ukida brisanjem sadržaja ili naloga. MyPhoto logo,
              dizajn i softver su zaštićeni autorskim pravima i pripadaju MyPhoto.
            </p>
          </section>

          {/* ═══════════════ BLOK 3: US COMPLIANCE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">7. DMCA / Autorska prava</h2>
            <p>
              MyPhoto poštuje prava intelektualne svojine i postupa u skladu sa Digital
              Millennium Copyright Act (DMCA), 17 U.S.C. § 512. Ako smatrate da vaš
              autorski rad krši sadržaj na našoj Platformi, možete podneti DMCA obaveštenje.
            </p>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">Notice & Takedown procedura:</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Pošaljite pisano obaveštenje na <strong>legal@myphoto.my.id</strong> sa identifikacijom zaštićenog dela, URL-om spornog sadržaja, vašim kontakt podacima i izjavom pod zakletvom
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Po prijemu validnog obaveštenja, uklonićemo ili onemogućiti pristup spornom sadržaju
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Obavestićemo korisnika koji je uploadovao sadržaj o prijavi
              </li>
            </ul>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">Counter-Notice:</p>
            <p className="mt-1">
              Ako smatrate da je vaš sadržaj pogrešno uklonjen, možete podneti counter-notice
              sa vašom izjavom pod zakletvom da sadržaj ne krši autorska prava. U tom slučaju,
              sadržaj može biti vraćen u roku od 10–14 radnih dana osim ako podnosilac prijave
              ne pokrene sudski postupak.
            </p>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">Repeat Infringer Policy:</p>
            <p className="mt-1">
              MyPhoto primenjuje politiku ukidanja naloga korisnika koji višestruko krše
              autorska prava. Tri potvrđena kršenja rezultiraju trajnim ukidanjem naloga.
            </p>
          </section>

          {/* ═══════════════ BLOK 4: ZAŠTITA PODATAKA ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">8. Zaštita podataka i privatnost</h2>
            <p>
              MyPhoto obrađuje lične podatke u skladu sa Opštom uredbom o zaštiti podataka
              (GDPR — Uredba EU 2016/679), Zakonom o zaštiti podataka o ličnosti Republike
              Srbije (ZZPL — &quot;Sl. glasnik RS&quot;, br. 87/2018) i važećim propisima SAD.
            </p>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">Pravni osnov obrade:</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Izvršenje ugovora</strong> (GDPR Član 6(1)(b)) — obrada neophodna za pružanje Servisa</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Saglasnost</strong> (GDPR Član 6(1)(a)) — za AI funkcije, face recognition i opcione analitike</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Legitimni interes</strong> (GDPR Član 6(1)(f)) — za sigurnost sistema i prevenciju zloupotrebe</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Zakonska obaveza</strong> (GDPR Član 6(1)(c)) — za poštovanje poreskih i računovodstvenih propisa</span>
              </li>
            </ul>
            <p className="mt-3">
              <strong>Lokacija podataka:</strong> Podaci se čuvaju na serverima u Evropskoj uniji.
              Transfer podataka van EU/EEA obavlja se isključivo uz odgovarajuće zaštitne mere
              (standardne ugovorne klauzule, odluke o adekvatnosti).
            </p>
            <p className="mt-2">
              Za detaljne informacije pogledajte našu{' '}
              <Link href="/privacy" className="text-primary-500 hover:underline">
                Politiku privatnosti
              </Link>.
              DPO kontakt: <strong>dpo@myphoto.my.id</strong>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">9. GDPR prava korisnika</h2>
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="font-semibold text-blue-800 dark:text-blue-400">
                Ako se nalazite u EU/EEA, imate sledeća prava po GDPR:
              </p>
              <ul className="mt-3 space-y-2 text-blue-700 dark:text-blue-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na pristup</strong> (Član 15) — zatražite kopiju svih vaših ličnih podataka</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na ispravku</strong> (Član 16) — ispravite netačne lične podatke</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na brisanje</strong> (Član 17) — &quot;pravo na zaborav&quot;, zatražite brisanje svih podataka</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na prenosivost</strong> (Član 20) — preuzmite podatke u mašinski čitljivom formatu</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na ograničenje obrade</strong> (Član 18) — privremeno ograničite kako koristimo vaše podatke</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na prigovor</strong> (Član 21) — prigovorite obradi zasnovanoj na legitimnom interesu</span>
                </li>
              </ul>
            </div>
            <p className="mt-3">
              Za ostvarivanje ovih prava, kontaktirajte nas na <strong>dpo@myphoto.my.id</strong>.
              Odgovorićemo u roku od 30 dana. Imate pravo na žalbu nadzornom organu za zaštitu
              podataka u vašoj zemlji.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">10. Srpski zakon — Zaštita podataka o ličnosti (ZZPL)</h2>
            <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
              <p className="font-semibold text-purple-800 dark:text-purple-400">
                Za korisnike iz Republike Srbije, dodatno se primenjuje:
              </p>
              <ul className="mt-3 space-y-2 text-purple-700 dark:text-purple-300">
                <li className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  <span><strong>ZZPL</strong> — Zakon o zaštiti podataka o ličnosti (&quot;Sl. glasnik RS&quot;, br. 87/2018), usklađen sa GDPR</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  <span><strong>Poverenik</strong> — Imate pravo na žalbu Povereniku za informacije od javnog značaja i zaštitu podataka o ličnosti</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  <span><strong>ZET</strong> — Zakon o elektronskoj trgovini (&quot;Sl. glasnik RS&quot;, br. 41/2009, 95/2013, 52/2019) reguliše elektronsko poslovanje</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  <span><strong>Zakon o zaštiti potrošača</strong> (&quot;Sl. glasnik RS&quot;, br. 88/2021) — pravo na odustanak od ugovora na daljinu u roku od 14 dana</span>
                </li>
              </ul>
            </div>
            <p className="mt-3">
              Prava predviđena srpskim zakonodavstvom primenjuju se kumulativno sa GDPR pravima.
              U slučaju razlike, primenjuje se odredba koja pruža viši nivo zaštite korisnika.
              Kontakt Poverenika: <strong>office@poverenik.rs</strong>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">11. Kolačići (Cookies)</h2>
            <p>
              MyPhoto koristi <strong>isključivo neophodne (esencijalne) kolačiće</strong> za
              funkcionisanje Servisa — autentifikaciju, sesije i bezbednosne tokene.
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Bez reklamnih (advertising) kolačića
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Bez praćenja korisnika (ad tracking) kolačića trećih strana
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Analitički kolačići samo uz vašu eksplicitnu saglasnost (opt-in)
              </li>
            </ul>
            <p className="mt-3">
              U skladu sa ePrivacy Direktivom (2002/58/EC) i GDPR, za sve kolačiće koji
              nisu strogo neophodni tražimo vašu prethodnu saglasnost putem cookie banner-a.
            </p>
          </section>

          {/* ═══════════════ BLOK 5: PLAĆANJE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">12. Plaćanje i pretplate</h2>
            <p>
              Plaćene pretplate se naplaćuju unapred za izabrani billing period (mesečno,
              kvartalno, polugodišnje ili godišnje). Pretplata se automatski obnavlja
              (auto-renewal) na kraju svakog perioda osim ako je ne otkažete.
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <strong>Otkazivanje:</strong> Možete otkazati pretplatu u bilo kom trenutku. Pristup plaćenim funkcijama ostaje aktivan do kraja plaćenog perioda.
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <strong>14-dnevni refund (EU):</strong> U skladu sa Direktivom o pravima potrošača (2011/83/EU) i srpskim Zakonom o zaštiti potrošača, imate pravo na odustanak i pun refund u roku od 14 dana od kupovine, bez navođenja razloga.
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <strong>Cene:</strong> Podložne promenama uz obaveštenje od najmanje 30 dana. Postojeće pretplate zadržavaju aktuelnu cenu do kraja perioda.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">13. Storage limiti</h2>
            <p>
              Svaki plan ima definisan limit prostora za čuvanje. Kada dostignete limit,
              nećete moći da uploadujete nove fajlove dok ne nadogradite plan ili oslobodite
              prostor brisanjem postojećih fajlova.
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Vaši postojeći fajlovi ostaju sigurni i dostupni bez obzira na status storage-a
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <strong>Fair use:</strong> Servis je namenjen čuvanju ličnih fotografija i videa. Korišćenje kao opšti file hosting nije dozvoljeno
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                U slučaju downgrade-a plana, nećete izgubiti postojeće fajlove, ali upload novih će biti onemogućen dok ne uskladite storage
              </li>
            </ul>
          </section>

          {/* ═══════════════ BLOK 6: ODGOVORNOST ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">14. Dostupnost servisa</h2>
            <p>
              Servis se pruža <strong>&quot;kakav jeste&quot; (as is)</strong> i <strong>&quot;kako je dostupan&quot;
              (as available)</strong>. Ulažemo razumne napore da obezbedimo visoku dostupnost, ali
              ne garantujemo neprekidan rad ili potpuno odsustvo grešaka.
            </p>
            <p className="mt-2">
              <strong>Force majeure:</strong> MyPhoto nije odgovoran za prekide uzrokovane
              okolnostima van naše razumne kontrole, uključujući ali ne ograničavajući se na:
              prirodne katastrofe, ratove, pandemije, ispade internet infrastrukture, odluke
              državnih organa ili napade na sajber bezbednost.
            </p>
            <p className="mt-2">
              Preporučujemo da redovno pravite lokalne kopije najvažnijih fajlova. Export
              funkcija je uvek dostupna za preuzimanje vaših podataka.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">15. Ograničenje odgovornosti</h2>
            <p>
              U maksimalnom obimu dozvoljenom zakonom:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
                <span>Ukupna odgovornost MyPhoto prema vama ograničena je na <strong>iznos koji ste platili u poslednjih 12 meseci</strong> za korišćenje Servisa</span>
              </li>
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
                <span>MyPhoto <strong>nije odgovoran za indirektnu, posledičnu, specijalnu ili kaznenu štetu</strong>, uključujući gubitak podataka, gubitak profita ili prekid poslovanja</span>
              </li>
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
                <span>Ova ograničenja se ne primenjuju u slučaju namere ili grubog nemara, kao ni u obimu u kojem ih zakon ne dozvoljava (npr. EU potrošačka zaštita)</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">16. Obeštećenje (Indemnification)</h2>
            <p>
              Saglasni ste da ćete obeštetiti, braniti i zaštititi MyPhoto, njegove vlasnike,
              zaposlene i partnere od svih potraživanja, gubitaka, troškova i odgovornosti
              (uključujući razumne advokatske troškove) koji proizlaze iz:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Vašeg kršenja ovih Uslova
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Sadržaja koji uploadujete na Platformu
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Kršenja prava trećih lica, uključujući intelektualnu svojinu
              </li>
            </ul>
            <p className="mt-3">
              Ova obaveza obeštećenja ne utiče na vaša zakonska prava kao potrošača u
              EU/Srbiji i neće se tumačiti na način koji ih ograničava.
            </p>
          </section>

          {/* ═══════════════ BLOK 7: PREKID I SPOROVI ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">17. Prekid korišćenja</h2>
            <p>
              <strong>Brisanje naloga od strane korisnika:</strong> Možete obrisati nalog u bilo kom
              trenutku putem podešavanja naloga. Po zahtevu za brisanje:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Vaš nalog će biti deaktiviran odmah
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Vaši podaci se čuvaju još <strong>30 dana</strong> za slučaj da se predomislite
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Nakon 30 dana, svi podaci se trajno brišu (uključujući backup-e u roku od 90 dana)
              </li>
            </ul>
            <p className="mt-3">
              <strong>Suspenzija/ukidanje od strane MyPhoto:</strong> Zadržavamo pravo da
              suspendujemo ili ukinemo nalog koji krši ove Uslove, uz prethodno obaveštenje
              od 7 dana kada je to moguće. Trenutna suspenzija bez obaveštenja moguća je
              samo u hitnim slučajevima (ilegalan sadržaj, sigurnosna pretnja).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">18. Merodavno pravo i rešavanje sporova</h2>
            <p>
              <strong>Primarno merodavno pravo:</strong> Ovi Uslovi se tumače u skladu sa
              zakonima Republike Srbije, bez primene kolizionih normi.
            </p>
            <ul className="mt-3 space-y-3">
              <li>
                <p className="font-semibold text-gray-900 dark:text-white">Za korisnike iz EU/EEA:</p>
                <p className="mt-1">
                  Primenjuje se zaštita potrošača po pravu vaše zemlje prebivališta u skladu sa
                  Uredbom Rim I (EC 593/2008, Član 6). Imate pravo da pokrenete postupak pred
                  sudom u vašoj zemlji. Pristup EU platformi za onlajn rešavanje sporova (ODR):
                  ec.europa.eu/consumers/odr
                </p>
              </li>
              <li>
                <p className="font-semibold text-gray-900 dark:text-white">Za korisnike iz SAD:</p>
                <p className="mt-1">
                  Sporovi se rešavaju obavezujućom arbitražom u skladu sa pravilima American
                  Arbitration Association (AAA). <strong>Izuzetak:</strong> sporovi koji spadaju u
                  nadležnost suda za male sporove (small claims court) mogu se voditi pred tim sudom.
                </p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  Odricanje od kolektivne tužbe (Class Action Waiver):
                </p>
                <p className="mt-1">
                  Saglasni ste da ćete sve sporove protiv MyPhoto rešavati isključivo individualno.
                  Odričete se prava na učešće u bilo kojoj kolektivnoj tužbi ili kolektivnoj arbitraži.
                </p>
              </li>
              <li>
                <p className="font-semibold text-gray-900 dark:text-white">Za korisnike iz Srbije:</p>
                <p className="mt-1">
                  Nadležan je sud u Beogradu, osim kada obavezujuće odredbe Zakona o zaštiti potrošača
                  predviđaju nadležnost suda prema prebivalištu potrošača.
                </p>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">19. Izmene uslova</h2>
            <p>
              Zadržavamo pravo da izmenimo ove Uslove. Obaveštavaćemo vas o svim izmenama
              na sledeći način:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <strong>Materijalne promene:</strong> Obaveštenje putem email-a najmanje 30 dana unapred
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <strong>Manje izmene:</strong> Obaveštenje putem notifikacije u aplikaciji
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <strong>Datum:</strong> Svaka verzija Uslova ima jasno naznačen datum poslednjeg ažuriranja
              </li>
            </ul>
            <p className="mt-3">
              Nastavak korišćenja Servisa nakon stupanja izmena na snagu predstavlja prihvatanje
              novih Uslova. Ako se ne slažete sa izmenama, možete obrisati nalog pre stupanja
              novih Uslova na snagu.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">20. Razdvojivost (Severability)</h2>
            <p>
              Ako se bilo koja odredba ovih Uslova proglasi nevažećom, nezakonitom ili
              neizvršivom od strane nadležnog suda, ta odredba će se tumačiti u najvećem
              dozvoljenom obimu, a preostale odredbe ostaju na snazi i u potpunosti
              primenjive. Nevažeća odredba ne utiče na validnost ostatka Uslova.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">21. Kontakt</h2>
            <p>
              Za sva pitanja vezana za ove Uslove korišćenja:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Opšta pitanja i pravna služba:</strong> <a href="mailto:legal@myphoto.my.id" className="text-primary-500 hover:underline">legal@myphoto.my.id</a></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Zaštita podataka (DPO):</strong> <a href="mailto:dpo@myphoto.my.id" className="text-primary-500 hover:underline">dpo@myphoto.my.id</a></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>DMCA prijave:</strong> <a href="mailto:legal@myphoto.my.id" className="text-primary-500 hover:underline">legal@myphoto.my.id</a> (Subject: DMCA Notice)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Kontakt forma:</strong>{' '}
                  <Link href="/contact" className="text-primary-500 hover:underline">
                    myphoto.my.id/contact
                  </Link>
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">Spremni da počnete?</h2>
          <p className="mx-auto mt-2 max-w-xl text-primary-100">
            10GB besplatno. Bez kreditne kartice. Bez obaveza.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-primary-600 transition-colors hover:bg-primary-50"
          >
            Započni besplatno
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto mt-16 border-t border-gray-200 px-4 py-8 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-6 w-6 text-primary-500" />
            <span className="font-semibold">MyPhoto</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} MyPhoto. Sva prava zadržana.
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-primary-500">Privatnost</Link>
            <Link href="/terms" className="hover:text-primary-500">Uslovi</Link>
            <Link href="/contact" className="hover:text-primary-500">Kontakt</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
