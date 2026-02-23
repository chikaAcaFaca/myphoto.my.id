import Link from 'next/link';
import { Cloud, ArrowLeft, Shield, Server, Lock, Check, Scale } from 'lucide-react';

export default function PrivacyPage() {
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">Politika privatnosti</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Poslednje ažuriranje: {new Date().toLocaleDateString('sr-Latn-RS', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Scale className="h-4 w-4" />
            <span>GDPR (EU 2016/679) | ZZPL (Srbija) | CCPA/COPPA (SAD)</span>
          </div>
        </div>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">
          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <Shield className="h-4 w-4" />
              Ne koristimo slike za AI trening
            </div>
            <div className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              <Server className="h-4 w-4" />
              EU Serveri (Frankfurt)
            </div>
            <div className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              <Lock className="h-4 w-4" />
              GDPR &amp; ZZPL Compliant
            </div>
          </div>

          {/* ═══════════════ BLOK 1: OSNOVE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">1. Uvod</h2>
            <p>
              MyPhoto.my.id (&quot;MyPhoto&quot;, &quot;mi&quot;, &quot;nas&quot;, &quot;naš&quot;) se obavezuje da štiti vašu
              privatnost. Ova Politika privatnosti (&quot;Politika&quot;) opisuje kako prikupljamo,
              koristimo, čuvamo i štitimo vaše podatke kada koristite naš servis za čuvanje
              fotografija i videa.
            </p>
            <p className="mt-2">
              Ova Politika se primenjuje u skladu sa Opštom uredbom o zaštiti podataka (GDPR —
              Uredba EU 2016/679), Zakonom o zaštiti podataka o ličnosti Republike Srbije
              (ZZPL — &quot;Sl. glasnik RS&quot;, br. 87/2018), California Consumer Privacy Act (CCPA)
              i Children&apos;s Online Privacy Protection Act (COPPA).
            </p>
            <div className="mt-3 rounded-xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="font-semibold text-green-800 dark:text-green-400">
                Naša osnovna filozofija: vaše slike su vaše i samo vaše.
              </p>
              <p className="mt-2 text-green-700 dark:text-green-300">
                Ne koristimo vaše fotografije za trening AI modela. Ne skeniramo sadržaj za
                reklame. Ne prodajemo vaše podatke. Ne delimo ih sa trećim stranama osim
                kada je to neophodno za pružanje Servisa.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">2. Definicije</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>&quot;Lični podaci&quot;</strong> — svaka informacija koja se odnosi na identifikovano ili identifikabilno fizičko lice (GDPR Član 4(1), ZZPL Član 4)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>&quot;Posebne kategorije podataka&quot;</strong> — biometrijski podaci (face recognition), podaci iz fotografija koji mogu otkriti rasno/etničko poreklo, zdravstveno stanje itd. (GDPR Član 9)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>&quot;Rukovalac&quot; (Controller)</strong> — MyPhoto.my.id, koji određuje svrhe i sredstva obrade ličnih podataka</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>&quot;Obrađivač&quot; (Processor)</strong> — treće strane koje obrađuju podatke u naše ime (cloud provajderi, payment procesori)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>&quot;Obrada&quot;</strong> — svaka radnja izvršena nad ličnim podacima (prikupljanje, čuvanje, brisanje, prenos)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>&quot;DPO&quot;</strong> — Data Protection Officer / Lice za zaštitu podataka o ličnosti</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">3. Kontrolor podataka</h2>
            <p>
              Rukovalac (kontrolor) vaših ličnih podataka u smislu GDPR Člana 4(7) i ZZPL Člana 4 je:
            </p>
            <div className="mt-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p><strong>MyPhoto.my.id</strong></p>
              <p className="mt-1">Email: <a href="mailto:legal@myphoto.my.id" className="text-primary-500 hover:underline">legal@myphoto.my.id</a></p>
              <p>DPO: <a href="mailto:dpo@myphoto.my.id" className="text-primary-500 hover:underline">dpo@myphoto.my.id</a></p>
            </div>
            <p className="mt-3">
              Za sva pitanja vezana za obradu vaših ličnih podataka, možete kontaktirati
              našeg DPO-a na gore navedenu adresu.
            </p>
          </section>

          {/* ═══════════════ BLOK 2: PRIKUPLJANJE PODATAKA ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">4. Koje podatke prikupljamo</h2>
            <p className="mb-3">Prikupljamo samo podatke koji su neophodni za rad Servisa:</p>

            <p className="mt-3 font-semibold text-gray-900 dark:text-white">a) Podaci o nalogu</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>Email adresa (obavezno — za autentifikaciju i komunikaciju)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>Ime i prezime (opciono)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>Profilna slika (opciono)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>Lozinka (hashirana, bcrypt — nikada ne čuvamo u plain text-u)</span>
              </li>
            </ul>

            <p className="mt-4 font-semibold text-gray-900 dark:text-white">b) Korisnički sadržaj</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>Fotografije i video zapisi koje uploadujete</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>EXIF metapodaci (datum, lokacija, kamera — ako su prisutni u fajlu)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>Albumi, tagovi i organizacione strukture koje kreirate</span>
              </li>
            </ul>

            <p className="mt-4 font-semibold text-gray-900 dark:text-white">c) Tehnički podaci</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>IP adresa (za sigurnost i sprečavanje zloupotrebe)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>Tip browser-a i operativnog sistema</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>Informacije o upotrebi storage-a i pristupanju fajlovima</span>
              </li>
            </ul>

            <p className="mt-4 font-semibold text-gray-900 dark:text-white">d) Podaci o plaćanju</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>Obrađuju se putem sigurnog payment procesora (Paddle) — <strong>mi ne čuvamo podatke o karticama</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>Čuvamo samo: ID transakcije, iznos, datum i status pretplate</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">5. Kako prikupljamo podatke</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Direktno od vas:</strong> prilikom registracije, upload-a fajlova, kontaktiranja podrške, podešavanja naloga</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Automatski:</strong> tehničke podatke (IP, browser, kolačići) prikupljamo automatski prilikom korišćenja Servisa</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Od trećih strana:</strong> ako se prijavite putem Google OAuth-a, dobijamo vašu email adresu i ime iz Google naloga</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">6. Pravni osnov obrade (GDPR Član 6)</h2>
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="mb-3 font-semibold text-blue-800 dark:text-blue-400">
                Svaku obradu ličnih podataka zasnivamo na jednom od sledećih pravnih osnova:
              </p>
              <ul className="space-y-2 text-blue-700 dark:text-blue-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Izvršenje ugovora</strong> (Član 6(1)(b)) — obrada neophodna za pružanje Servisa (čuvanje fajlova, generisanje thumbnail-ova, deljenje)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Saglasnost</strong> (Član 6(1)(a)) — za AI funkcije (smart search, auto-tagging), face recognition (Član 9(2)(a) za biometrijske podatke), analitičke kolačiće</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Legitimni interes</strong> (Član 6(1)(f)) — sigurnost sistema, prevencija zloupotrebe, sprečavanje prevara, poboljšanje Servisa</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Zakonska obaveza</strong> (Član 6(1)(c)) — poštovanje poreskih, računovodstvenih i regulatornih propisa</span>
                </li>
              </ul>
            </div>
            <p className="mt-3">
              Saglasnost možete povući u bilo kom trenutku putem podešavanja naloga ili
              kontaktiranjem DPO-a. Povlačenje saglasnosti ne utiče na zakonitost obrade
              izvršene pre povlačenja (GDPR Član 7(3)).
            </p>
          </section>

          {/* ═══════════════ BLOK 3: KORIŠĆENJE I DELJENJE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">7. Svrhe obrade podataka</h2>
            <p className="mb-3">Vaše podatke koristimo isključivo za sledeće svrhe:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Pružanje Servisa — čuvanje, organizovanje i deljenje vaših fotografija i videa
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                AI funkcije — smart search, auto-tagging, face recognition (samo ako ih vi eksplicitno aktivirate)
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Generisanje thumbnail-ova i optimizovanih verzija za brži prikaz
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Obaveštenja o nalogu, plaćanju i sigurnosnim događajima
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Tehnička podrška kada je zatražite
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Sigurnost — detekcija zloupotrebe, sprečavanje neovlašćenog pristupa
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Poštovanje zakonskih obaveza (poreskih, regulatornih)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">8. AI funkcije i obrada slika</h2>
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="font-semibold text-green-800 dark:text-green-400">
                Vaše fotografije se nikada ne koriste za trening AI modela.
              </p>
              <p className="mt-2 text-green-700 dark:text-green-300">
                AI funkcije obrađuju vaše slike isključivo za funkcionalnosti Servisa koje ste
                vi aktivirali (pretraga, tagovanje, prepoznavanje lica). Rezultati obrade se čuvaju
                samo u vašem nalogu i nisu dostupni nikome drugom.
              </p>
            </div>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Smart search i auto-tagging:</strong> opt-in funkcije — aktiviraju se samo na vaš zahtev (GDPR osnov: saglasnost)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Face recognition:</strong> zahteva eksplicitnu saglasnost za obradu biometrijskih podataka (GDPR Član 9(2)(a)). Možete obrisati sve face podatke u bilo kom trenutku</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Bez prodaje ili deljenja:</strong> AI-generisani tagovi i metapodaci nikada se ne dele sa trećim stranama</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">9. Deljenje podataka sa trećim stranama</h2>
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="font-semibold text-green-800 dark:text-green-400">
                Ne prodajemo vaše podatke. Ne delimo ih za reklamne svrhe.
              </p>
            </div>
            <p className="mt-3">
              Vaše podatke delimo isključivo sa sledećim kategorijama primalaca, uz odgovarajuće
              ugovorne zaštite (GDPR Član 28 — ugovor o obradi podataka):
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Cloud infrastruktura:</strong> za čuvanje fajlova na EU serverima (Frankfurt, Nemačka)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Payment procesor (Paddle):</strong> za obradu plaćanja — primaju samo podatke neophodne za transakciju</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Email servis:</strong> za slanje transakcijskih email-ova (potvrde, obaveštenja)</span>
              </li>
            </ul>
            <p className="mt-3">
              Takođe možemo otkriti podatke ako to zahteva zakon, sudski nalog ili ako je
              neophodno za zaštitu naših prava, bezbednosti korisnika ili javnosti.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">10. Međunarodni transfer podataka</h2>
            <p>
              Svi korisnički fajlovi i primarni podaci se čuvaju na serverima u
              <strong> Evropskoj Uniji (Frankfurt, Nemačka)</strong>.
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Server className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>Vaši fajlovi se <strong>nikada ne prenose van EU</strong> bez vaše izričite saglasnosti</span>
              </li>
              <li className="flex items-start gap-2">
                <Server className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>Kada je transfer van EU/EEA neophodan (npr. payment procesor), koristimo <strong>standardne ugovorne klauzule</strong> (SCC) odobrene od strane Evropske komisije (GDPR Član 46(2)(c))</span>
              </li>
              <li className="flex items-start gap-2">
                <Server className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>Za transfer u zemlje sa odlukom o adekvatnosti (GDPR Član 45), oslanjamo se na tu odluku</span>
              </li>
            </ul>
            <p className="mt-3">
              U skladu sa ZZPL Članom 65, transfer podataka iz Srbije podleže istim zaštitnim
              merama, uključujući odluke Poverenika o adekvatnosti zaštite.
            </p>
          </section>

          {/* ═══════════════ BLOK 4: ZAŠTITA I ČUVANJE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">11. Sigurnost podataka</h2>
            <p>
              Primenjujemo tehničke i organizacione mere zaštite u skladu sa GDPR Članom 32
              i ZZPL Članom 50:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Lock className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Enkripcija u tranzitu:</strong> TLS 1.3 za sve komunikacije</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Enkripcija u mirovanju:</strong> AES-256 za sve fajlove na serverima</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Kontrola pristupa:</strong> princip minimalnog pristupa (least privilege) za sve zaposlene</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Lozinke:</strong> bcrypt hashiranje, nikada se ne čuvaju u plain text-u</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Incident response:</strong> obaveštavamo korisnike i nadzorne organe o sigurnosnim incidentima u roku od 72 sata (GDPR Član 33)</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">12. Čuvanje podataka (Retention)</h2>
            <p>
              Podatke čuvamo samo onoliko dugo koliko je neophodno za svrhu za koju su
              prikupljeni (GDPR Član 5(1)(e), ZZPL Član 5):
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Podaci o nalogu:</strong> dok nalog postoji + 30 dana grace period nakon brisanja</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Korisnički fajlovi:</strong> dok nalog postoji. Trajno brisanje u roku od 30 dana od brisanja naloga (backup-i u roku od 90 dana)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Tehnički logovi:</strong> IP adrese i access logovi se čuvaju 90 dana za sigurnosne svrhe</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Podaci o plaćanju:</strong> u skladu sa poreskim zakonodavstvom — do 10 godina za računovodstvene svrhe</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>AI-generisani podaci:</strong> tagovi i face recognition podaci se brišu odmah po deaktivaciji funkcije ili brisanju naloga</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">13. Kolačići i slične tehnologije</h2>
            <p>
              MyPhoto koristi <strong>isključivo neophodne (esencijalne) kolačiće</strong> za
              funkcionisanje Servisa:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Sesijski kolačići:</strong> za autentifikaciju i održavanje prijave (strogo neophodni)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>CSRF tokeni:</strong> za zaštitu od cross-site request forgery napada (strogo neophodni)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Korisničke preferencije:</strong> tema (svetla/tamna), jezik (strogo neophodni)</span>
              </li>
            </ul>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">Šta NE koristimo:</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Reklamne (advertising) kolačiće
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Kolačiće za praćenje korisnika (ad tracking) trećih strana
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Social media tracking piksele
              </li>
            </ul>
            <p className="mt-3">
              Analitički kolačići se aktiviraju samo uz vašu eksplicitnu saglasnost (opt-in),
              u skladu sa ePrivacy Direktivom (2002/58/EC) i GDPR.
            </p>
          </section>

          {/* ═══════════════ BLOK 5: PRAVA KORISNIKA ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">14. GDPR prava korisnika</h2>
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="mb-3 font-semibold text-blue-800 dark:text-blue-400">
                Ako se nalazite u EU/EEA, imate sledeća prava po GDPR:
              </p>
              <ul className="space-y-2 text-blue-700 dark:text-blue-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na pristup</strong> (Član 15) — zatražite kopiju svih ličnih podataka koje čuvamo o vama</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na ispravku</strong> (Član 16) — ispravite netačne ili nepotpune lične podatke</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na brisanje</strong> (Član 17) — &quot;pravo na zaborav&quot;, zatražite trajno brisanje svih podataka</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na prenosivost</strong> (Član 20) — preuzmite sve podatke u mašinski čitljivom formatu (JSON, ZIP sa originalnim fajlovima)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na ograničenje obrade</strong> (Član 18) — privremeno ograničite kako koristimo vaše podatke</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na prigovor</strong> (Član 21) — prigovorite obradi zasnovanoj na legitimnom interesu</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Pravo na povlačenje saglasnosti</strong> (Član 7(3)) — povucite prethodno datu saglasnost u bilo kom trenutku</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span><strong>Automatizovano odlučivanje</strong> (Član 22) — ne donosimo odluke zasnovane isključivo na automatizovanoj obradi koje bi imale pravne posledice po vas</span>
                </li>
              </ul>
            </div>
            <p className="mt-3">
              Imate pravo na žalbu nadzornom organu za zaštitu podataka u vašoj zemlji
              prebivališta, radu ili mestu navodnog kršenja (GDPR Član 77).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">15. Srpski zakon — ZZPL</h2>
            <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
              <p className="mb-3 font-semibold text-purple-800 dark:text-purple-400">
                Za korisnike iz Republike Srbije, dodatno se primenjuje:
              </p>
              <ul className="space-y-2 text-purple-700 dark:text-purple-300">
                <li className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  <span><strong>ZZPL</strong> — Zakon o zaštiti podataka o ličnosti (&quot;Sl. glasnik RS&quot;, br. 87/2018), usklađen sa GDPR. Sva GDPR prava navedena u sekciji 14 važe i po srpskom pravu</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  <span><strong>Poverenik</strong> — Imate pravo na žalbu Povereniku za informacije od javnog značaja i zaštitu podataka o ličnosti (ZZPL Član 82)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  <span><strong>Sudska zaštita</strong> — Pravo na tužbu pred nadležnim sudom za zaštitu prava po ZZPL (Član 84)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  <span><strong>Naknada štete</strong> — Pravo na naknadu materijalne i nematerijalne štete usled nezakonite obrade (ZZPL Član 86)</span>
                </li>
              </ul>
            </div>
            <p className="mt-3">
              Kontakt Poverenika: <strong>office@poverenik.rs</strong> |
              Web: <strong>poverenik.rs</strong>
            </p>
            <p className="mt-2">
              U slučaju razlike između GDPR i ZZPL, primenjuje se odredba koja pruža
              viši nivo zaštite korisnika.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">16. Prava korisnika u SAD (CCPA / COPPA)</h2>
            <p className="font-semibold text-gray-900 dark:text-white">California Consumer Privacy Act (CCPA):</p>
            <p className="mt-1">
              Ako ste rezident Kalifornije, imate sledeća dodatna prava:
            </p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Pravo da znate:</strong> koje lične podatke prikupljamo, koristimo i delimo</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Pravo na brisanje:</strong> zatražite brisanje ličnih podataka</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Pravo na opt-out od prodaje:</strong> MyPhoto <strong>ne prodaje</strong> vaše lične podatke — ovo pravo je automatski ispunjeno</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Pravo na nediskriminaciju:</strong> nećemo vas diskriminisati zbog ostvarivanja vaših prava</span>
              </li>
            </ul>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">Children&apos;s Online Privacy Protection Act (COPPA):</p>
            <p className="mt-1">
              MyPhoto ne prikuplja svesno lične podatke dece mlađe od 13 godina. Naš
              Servis zahteva minimum <strong>16 godina</strong>. Ako saznamo da smo prikupili
              podatke deteta mlađeg od 13 godina, odmah ćemo ih obrisati.
              Ako ste roditelj i verujete da je vaše dete otvorilo nalog,
              kontaktirajte nas na <strong>dpo@myphoto.my.id</strong>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">17. Ostvarivanje prava</h2>
            <p>Za ostvarivanje bilo kog prava iz sekcija 14–16:</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Kako:</strong> pošaljite zahtev na <a href="mailto:dpo@myphoto.my.id" className="text-primary-500 hover:underline">dpo@myphoto.my.id</a> ili koristite opciju u podešavanjima naloga</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Rok odgovora:</strong> u roku od <strong>30 dana</strong> (može se produžiti za dodatnih 60 dana za složene zahteve, uz obaveštenje)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Verifikacija identiteta:</strong> možemo zatražiti potvrdu identiteta pre obrade zahteva, radi zaštite vaših podataka</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Besplatno:</strong> ostvarivanje prava je besplatno. Za očigledno neosnovane ili preterane zahteve, možemo naplatiti razumnu naknadu (GDPR Član 12(5))</span>
              </li>
            </ul>
          </section>

          {/* ═══════════════ BLOK 6: POSEBNE SITUACIJE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">18. Deca i maloletnici</h2>
            <p>
              MyPhoto zahteva minimalni uzrast od <strong>16 godina</strong> za kreiranje naloga,
              u skladu sa:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
                <span><strong>GDPR Član 8:</strong> saglasnost za usluge informacionog društva — minimalno 16 godina (ili manje po pravu države članice, ali ne manje od 13)</span>
              </li>
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
                <span><strong>COPPA:</strong> zabranjuje prikupljanje podataka dece mlađe od 13 godina bez verifikovanog roditeljskog pristanka</span>
              </li>
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
                <span><strong>ZZPL Član 16:</strong> obrada podataka maloletnih lica u Srbiji</span>
              </li>
            </ul>
            <p className="mt-3">
              Ne prikupljamo svesno podatke lica mlađih od 16 godina. Ako otkrijemo takav
              nalog, deaktivaćemo ga i obrisati sve povezane podatke.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">19. Brisanje naloga i podataka</h2>
            <p>
              Možete obrisati svoj nalog u bilo kom trenutku iz podešavanja naloga.
              Procedura brisanja:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Odmah:</strong> nalog se deaktivira, prestaje pristup Servisu</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>30 dana:</strong> grace period — možete se predomisliti i reaktivirati nalog</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>30–90 dana:</strong> trajno brisanje svih podataka, uključujući backup-e</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Izuzeci:</strong> podaci koje smo zakonski obavezni da čuvamo (poreski zapisi) čuvaju se u zakonski propisanom roku</span>
              </li>
            </ul>
            <p className="mt-3">
              <strong>Pre brisanja</strong> preporučujemo da iskoristite Export funkciju za
              preuzimanje svih vaših fajlova u originalnom kvalitetu (GDPR pravo na prenosivost).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">20. Izmene Politike privatnosti</h2>
            <p>
              Zadržavamo pravo da izmenimo ovu Politiku. O izmenama vas obaveštavamo:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Materijalne promene:</strong> obaveštenje putem email-a najmanje <strong>30 dana</strong> unapred</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Manje izmene:</strong> obaveštenje putem notifikacije u aplikaciji</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>Datum:</strong> svaka verzija ima jasno naznačen datum poslednjeg ažuriranja</span>
              </li>
            </ul>
            <p className="mt-3">
              Nastavak korišćenja Servisa nakon stupanja izmena na snagu predstavlja
              prihvatanje nove Politike. Za materijalne promene koje menjaju pravni osnov
              obrade, tražićemo vašu ponovnu saglasnost.
            </p>
          </section>

          {/* ═══════════════ BLOK 7: KONTAKT ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">21. Kontakt i DPO</h2>
            <p>
              Za sva pitanja vezana za privatnost i zaštitu podataka:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Zaštita podataka (DPO):</strong> <a href="mailto:dpo@myphoto.my.id" className="text-primary-500 hover:underline">dpo@myphoto.my.id</a></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Opšta pitanja o privatnosti:</strong> <a href="mailto:privacy@myphoto.my.id" className="text-primary-500 hover:underline">privacy@myphoto.my.id</a></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Pravna služba:</strong> <a href="mailto:legal@myphoto.my.id" className="text-primary-500 hover:underline">legal@myphoto.my.id</a></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Kontakt forma:</strong>{' '}
                  <Link href="/contact" className="text-primary-500 hover:underline">
                    myphoto.my.id/contact
                  </Link>
                </span>
              </li>
            </ul>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">Nadzorni organi:</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                <span><strong>Srbija:</strong> Poverenik za informacije od javnog značaja i zaštitu podataka o ličnosti — <strong>office@poverenik.rs</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                <span><strong>EU:</strong> nadzorni organ u vašoj zemlji prebivališta (lista na edpb.europa.eu)</span>
              </li>
            </ul>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">Vaša privatnost je naš prioritet</h2>
          <p className="mx-auto mt-2 max-w-xl text-primary-100">
            Započnite besplatno sa 10GB — bez kreditne kartice, bez kompromisa.
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
