'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Cloud,
  ArrowLeft,
  HelpCircle,
  User,
  CreditCard,
  Upload,
  Share2,
  Brain,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const FAQ_CATEGORIES = [
  {
    name: 'Nalog',
    icon: <User className="h-5 w-5" />,
    questions: [
      {
        q: 'Kako da kreiram nalog?',
        a: 'Kliknite na "Započni besplatno" na početnoj stranici. Možete se registrovati putem Google naloga ili email adrese. Registracija traje oko 30 sekundi i dobijate 10GB besplatnog prostora.',
      },
      {
        q: 'Kako da promenim lozinku?',
        a: 'Idite na Podešavanja > Nalog > Promena lozinke. Ako ste se registrovali putem Google naloga, lozinka se menja preko Google-a.',
      },
      {
        q: 'Kako da obrišem nalog?',
        a: 'U Podešavanjima naloga možete zatražiti brisanje. Svi vaši podaci će biti trajno obrisani u roku od 30 dana. Pre brisanja, preporučujemo da exportujete svoje fajlove.',
      },
      {
        q: 'Da li mogu da koristim servis sa više uređaja?',
        a: 'Da! Pristupite MyPhoto-u sa bilo kog uređaja — telefon, tablet ili računar. Vaše slike su sinhronizovane i dostupne svuda.',
      },
    ],
  },
  {
    name: 'Plaćanje',
    icon: <CreditCard className="h-5 w-5" />,
    questions: [
      {
        q: 'Koji su dostupni planovi?',
        a: 'Nudimo besplatan plan (10GB) i plaćene planove od 150GB do 10TB. Svaki plan je dostupan u Standard i AI Powered verziji. Pogledajte stranicu sa cenama za detalje.',
      },
      {
        q: 'Mogu li da otkažem pretplatu?',
        a: 'Da, možete otkazati u bilo kom trenutku iz podešavanja naloga. Vaš plan ostaje aktivan do kraja plaćenog perioda.',
      },
      {
        q: 'Koji periodi plaćanja su dostupni?',
        a: 'Nudimo mesečno, kvartalno (2.5% popust), polugodišnje (5% popust) i godišnje plaćanje (2 meseca besplatno). Duži period — veći popust.',
      },
      {
        q: 'Koje metode plaćanja prihvatate?',
        a: 'Prihvatamo sve glavne kreditne i debitne kartice (Visa, Mastercard, American Express) putem sigurnog payment procesora.',
      },
    ],
  },
  {
    name: 'Upload i storage',
    icon: <Upload className="h-5 w-5" />,
    questions: [
      {
        q: 'Koji formati fajlova su podržani?',
        a: 'Podržavamo sve popularne formate: JPEG, PNG, WebP, HEIC, GIF, MP4, MOV i mnoge druge. RAW formati su takođe podržani.',
      },
      {
        q: 'Da li se kvalitet slika kompresuje?',
        a: 'Ne! Čuvamo vaše slike u originalnom kvalitetu, bez kompresije. Svaki piksel ostaje sačuvan tačno onako kako ste ga snimili.',
      },
      {
        q: 'Šta se dešava kad popunim storage?',
        a: 'Nećete moći da uploadujete nove fajlove. Vaši postojeći fajlovi ostaju sigurni. Možete nadograditi plan ili osloboditi prostor brisanjem fajlova.',
      },
      {
        q: 'Mogu li da exportujem sve svoje slike?',
        a: 'Da! Jednim klikom možete preuzeti sve svoje slike u originalnom kvalitetu. Vaši podaci su uvek vaši.',
      },
    ],
  },
  {
    name: 'Deljenje',
    icon: <Share2 className="h-5 w-5" />,
    questions: [
      {
        q: 'Kako da podelim sliku?',
        a: 'Otvorite sliku u galeriji, kliknite na ikonu za deljenje i kopirajte link. Možete ga poslati bilo kome — ne moraju da imaju nalog.',
      },
      {
        q: 'Šta je Family Sharing?',
        a: 'Family Sharing vam omogućava da dodate do 5 članova porodice koji dele zajednički storage. Svačije slike ostaju privatne — samo storage je zajednički.',
      },
      {
        q: 'Mogu li da kontrolišem ko vidi moje slike?',
        a: 'Da, imate potpunu kontrolu. Deljenje je isključeno po defaultu. Kada delite, možete u svakom trenutku deaktivirati link.',
      },
    ],
  },
  {
    name: 'AI funkcije',
    icon: <Brain className="h-5 w-5" />,
    questions: [
      {
        q: 'Šta je Smart Search?',
        a: 'Smart Search vam omogućava da pretražujete slike opisom — na primer "slike sa plaže" ili "zalazak sunca". AI analizira sadržaj vaših slika i pronalazi tačno ono što tražite.',
      },
      {
        q: 'Da li koristite moje slike za AI trening?',
        a: 'Ne, nikada. Vaše slike se koriste isključivo za AI funkcije koje vi aktivirate (pretraga, tagovanje, prepoznavanje lica). Ne delimo ih sa trećim stranama niti ih koristimo za trening modela.',
      },
      {
        q: 'Kako funkcioniše Face Recognition?',
        a: 'AI automatski detektuje i grupiše lica na vašim slikama. Možete im dodeliti imena i lako pronaći sve slike određene osobe. Ova funkcija radi samo na vašim slikama i podaci ne napuštaju EU servere.',
      },
    ],
  },
  {
    name: 'Privatnost i sigurnost',
    icon: <Shield className="h-5 w-5" />,
    questions: [
      {
        q: 'Gde se čuvaju moji podaci?',
        a: 'Vaši podaci se čuvaju na serverima u Evropskoj Uniji (Frankfurt, Nemačka), u skladu sa GDPR regulativom.',
      },
      {
        q: 'Da li ste GDPR compliant?',
        a: 'Da. U potpunosti poštujemo GDPR regulativu. Imate pravo na pristup, ispravku, brisanje i prenosivost vaših podataka.',
      },
      {
        q: 'Ko ima pristup mojim slikama?',
        a: 'Samo vi i korisnici sa kojima eksplicitno podelite slike. Naš tim nema pristup vašem sadržaju osim u slučaju tehničke podrške na vaš zahtev.',
      },
    ],
  },
];

