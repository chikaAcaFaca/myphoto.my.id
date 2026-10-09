import type { refund as EnRefund } from '../en/pages-refund';
import type { DeepStrings } from '../types';

export const refund: DeepStrings<typeof EnRefund> = {
  meta: {
    title: 'Politika refundacije',
    description:
      'Politika refundacije i otkazivanja za plaćene MyPhoto pakete: garancija povraćaja novca 14 dana, kako otkazati i kako zatražiti refundaciju.',
  },
  title: 'Politika refundacije',
  lastUpdated: 'Poslednje ažuriranje: {date}',
  intro:
    'Ova politika se odnosi na plaćene MyPhoto (myphotomy.space) pretplate za prostor, čiji je izdavač NASRM Kapetan Bogdan Studio. Besplatan paket se nikada ne naplaćuje.',
  mor: {
    title: 'Ko obrađuje plaćanje',
    text: 'Online porudžbine obrađuje naš preprodavac i **Merchant of Record, Creem**, koji takođe rešava upite u vezi sa porudžbinama i refundacije. Na izvodu kartice ili banke biće naveden Creem, a Creem izdaje i račun.',
  },
  guarantee: {
    title: 'Garancija povraćaja novca 14 dana',
    i1: 'Možete zatražiti **pun povraćaj novca u roku od 14 dana** od prve uplate za bilo koji paket, bez navođenja razloga.',
    i2: 'Isti rok od 14 dana važi i za svako **godišnje obnavljanje**.',
    i3: 'Mesečna obnavljanja se po pravilu ne refundiraju kada novi period počne, ali svaki zahtev razmatramo pojedinačno — javite nam se ako ste greškom naplaćeni.',
    i4: 'Ova garancija ne ograničava vaša zakonska prava potrošača prema Direktivi EU 2011/83/EU i Zakonu o zaštiti potrošača Republike Srbije.',
  },
  how: {
    title: 'Kako zatražiti refundaciju',
    i1: 'Pošaljite email na **support@myphotomy.space** sa adrese vašeg naloga, uz broj porudžbine ili datum naplate, ili',
    i2: 'Odgovorite na Creem potvrdu o plaćanju koju ste dobili emailom.',
    outro: 'Odgovaramo u roku od 2 radna dana. Odobreni povraćaj vraća se na originalni način plaćanja, obično u roku od **5–10 radnih dana**, u zavisnosti od banke.',
  },
  cancel: {
    title: 'Otkazivanje pretplate',
    i1: 'Pretplatu možete otkazati u bilo kom trenutku preko linka **Manage subscription** u Creem potvrdi koju ste dobili emailom, ili nam pišite.',
    i2: 'Posle otkazivanja paket ostaje aktivan do kraja već plaćenog perioda i više nećete biti naplaćeni.',
    i3: 'Samo otkazivanje ne pokreće povraćaj novca — zatražite ga kao što je opisano iznad ako ste u roku za refundaciju.',
  },
  after: {
    title: 'Šta se dešava sa vašim fajlovima',
    text: 'Posle refundacije ili otkazivanja nalog prelazi na besplatan paket. Ako vaši fajlovi prelaze besplatan prostor, nalog postaje **samo za čitanje tokom 90 dana**: možete da pregledate i preuzmete sve, nadogradite paket, kupite jednokratnu arhivu ili obrišete fajlove, a mi vas podsećamo emailom. Ako ste posle 90 dana i dalje preko limita, brišu se vaši najskorije otpremljeni fajlovi preko limita. Fajlovi u okviru besplatnog prostora nikada nisu ugroženi.',
  },
  abuse: {
    title: 'Izuzeci',
    text: 'Možemo odbiti refundaciju u slučaju očigledne zloupotrebe, na primer ponovljenih ciklusa kupovine i refundacije ili naloga suspendovanih zbog kršenja Uslova korišćenja. Molimo vas da nas kontaktirate pre nego što pokrenete chargeback kod banke — problem obično rešimo brže.',
  },
  contact: {
    title: 'Kontakt',
    text: 'Pitanja o naplati i refundaciji:',
  },
};
