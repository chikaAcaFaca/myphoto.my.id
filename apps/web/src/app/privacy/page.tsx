import Link from 'next/link';
import { Cloud, ArrowLeft, Shield, Server, Lock, Check } from 'lucide-react';

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
              EU Serveri
            </div>
            <div className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              <Lock className="h-4 w-4" />
              GDPR Compliant
            </div>
          </div>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">Uvod</h2>
            <p>
              MyPhoto.my.id (&quot;MyPhoto&quot;, &quot;mi&quot;, &quot;naš&quot;) se obavezuje da štiti vašu
              privatnost. Ova politika opisuje kako prikupljamo, koristimo i štitimo vaše
              podatke kada koristite naš servis za čuvanje fotografija i videa.
            </p>
            <p className="mt-2">
              Naša osnovna filozofija je jednostavna: <strong>vaše slike su vaše i samo vaše</strong>.
              Ne koristimo ih za trening AI modela, ne skeniramo ih za reklame i ne delimo
              ih sa trećim stranama.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">Prikupljanje podataka</h2>
            <p className="mb-3">Prikupljamo samo podatke koji su neophodni za rad servisa:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Podaci o nalogu:</strong> email adresa, ime (opciono), profilna slika (opciono)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Fajlovi:</strong> slike i video koje uploadujete, zajedno sa EXIF metapodacima</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Podaci o korišćenju:</strong> informacije o upotrebi storage-a, deljenju i pristupanju fajlovima</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Podaci o plaćanju:</strong> obrađuju se putem sigurnog payment procesora — mi ne čuvamo podatke o karticama</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">Korišćenje podataka</h2>
            <p className="mb-3">Vaše podatke koristimo isključivo za:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Pružanje i poboljšanje našeg servisa
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                AI funkcije (samo ako ih vi aktivirate) — smart search, auto-tagging, face recognition
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Slanje obaveštenja o nalogu i plaćanju
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Tehničku podršku kada je zatražite
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">EU Serveri</h2>
            <p>
              Svi vaši podaci se čuvaju na serverima u <strong>Evropskoj Uniji (Frankfurt, Nemačka)</strong>.
              Koristimo enterprise-grade infrastrukturu sa enkripcijom podataka u mirovanju i
              u transportu. Vaši fajlovi se nikada ne prenose van EU bez vaše izričite saglasnosti.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">Deljenje podataka</h2>
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="font-semibold text-green-800 dark:text-green-400">
                Ne delimo vaše podatke sa trećim stranama.
              </p>
              <p className="mt-2 text-green-700 dark:text-green-300">
                Ne prodajemo podatke. Ne koristimo vaše slike za AI trening. Ne skeniramo
                sadržaj za reklamne potrebe. Vaši podaci se koriste isključivo za funkcije
                servisa koje vi koristite.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">Kolačići</h2>
            <p>
              Koristimo minimalan broj kolačića neophodnih za funkcionisanje servisa:
              autentifikaciju (sesija), korisničke preferencije (tema, jezik) i analitiku
              (anonimizovana). Ne koristimo kolačiće za reklamne ili tracking svrhe.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">GDPR prava</h2>
            <p className="mb-3">Kao korisnik u skladu sa GDPR regulativom imate pravo na:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                <span><strong>Pristup:</strong> pregled svih podataka koje čuvamo o vama</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                <span><strong>Ispravka:</strong> ažuriranje netačnih podataka</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                <span><strong>Brisanje:</strong> trajno brisanje svih vaših podataka</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                <span><strong>Prenosivost:</strong> export svih vaših fajlova u originalnom kvalitetu</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                <span><strong>Prigovor:</strong> prigovor na obradu podataka</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">Brisanje naloga</h2>
            <p>
              Možete obrisati svoj nalog u bilo kom trenutku iz podešavanja naloga. Po brisanju,
              svi vaši podaci (fajlovi, metapodaci, podaci o nalogu) biće trajno obrisani u
              roku od 30 dana. Export vaših fajlova je dostupan pre brisanja naloga.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">Kontakt</h2>
            <p>
              Za sva pitanja vezana za privatnost, kontaktirajte nas putem{' '}
              <Link href="/contact" className="text-primary-500 hover:underline">
                kontakt forme
              </Link>{' '}
              ili na email: <strong>privacy@myphoto.my.id</strong>
            </p>
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
