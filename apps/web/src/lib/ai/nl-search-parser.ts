/**
 * Natural Language Search Parser for MyPhoto
 *
 * Parses queries like:
 * - "Branka u Vranju pre 5 meseci"
 * - "slike sa plaže iz avgusta"
 * - "porodica u Nišu prošle godine"
 * - "Marko i Ana na planini"
 */

export interface ParsedSearch {
  // Person names detected in query
  personNames: string[];
  // Location/place terms
  locationTerms: string[];
  // Time range (absolute dates)
  dateRange?: { from: Date; to: Date };
  // Scene/visual attribute filters
  sceneFilters: SceneFilter[];
  // Face attribute filters (hair color, gender etc.)
  faceFilters: FaceFilter[];
  // Remaining keywords for label/text search
  keywords: string[];
  // Original query
  raw: string;
}

export interface SceneFilter {
  field: string; // sceneAttributes field path e.g. 'landscape', 'architecture', 'timeOfDay'
  value: string; // expected value
}

export interface FaceFilter {
  field: string; // e.g. 'hairColor', 'gender'
  value: string;
}

// Serbian time expressions → relative date resolver
const TIME_PATTERNS: { pattern: RegExp; resolver: () => { from: Date; to: Date } }[] = [
  // "pre X meseci"
  {
    pattern: /pre\s+(\d+)\s+mesec[ia]?/i,
    resolver: function () {
      const match = this.pattern.exec('');
      return { from: new Date(), to: new Date() };
    },
  },
];

// Serbian terms → scene attribute mappings
const SCENE_TERM_MAP: Record<string, SceneFilter> = {
  // Landscape
  'brda': { field: 'landscape', value: 'hills' },
  'brdo': { field: 'landscape', value: 'hills' },
  'planina': { field: 'landscape', value: 'hills' },
  'planini': { field: 'landscape', value: 'hills' },
  'livada': { field: 'landscape', value: 'meadow' },
  'livade': { field: 'landscape', value: 'meadow' },
  'polje': { field: 'landscape', value: 'meadow' },
  'šuma': { field: 'landscape', value: 'forest' },
  'šumi': { field: 'landscape', value: 'forest' },
  'reka': { field: 'landscape', value: 'water' },
  'reci': { field: 'landscape', value: 'water' },
  'jezero': { field: 'landscape', value: 'water' },
  'jezeru': { field: 'landscape', value: 'water' },
  'more': { field: 'landscape', value: 'sea' },
  'moru': { field: 'landscape', value: 'sea' },
  'plaža': { field: 'landscape', value: 'sea' },
  'plaži': { field: 'landscape', value: 'sea' },
  // Urban
  'grad': { field: 'urban', value: 'city' },
  'gradu': { field: 'urban', value: 'city' },
  'zgrada': { field: 'urban', value: 'building' },
  'zgradi': { field: 'urban', value: 'building' },
  'neboder': { field: 'urban', value: 'skyscraper' },
  'nebodera': { field: 'urban', value: 'skyscraper' },
  'visoka zgrada': { field: 'urban', value: 'skyscraper' },
  // Architecture
  'moderna': { field: 'architecture', value: 'modern' },
  'moderno': { field: 'architecture', value: 'modern' },
  'modernoj': { field: 'architecture', value: 'modern' },
  'moderna gradnja': { field: 'architecture', value: 'modern' },
  'stara gradnja': { field: 'architecture', value: 'old' },
  'stara': { field: 'architecture', value: 'old' },
  'staro': { field: 'architecture', value: 'old' },
  'starom': { field: 'architecture', value: 'old' },
  'crkva': { field: 'architecture', value: 'old' },
  'crkvi': { field: 'architecture', value: 'old' },
  'zamak': { field: 'architecture', value: 'old' },
  'tvrđava': { field: 'architecture', value: 'old' },
  'selo': { field: 'architecture', value: 'rural' },
  'selu': { field: 'architecture', value: 'rural' },
  // Time of day
  'zora': { field: 'timeOfDay', value: 'dawn' },
  'svitanje': { field: 'timeOfDay', value: 'dawn' },
  'jutro': { field: 'timeOfDay', value: 'morning' },
  'jutros': { field: 'timeOfDay', value: 'morning' },
  'podne': { field: 'timeOfDay', value: 'afternoon' },
  'popodne': { field: 'timeOfDay', value: 'afternoon' },
  'veče': { field: 'timeOfDay', value: 'evening' },
  'večeri': { field: 'timeOfDay', value: 'evening' },
  'zalazak': { field: 'timeOfDay', value: 'evening' },
  'noć': { field: 'timeOfDay', value: 'night' },
  'noću': { field: 'timeOfDay', value: 'night' },
  // Weather
  'sunce': { field: 'weather', value: 'sunny' },
  'sunčano': { field: 'weather', value: 'sunny' },
  'oblačno': { field: 'weather', value: 'cloudy' },
  'kiša': { field: 'weather', value: 'rainy' },
  'sneg': { field: 'weather', value: 'snowy' },
  'magla': { field: 'weather', value: 'foggy' },
  // Season
  'proleće': { field: 'season', value: 'spring' },
  'leto': { field: 'season', value: 'summer' },
  'jesen': { field: 'season', value: 'autumn' },
  'zima': { field: 'season', value: 'winter' },
};

