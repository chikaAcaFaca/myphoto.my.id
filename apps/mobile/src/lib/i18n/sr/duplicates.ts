import type en from '../en/duplicates';

const duplicates: typeof en = {
  title: 'Duplikati',
  dismiss: 'Odbaci',
  dismissFailed: 'Nije moguće odbaciti duplikat.',
  deleteConfirmTitle: 'Obrisati duplikat?',
  deleteConfirmMessage: 'Fajl će biti premešten u korpu.',
  deleteFailed: 'Brisanje nije uspelo.',
  similarity: '{percent}% slično',
  empty: 'Nema duplikata',
  emptyHint: 'Sve vaše slike su jedinstvene',
  groupCount: {
    one: '{count} grupa duplikata',
    few: '{count} grupe duplikata',
    other: '{count} grupa duplikata',
  },
};

export default duplicates;
