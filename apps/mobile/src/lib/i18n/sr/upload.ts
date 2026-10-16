import type en from '../en/upload';

const upload: typeof en = {
  title: 'Upload',
  subtitle: 'Uploadujte fajlove u cloud',
  notSignedIn: 'Niste ulogovani.',
  doneTitle: 'Upload završen',
  doneMessage: '{success}/{total} fajlova uspešno uploadovano.',
  pickFailed: 'Nije moguće izabrati fajlove.',
  photos: 'Slike',
  photosSub: 'Izaberi iz galerije',
  videos: 'Video',
  videosSub: 'Izaberi snimke',
  files: 'Fajlovi',
  filesSub: 'PDF, dokument...',
  progress: 'Uploadovano {done}/{total} fajlova...',
  autoBackupSection: 'AUTO-BACKUP',
  pauseSync: 'Pauziraj Sync',
  syncFiles: {
    one: 'Sync {count} fajl',
    few: 'Sync {count} fajla',
    other: 'Sync {count} fajlova',
  },
  allSynced: 'Sve je sinhronizovano',
  syncingPercent: '{percent}% sinhronizacija...',
  folderSyncSection: 'MYSPACE FOLDER SYNC',
  syncInProgress: 'Sync u toku...',
  syncFilesToMySpace: {
    one: 'Sync {count} fajl u MySpace',
    few: 'Sync {count} fajla u MySpace',
    other: 'Sync {count} fajlova u MySpace',
  },
  foldersUpToDate: 'MySpace folderi ažurni',
  folderSyncPercent: '{percent}% MySpace sync...',
  pendingSync: {
    one: '{count} fajl čeka sync',
    few: '{count} fajla čekaju sync',
    other: '{count} fajlova čeka sync',
  },
  startSyncHint: 'Pokrenite sync za upload',
  upToDateHint: 'Vaši fajlovi su ažurni u cloudu',
};

export default upload;
