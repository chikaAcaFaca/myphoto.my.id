import type en from '../en/trash';

const trash: typeof en = {
  title: 'Korpa',
  emptyAction: 'Isprazni',
  emptyConfirmTitle: 'Isprazni korpu?',
  emptyConfirmMessage: 'Svi fajlovi ({count}) će biti trajno obrisani. Ova akcija je nepovratna.',
  emptyFailed: 'Nije moguće isprazniti korpu.',
  daysLeft: '{days}d',
  notice: 'Fajlovi se automatski brišu nakon 30 dana',
  empty: 'Korpa je prazna',
  emptyHint: 'Obrisani fajlovi će se pojaviti ovde',
};

export default trash;
