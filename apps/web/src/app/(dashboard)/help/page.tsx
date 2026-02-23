'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Upload,
  FolderOpen,
  Share2,
  Search,
  Shield,
  Smartphone,
  CreditCard,
  ChevronDown,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

const categories = [
  {
    id: 'upload',
    name: 'Upload i skladištenje',
    icon: Upload,
    faqs: [
      {
        question: 'Koliko prostora imam besplatno?',
        answer: 'Svaki nalog dolazi sa 10GB besplatnog prostora. Slike i video se čuvaju u originalnom kvalitetu bez kompresije.',
      },
      {
        question: 'Koji formati su podržani?',
        answer: 'Podržavamo JPEG, PNG, WebP, HEIC, GIF, SVG za slike i MP4, MOV, WebM, AVI, MKV za video.',
      },
      {
        question: 'Da li se slike kompresuju?',
        answer: 'Ne. Vaše slike se čuvaju u punom originalnom kvalitetu, uključujući EXIF metapodatke.',
      },
    ],
  },
  {
    id: 'albums',
    name: 'Albumi i organizacija',
    icon: FolderOpen,
    faqs: [
      {
        question: 'Kako da kreiram album?',
        answer: 'Kliknite na "Albums" u navigaciji, zatim na dugme "Kreiraj album". Možete izabrati slike prilikom kreiranja ili dodati kasnije.',
      },
      {
        question: 'Da li slika može biti u više albuma?',
        answer: 'Da. Ista slika može pripadati neograničenom broju albuma bez dupliranja prostora.',
      },
    ],
  },
  {
    id: 'sharing',
    name: 'Deljenje',
    icon: Share2,
    faqs: [
      {
        question: 'Kako da podelim sliku?',
        answer: 'Otvorite sliku, kliknite na ikonu deljenja. Dobićete link koji možete poslati bilo kome — primaocu ne treba nalog.',
      },
      {
        question: 'Kako da podelim album?',
        answer: 'U detalju albuma kliknite dugme "Podeli". Generisaće se link za pregled celog albuma.',
      },
      {
        question: 'Da li mogu da uklonim deljenje?',
        answer: 'Da. U svakom trenutku možete deaktivirati link za deljenje i on više neće raditi.',
      },
    ],
  },
  {
    id: 'search',
    name: 'Pretraga i AI',
    icon: Search,
    faqs: [
      {
        question: 'Kako radi Smart Search?',
        answer: 'AI analizira sadržaj vaših slika i omogućava pretragu prirodnim jezikom — npr. "plaža", "pas", "zalazak sunca".',
      },
      {
        question: 'Da li se AI koristi za treniranje modela?',
        answer: 'Ne. Vaše slike se nikada ne koriste za trening AI modela. AI se koristi isključivo za vaše pretraživanje.',
      },
    ],
  },
  {
    id: 'privacy',
    name: 'Privatnost i sigurnost',
    icon: Shield,
    faqs: [
      {
        question: 'Gde se čuvaju moji podaci?',
        answer: 'Svi podaci se čuvaju na EU serverima (Frankfurt). GDPR kompatibilni smo sa punom enkripcijom u transportu i skladištu.',
      },
      {
        question: 'Da li MyPhoto skenira moje slike?',
        answer: 'Slike se ne skeniraju za reklame niti dele sa trećim stranama. AI analiza je opciona i služi samo za vašu pretragu.',
      },
    ],
  },
  {
    id: 'mobile',
    name: 'Mobilna aplikacija',
    icon: Smartphone,
    faqs: [
      {
        question: 'Da li postoji mobilna aplikacija?',
        answer: 'Da. Možete instalirati MyPhoto kao PWA (Progressive Web App) direktno iz pretraživača. Takođe radimo na nativnoj Android/iOS aplikaciji.',
      },
      {
        question: 'Kako radi auto-sync?',
        answer: 'Kada instalirate PWA ili nativnu aplikaciju, slike se automatski uploaduju u pozadini prema vašim podešavanjima (WiFi only, WiFi + mobile, ili ručno).',
      },
    ],
  },
  {
    id: 'billing',
    name: 'Plaćanje i planovi',
    icon: CreditCard,
    faqs: [
      {
        question: 'Koje planove nudite?',
        answer: 'Nudimo besplatan plan (10GB), Plus plan sa AI (250GB od $4.49/mes), i Pro+ plan (1.25TB od $17.99/mes). Detalji na stranici sa cenama.',
      },
      {
        question: 'Da li mogu da otkažem pretplatu?',
        answer: 'Da. Možete otkazati pretplatu u bilo kom trenutku. Vaši podaci ostaju dostupni do kraja plaćenog perioda.',
      },
    ],
  },
];

export default function HelpPage() {
  const [openCategory, setOpenCategory] = useState<string>('upload');
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-full"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Pomoć i podrška</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pronađite odgovore na česta pitanja ili nas kontaktirajte
        </p>
      </div>

      {/* Contact CTA */}
      <div className="mb-8 flex items-center gap-4 rounded-2xl border border-primary-200 bg-primary-50 p-5 dark:border-primary-800 dark:bg-primary-900/20">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
          <MessageCircle className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary-700 dark:text-primary-400">Trebate pomoć?</p>
          <p className="text-xs text-primary-600/70 dark:text-primary-400/70">
            Naš tim za podršku odgovara u roku od 24 sata
          </p>
        </div>
        <Link
          href="/contact"
          className="flex items-center gap-1 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-95"
        >
          Kontakt
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* FAQ Categories */}
      <div className="space-y-3">
        {categories.map((category) => {
          const Icon = category.icon;
          const isOpen = openCategory === category.id;

          return (
            <div
              key={category.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              <button
                onClick={() => setOpenCategory(isOpen ? '' : category.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <Icon className="h-5 w-5 text-gray-400" />
                <span className="flex-1 text-sm font-semibold">{category.name}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-gray-400 transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-100 px-5 py-2 dark:border-gray-700">
                      {category.faqs.map((faq, i) => (
                        <FAQAccordion
                          key={i}
                          faq={faq}
                          isOpen={openFAQ === `${category.id}-${i}`}
                          onToggle={() =>
                            setOpenFAQ(
                              openFAQ === `${category.id}-${i}` ? null : `${category.id}-${i}`
                            )
                          }
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function FAQAccordion({
  faq,
  isOpen,
  onToggle,
}: {
  faq: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-100 last:border-0 dark:border-gray-700/50">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="pr-4 text-sm text-gray-700 dark:text-gray-300">{faq.question}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 flex-shrink-0 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="pb-3 text-sm text-gray-500">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