export default function SupportPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

      {/* Hero */}
      <section className="container mx-auto px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
          <HelpCircle className="h-8 w-8 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="mb-2 text-4xl font-bold">Kako vam možemo pomoći?</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Pronađite odgovore na najčešća pitanja ili nas kontaktirajte direktno.
        </p>
      </section>

      {/* FAQ Sections */}
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-8">
          {FAQ_CATEGORIES.map((category) => (
            <div key={category.name}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  {category.icon}
                </div>
                <h2 className="text-xl font-bold">{category.name}</h2>
              </div>
              <div className="space-y-2">
                {category.questions.map((item) => {
                  const key = `${category.name}-${item.q}`;
                  const isOpen = openItems[key];
                  return (
                    <div
                      key={key}
                      className="rounded-lg bg-white shadow-sm dark:bg-gray-800"
                    >
                      <button
                        onClick={() => toggleItem(key)}
                        className="flex w-full items-center justify-between px-5 py-4 text-left"
                      >
                        <span className="font-medium">{item.q}</span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="border-t border-gray-100 px-5 pb-4 pt-3 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-300">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">Niste pronašli odgovor?</h2>
          <p className="mx-auto mt-2 max-w-xl text-primary-100">
            Naš tim za podršku je tu da vam pomogne. Javite nam se i odgovorićemo u roku od 24h.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-primary-600 transition-colors hover:bg-primary-50"
          >
            Kontaktirajte nas
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