// Face attribute terms
const FACE_TERM_MAP: Record<string, FaceFilter> = {
  // Hair color
  'crna kosa': { field: 'hairColor', value: 'black' },
  'crnokos': { field: 'hairColor', value: 'black' },
  'smeđa kosa': { field: 'hairColor', value: 'brown' },
  'plava kosa': { field: 'hairColor', value: 'blonde' },
  'plavuša': { field: 'hairColor', value: 'blonde' },
  'riđa kosa': { field: 'hairColor', value: 'red' },
  'seda kosa': { field: 'hairColor', value: 'gray' },
  'bela kosa': { field: 'hairColor', value: 'white' },
  // Gender
  'muškarac': { field: 'gender', value: 'male' },
  'muški': { field: 'gender', value: 'male' },
  'momak': { field: 'gender', value: 'male' },
  'dečko': { field: 'gender', value: 'male' },
  'žena': { field: 'gender', value: 'female' },
  'ženski': { field: 'gender', value: 'female' },
  'devojka': { field: 'gender', value: 'female' },
  'dete': { field: 'gender', value: 'child' },
  'deca': { field: 'gender', value: 'child' },
  'beba': { field: 'gender', value: 'child' },
  // Accessories
  'naočare': { field: 'glasses', value: 'true' },
  'brada': { field: 'beard', value: 'true' },
};

// Common Serbian prepositions and conjunctions to strip
const STOP_WORDS = new Set([
  'u', 'na', 'sa', 'iz', 'od', 'do', 'pre', 'posle', 'i', 'ili', 'mi',
  'nađi', 'nadji', 'pronađi', 'pronadji', 'pokaži', 'pokazi', 'prikaži', 'prikazi',
  'slike', 'slike', 'fotografije', 'foto', 'videa', 'video',
  'moje', 'moj', 'moja', 'sve', 'sva', 'neki', 'neka', 'neke',
]);

// Month names in Serbian
const MONTHS_SR: Record<string, number> = {
  januar: 0, januara: 0, jan: 0,
  februar: 1, februara: 1, feb: 1,
  mart: 2, marta: 2, mar: 2,
  april: 3, aprila: 3, apr: 3,
  maj: 4, maja: 4,
  jun: 5, juna: 5,
  jul: 6, jula: 6,
  avgust: 7, avgusta: 7, avg: 7,
  septembar: 8, septembra: 8, sep: 8,
  oktobar: 9, oktobra: 9, okt: 9,
  novembar: 10, novembra: 10, nov: 10,
  decembar: 11, decembra: 11, dec: 11,
};

export function parseNaturalLanguageQuery(query: string): ParsedSearch {
  const result: ParsedSearch = {
    personNames: [],
    locationTerms: [],
    sceneFilters: [],
    faceFilters: [],
    keywords: [],
    raw: query,
  };

  let remaining = query.trim();

  // 1. Extract time expressions
  result.dateRange = extractDateRange(remaining);
  remaining = removeTimeExpressions(remaining);

  // 2. Extract scene attribute terms (multi-word first, then single-word)
  const remainingLower = remaining.toLowerCase();

  // Check multi-word scene terms first (e.g. "moderna gradnja", "visoka zgrada")
  for (const [term, filter] of Object.entries(SCENE_TERM_MAP)) {
    if (term.includes(' ') && remainingLower.includes(term)) {
      result.sceneFilters.push(filter);
      remaining = remaining.replace(new RegExp(escapeRegex(term), 'gi'), '');
    }
  }

  // Check multi-word face terms
  for (const [term, filter] of Object.entries(FACE_TERM_MAP)) {
    if (term.includes(' ') && remainingLower.includes(term)) {
      result.faceFilters.push(filter);
      remaining = remaining.replace(new RegExp(escapeRegex(term), 'gi'), '');
    }
  }

  // 3. Extract location phrases
  const locationPhrases = extractLocationPhrases(remaining);
  result.locationTerms = locationPhrases;
  for (const loc of locationPhrases) {
    remaining = remaining.replace(new RegExp(`(u|na|iz)\\s+${escapeRegex(loc)}`, 'gi'), '');
  }

  // 4. Extract person names and single-word attribute terms
  const words = remaining.split(/\s+/);
  const locationSet = new Set(locationPhrases.map((l) => l.toLowerCase()));

  for (const word of words) {
    const clean = word.replace(/[,.:!?]/g, '');
    if (!clean) continue;
    const cleanLower = clean.toLowerCase();

    // Skip stop words
    if (STOP_WORDS.has(cleanLower)) continue;

    // Check single-word scene terms
    if (SCENE_TERM_MAP[cleanLower]) {
      result.sceneFilters.push(SCENE_TERM_MAP[cleanLower]);
      continue;
    }

    // Check single-word face terms
    if (FACE_TERM_MAP[cleanLower]) {
      result.faceFilters.push(FACE_TERM_MAP[cleanLower]);
      continue;
    }

    // Capitalized word not a location → person name
    if (clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase()) {
      if (!locationSet.has(cleanLower)) {
        result.personNames.push(clean);
        continue;
      }
    }

    // Everything else → keyword
    result.keywords.push(cleanLower);
  }

  // Deduplicate
  result.sceneFilters = deduplicateFilters(result.sceneFilters);
  result.faceFilters = deduplicateFilters(result.faceFilters);

  return result;
}

