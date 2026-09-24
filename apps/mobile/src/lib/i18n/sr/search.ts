import type en from '../en/search';

const search: typeof en = {
  title: 'Pretraga',
  placeholder: 'Pretraži slike, video, fajlove...',
  modeCloud: 'Cloud',
  modeDevice: 'Na uređaju',
  aiSuggestions: 'AI PREDLOZI',
  suggestions: {
    pets: 'Ljubimci',
    cars: 'Automobili',
    food: 'Hrana',
    nature: 'Priroda',
    people: 'Ljudi',
    travel: 'Putovanja',
    architecture: 'Arhitektura',
    sunset: 'Zalazak sunca',
  },
  noLocalResults: 'Nema lokalnih rezultata za "{query}"',
  indexingHint: 'AI indeksiranje se pokreće automatski u pozadini',
  localCount: {
    one: '{count} na uređaju',
    few: '{count} na uređaju',
    other: '{count} na uređaju',
  },
  noLabels: 'Bez labela',
  screenshot: '(snimak ekrana)',
  noResults: 'Nema rezultata za "{query}"',
  resultCount: {
    one: '{count} rezultat',
    few: '{count} rezultata',
    other: '{count} rezultata',
  },
};

export default search;
