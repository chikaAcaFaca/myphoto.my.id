import Link from 'next/link';
import { Cloud, ArrowLeft, FileText, Check } from 'lucide-react';

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
        </div>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">1. Uvod</h2>
            <p>
              Dobrodošli na MyPhoto.my.id. Korišćenjem našeg servisa prihvatate ove uslove
              korišćenja. Molimo vas da ih pažljivo pročitate pre korišćenja platforme.
              Ako se ne slažete sa bilo kojim delom ovih uslova, ne koristite naš servis.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">2. Opis usluge</h2>
            <p>
              MyPhoto.my.id je cloud storage servis za čuvanje, organizovanje i deljenje
              fotografija i video zapisa. Nudimo besplatni plan sa 10GB prostora, kao i
              plaćene planove sa dodatnim prostorom i AI funkcijama.
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Čuvanje fotografija i videa u originalnom kvalitetu
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                AI funkcije: smart search, auto-tagging, face recognition
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Deljenje slika i albuma sa drugim korisnicima
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Family sharing sa do 5 članova porodice
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">3. Nalog</h2>
            <p>
              Za korišćenje servisa potreban vam je nalog. Registracija je moguća putem
              Google naloga ili email adrese. Vi ste odgovorni za sigurnost svog naloga i
              lozinke. Obavezujete se da ćete nas odmah obavestiti o bilo kakvom neovlašćenom
              pristupu vašem nalogu.
            </p>
            <p className="mt-2">
              Morate imati najmanje 16 godina za kreiranje naloga. Korišćenjem servisa
              potvrđujete da ispunjavate ovaj uslov.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">4. Dozvoljeno korišćenje</h2>
            <p className="mb-3">Korišćenjem servisa se obavezujete da nećete:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Uploadovati nelegalan sadržaj ili sadržaj koji krši autorska prava drugih
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Koristiti servis za distribuciju malvera ili štetnog softvera
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Pokušavati neovlašćen pristup drugim nalozima ili infrastrukturi
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                Koristiti servis za masovni spam ili automatizovano korišćenje bez dozvole
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">5. Vlasništvo nad sadržajem</h2>
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="font-semibold text-green-800 dark:text-green-400">
                Vi zadržavate sva prava nad sadržajem koji uploadujete.
              </p>
              <p className="mt-2 text-green-700 dark:text-green-300">
                MyPhoto ne polaže nikakva vlasnička prava nad vašim fajlovima. Ne koristimo
                vaš sadržaj za trening AI modela niti za bilo koje druge svrhe osim pružanja
                servisa koji ste zatražili.
              </p>
            </div>
            <p className="mt-3">
              Uploadovanjem sadržaja nam dajete ograničenu licencu za čuvanje, obradu
              (thumbnail generisanje, AI tagovanje ako je aktivirano) i prikaz sadržaja
              vama i korisnicima sa kojima ga delite.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">6. Storage limiti</h2>
            <p>
              Svaki plan ima definisan limit prostora za čuvanje. Kada dostignete limit,
              nećete moći da uploadujete nove fajlove dok ne nadogradite plan ili oslobodite
              prostor brisanjem postojećih fajlova. Vaši postojeći fajlovi ostaju sigurni
              i dostupni bez obzira na status storage-a.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">7. Plaćanje i pretplata</h2>
            <p>
              Plaćene pretplate se naplaćuju unapred za izabrani period (mesečno, kvartalno,
              polugodišnje ili godišnje). Možete otkazati pretplatu u bilo kom trenutku —
              pristup plaćenim funkcijama ostaje aktivan do kraja plaćenog perioda.
            </p>
            <p className="mt-2">
              Cene su podložne promenama uz prethodno obaveštenje od najmanje 30 dana.
              Postojeće pretplate zadržavaju aktuelnu cenu do kraja perioda.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">8. Privatnost</h2>
            <p>
              Vaša privatnost nam je izuzetno važna. Za detalje o tome kako prikupljamo,
              koristimo i štitimo vaše podatke, pogledajte našu{' '}
              <Link href="/privacy" className="text-primary-500 hover:underline">
                Politiku privatnosti
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">9. Ograničenje odgovornosti</h2>
            <p>
              MyPhoto.my.id se pruža &quot;kakav jeste&quot;. Iako ulažemo maksimalne napore u
              pouzdanost i sigurnost servisa, ne garantujemo neprekidan rad ili potpuno odsustvo
              grešaka. Nismo odgovorni za indirektne štete nastale korišćenjem servisa.
            </p>
            <p className="mt-2">
              Preporučujemo da redovno pravite lokalne kopije najvažnijih fajlova. Export
              funkcija je uvek dostupna za preuzimanje vaših podataka.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">10. Prekid korišćenja</h2>
            <p>
              Možete prestati da koristite servis i obrisati nalog u bilo kom trenutku.
              Mi zadržavamo pravo da suspendujemo ili ukinemo nalog koji krši ove uslove
              korišćenja, uz prethodno obaveštenje kada je to moguće.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">11. Izmene uslova</h2>
            <p>
              Zadržavamo pravo da izmenimo ove uslove korišćenja. O značajnim promenama
              ćemo vas obavestiti putem emaila ili obaveštenja u aplikaciji najmanje 30 dana
              unapred. Nastavak korišćenja servisa nakon izmena predstavlja prihvatanje novih uslova.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">Kontakt</h2>
            <p>
              Za sva pitanja vezana za uslove korišćenja, kontaktirajte nas putem{' '}
              <Link href="/contact" className="text-primary-500 hover:underline">
                kontakt forme
              </Link>{' '}
              ili na email: <strong>legal@myphoto.my.id</strong>
            </p>
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