function deduplicateFilters<T extends { field: string; value: string }>(filters: T[]): T[] {
  const seen = new Set<string>();
  return filters.filter((f) => {
    const key = `${f.field}:${f.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractDateRange(text: string): { from: Date; to: Date } | undefined {
  const now = new Date();

  // "pre X meseci" / "pre X nedelja" / "pre X dana" / "pre X godina"
  let match = text.match(/pre\s+(\d+)\s+(mesec[ia]?|nedelj[ae]?|dan[a]?|godin[ae]?)/i);
  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const from = new Date(now);
    const to = new Date(now);

    if (unit.startsWith('mesec')) {
      from.setMonth(from.getMonth() - amount - 1);
      to.setMonth(to.getMonth() - amount + 1);
    } else if (unit.startsWith('nedelj')) {
      from.setDate(from.getDate() - (amount + 1) * 7);
      to.setDate(to.getDate() - (amount - 1) * 7);
    } else if (unit.startsWith('dan')) {
      from.setDate(from.getDate() - amount - 3);
      to.setDate(to.getDate() - amount + 3);
    } else if (unit.startsWith('godin')) {
      from.setFullYear(from.getFullYear() - amount, 0, 1);
      to.setFullYear(to.getFullYear() - amount, 11, 31);
    }

    return { from, to };
  }

  // "prošle godine" / "prošlog leta" / "prošlog meseca"
  match = text.match(/prošl[eiao]g?\s+(godin[eiau]|let[aou]|mesec[a]?|nedelj[eiau])/i);
  if (match) {
    const unit = match[1].toLowerCase();
    if (unit.startsWith('godin')) {
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31),
      };
    }
    if (unit.startsWith('let')) {
      return {
        from: new Date(now.getFullYear() - 1, 5, 1),  // June last year
        to: new Date(now.getFullYear() - 1, 8, 30),    // Sept last year
      };
    }
    if (unit.startsWith('mesec')) {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 1, 1);
      const to = new Date(from);
      to.setMonth(to.getMonth() + 1, 0);
      return { from, to };
    }
  }

  // "iz januara" / "u avgustu" / month name standalone
  for (const [monthName, monthIndex] of Object.entries(MONTHS_SR)) {
    const monthRegex = new RegExp(`(iz|u|tokom)\\s+${monthName}\\b`, 'i');
    if (monthRegex.test(text) || new RegExp(`\\b${monthName}\\b`, 'i').test(text)) {
      // Assume current year unless "prošle" is present
      const year = /prošl/i.test(text) ? now.getFullYear() - 1 : now.getFullYear();
      return {
        from: new Date(year, monthIndex, 1),
        to: new Date(year, monthIndex + 1, 0),
      };
    }
  }

  // Year number: "2024", "2023"
  match = text.match(/\b(20[12]\d)\b/);
  if (match) {
    const year = parseInt(match[1]);
    return {
      from: new Date(year, 0, 1),
      to: new Date(year, 11, 31),
    };
  }

  return undefined;
}

function removeTimeExpressions(text: string): string {
  return text
    .replace(/pre\s+\d+\s+(mesec[ia]?|nedelj[ae]?|dan[a]?|godin[ae]?)/gi, '')
    .replace(/prošl[eiao]g?\s+(godin[eiau]|let[aou]|mesec[a]?|nedelj[eiau])/gi, '')
    .replace(/(iz|u|tokom)\s+(januar[a]?|februar[a]?|mart[a]?|april[a]?|maj[a]?|jun[a]?|jul[a]?|avgust[a]?|septemb[a-z]*|oktob[a-z]*|novemb[a-z]*|decemb[a-z]*)/gi, '')
    .replace(/\b20[12]\d\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLocationPhrases(text: string): string[] {
  const locations: string[] = [];

  // "u Vranju", "na Kopaoniku", "iz Beograda" → extract the capitalized word after preposition
  const locRegex = /(?:u|na|iz)\s+([A-ZŠĐČĆŽ][a-zšđčćžA-ZŠĐČĆŽ]+)/g;
  let match;
  while ((match = locRegex.exec(text)) !== null) {
    locations.push(match[1]);
  }

  return locations;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
