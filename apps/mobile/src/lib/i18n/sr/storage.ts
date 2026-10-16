import type en from '../en/storage';

const storage: typeof en = {
  viewPlans: 'Pogledaj planove',
  upgradePlan: 'Nadogradi plan',
  upgradeTo: 'Nadogradi na {plan}',
  later: 'Kasnije',
  notNow: 'Ne sada',
  warnTitle: 'Prostor se puni',
  warnBody: 'Iskoristio si oko 85% prostora. Ostalo ti je još {remaining}.',
  warnSuggest: 'Razmisli o planu {plan} ({storage}) da ti ne ponestane.',
  warnGeneric: 'Nadogradi plan da ti ne ponestane prostora.',
  criticalTitle: 'Skoro je puno!',
  criticalBody:
    'Ostalo ti je svega {remaining} prostora. Kad se napuni, nove slike, video i fajlovi neće moći da se sačuvaju u cloud.',
  criticalSuggest: 'Pređi na {plan} ({storage}).',
  criticalSuggestPrice: 'Pređi na {plan} ({storage}) za {price} €/god.',
  fullTitle: 'Prostor je popunjen',
  fullBody:
    'Tvoj cloud je pun — nove slike, video i fajlovi se trenutno ne mogu čuvati. Nadogradi plan da nastaviš sa bezbednim čuvanjem uspomena.',
  fullSuggest: 'Predlog: {plan} ({storage}).',
};

export default storage;
