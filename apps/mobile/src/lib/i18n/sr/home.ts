import type en from '../en/home';

const home: typeof en = {
  syncing: 'Sinhronizacija... {percent}%',
  pendingUpload: {
    one: '{count} fajl čeka upload',
    few: '{count} fajla čekaju upload',
    other: '{count} fajlova čeka upload',
  },
  deviceSummary: '{device} slika na uređaju · {cloud} u cloudu',
  loadingPhotos: 'Učitavanje slika...',
  noPhotos: 'Nema slika',
  allowAccess: 'Dozvolite pristup slikama u Settings',
};

export default home;
