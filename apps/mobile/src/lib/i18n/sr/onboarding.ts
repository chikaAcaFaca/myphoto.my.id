import type en from '../en/onboarding';

const onboarding: typeof en = {
  permissionNeededTitle: 'Potrebna dozvola',
  permissionNeededMessage:
    'Bez pristupa slikama ne možemo da napravimo backup. Možete ovo uključiti kasnije u podešavanjima.',
  permissionsTitle: 'Pristup slikama',
  permissionsDescription: 'Dozvolite pristup vašim slikama i video snimcima da bismo mogli da ih sačuvamo u cloudu.',
  permissionsNote: 'Vaše slike ostaju privatne. Ne koristimo ih za AI trening niti ih delimo sa trećim stranama.',
  allowAccess: 'Dozvoli pristup',
  skipForNow: 'Preskoči za sada',
  backupTitle: 'Auto-backup',
  backupDescription: 'Uključite automatski backup i vaše slike će se čuvati u cloudu čim se povežete na WiFi.',
  bonusTitle: '+1 GB besplatno!',
  bonusText: 'Dobijate dodatnih 1 GB prostora kada uključite auto-backup.',
  enableBackup: 'Uključi backup (+1 GB)',
  later: 'Kasnije',
  doneTitle: 'Sve je spremno!',
  doneDescription:
    'Vaš nalog je aktivan. Slike se automatski čuvaju u MyPhoto, a svi vaši fajlovi su dostupni u MySpace.',
  summaryPhotos: 'Slike → MyPhoto (galerija, AI pretraga, albumi)',
  summaryFiles: 'Fajlovi → MySpace (folderi kao na računaru)',
  summarySync: 'Sve se sinhronizuje automatski',
  summaryAccess: 'Pristup sa web-a, telefona i računara',
  start: 'Kreni!',
};

export default onboarding;
