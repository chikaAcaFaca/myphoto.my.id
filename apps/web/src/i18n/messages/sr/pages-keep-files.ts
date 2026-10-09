import type { keepFiles as En } from '../en/pages-keep-files';
import type { DeepStrings } from '../types';

export const keepFiles: DeepStrings<typeof En> = {
  title: 'Sačuvajte svoje fajlove',
  archivedThanks: 'Hvala! Arhiva se aktivira — može da potraje minut dok se ovde ne pojavi.',
  overBy: 'Vaši fajlovi su {over} preko limita od {limit}.',
  deleteOn: 'Nalog je samo za čitanje. Dana {date} biće obrisani vaši najnoviji fajlovi preko limita, osim ako izaberete neku od opcija ispod.',
  archiveActive: 'Arhiva je aktivna do {date}. Do tada su vaši fajlovi sačuvani u režimu samo za čitanje.',
  allFits: 'Svi vaši fajlovi staju u prostor ({used} od {limit}). Ništa se neće brisati.',
  keepTitle: 'Sačuvajte sve',
  keepBody: 'Arhiva čuva sve vaše trenutne fajlove, samo za čitanje, u izabranom periodu. Gde pravi paket košta isto ili manje, prikazujemo paket.',
  months: '{count} mes.',
  planBetter: 'Paket {plan} ne košta više — uz otpremanje i backup.',
  archiveDesc: 'Jednokratno plaćanje, bez pretplate. Fajlovi ostaju samo za čitanje.',
  choosePlan: 'Izaberi paket',
  buyArchive: 'Kupi arhivu',
  checkoutFailed: 'Pokretanje plaćanja nije uspelo.',
  downloadTitle: 'Preuzmite sve',
  downloadBody: 'Sačuvajte sve fotografije, video snimke i fajlove na ovaj računar. U Chrome-u ili Edge-u birate folder; u ostalim pregledačima preuzimaju se ZIP fajlovi do 500 MB.',
  downloadButton: 'Preuzmi sve fajlove',
  downloadFailed: 'Lista fajlova nije mogla da se učita.',
  progress: '{done} od {total} fajlova',
  deleteTitle: 'Sami oslobodite prostor',
  deleteBody: 'Obrišite fajlove koji vam više ne trebaju — kad budete u okviru limita, ništa drugo se ne briše.',
  openPhotos: 'Otvori Fotografije',
  openMySpace: 'Otvori MySpace',
};
