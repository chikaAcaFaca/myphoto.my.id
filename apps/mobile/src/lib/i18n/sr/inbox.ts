import type en from '../en/inbox';

const inbox: typeof en = {
  title: 'Inbox',
  activity: 'Aktivnost',
  empty: 'Još ništa novo',
  emptyHint: 'Ovde stižu lajkovi i komentari na tvoje mimove i prijatelji koji se pridruže preko tvog linka.',
  like: '{name} lajkuje tvoj mim',
  likeMany: '{name} i još {others} lajkuju tvoj mim',
  comment: '{name} komentariše: „{text}“',
  commentMany: '{count} novih komentara na tvom mimu',
  referralJoined: 'Novi član preko tvog linka: {name}',
  referralBonus: 'Stiglo ti je +250 MB: tvoj pozvani prijatelj sada koristi MyPhoto',
  someone: 'Neko',
  markAllRead: 'Označi sve kao pročitano',
  loadFailed: 'Inbox nije učitan.',
  retry: 'Pokušaj ponovo',
};

export default inbox;
