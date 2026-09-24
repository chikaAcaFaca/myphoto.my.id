import type en from '../en/family';

const family: typeof en = {
  title: 'Porodica',
  defaultName: 'Moja porodica',
  created: 'Porodica je kreirana!',
  failed: 'Nije uspelo',
  networkError: 'Mrežna greška',
  memberAdded: '{name} je dodat u porodicu!',
  inviteFailed: 'Pozivanje nije uspelo',
  removeTitle: 'Ukloni člana',
  removeConfirm: 'Da li želite da uklonite {name}?',
  emptyTitle: 'Nemate porodicu',
  emptySubtitle: 'Kreirajte porodicu da biste delili storage i slike sa članovima. Svi članovi koriste isti account za storage.',
  create: 'Kreiraj porodicu',
  sectionFamily: 'PORODICA',
  sectionMembers: 'ČLANOVI',
  sectionShared: 'DELJENE SLIKE',
  members: {
    one: '{count} član',
    few: '{count} člana',
    other: '{count} članova',
  },
  sharedStorage: 'Zajednički storage: {size}',
  admin: 'Admin',
  emailPlaceholder: 'Email adresa',
  morePhotos: '+ još {count} slika',
};

export default family;
