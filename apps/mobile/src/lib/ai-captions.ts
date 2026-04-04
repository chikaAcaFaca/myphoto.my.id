/**
 * AI Caption Generation System — 4-layer fallback chain:
 *
 * 1. Gemini 2.0 Flash (free: 1500 req/day) — primary
 * 2. Anthropic Claude (free trial / API key) — fallback
 * 3. Community Trending (from MemeWall) — social captions
 * 4. Template + ML Kit matching — offline, zero cost
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const MEME_PROMPT = (labels: string, scene: string, count: number) =>
  `Generisi ${count} smesnih i duhovitih komentara za meme sliku na srpskom jeziku (latinica).
Slika sadrzi: ${labels}.
Scena: ${scene}.

Pravila:
- Komentari treba da budu smesni, kratki (max 2 recenice)
- Koristi humor koji je popularan na Balkanu
- Moze da ukljuci emoji
- Svaki komentar u novom redu
- Samo komentare, bez numeracije ili dodatnog teksta`;

function parseCaptions(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\d+[\.\)\-]\s*/, '').replace(/^[\*\-]\s*/, '').trim())
    .filter((line) => line.length > 5 && line.length < 200);
}

// =====================================================
// Layer 1: Google Gemini (primary)
// =====================================================

async function tryGemini(prompt: string): Promise<string[] | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 500 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const captions = parseCaptions(text);
    return captions.length >= 3 ? captions : null;
  } catch {
    return null;
  }
}

// =====================================================
// Layer 2: Anthropic Claude (fallback)
// =====================================================

async function tryClaude(prompt: string): Promise<string[] | null> {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const captions = parseCaptions(text);
    return captions.length >= 3 ? captions : null;
  } catch {
    return null;
  }
}

// =====================================================
// Layer 3: Community Trending (from MemeWall API)
// =====================================================

async function tryTrending(sceneType: string, authToken?: string): Promise<string[] | null> {
  try {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(
      `${API_URL}/api/meme-wall/trending-captions?category=${sceneType}&limit=5`,
      { headers }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const captions = data.captions || data.items || [];
    return captions.length >= 3 ? captions : null;
  } catch {
    return null;
  }
}

// =====================================================
// Layer 4: Template + ML Kit matching (offline)
// =====================================================

const TEMPLATES: Record<string, string[]> = {
  food: [
    'Dieta pocinje od ponedeljka... vec 5 godina 😂',
    'Kad kazes "samo jedan zalogaj" a onda... 🍕',
    'Ovaj obrok je napravljen sa puno ljubavi i jos vise kalorija',
    'Kuvar sam od rodjenja. Problem je sto tada niko to ne jede 👨‍🍳',
    'Fitness guru: "Jedi zdravo!" Ja u 3 ujutru:',
    'Stomak kaze NE ali oci kazu DA 👀',
    'Kad vidis cenu u restoranu posle rucka 💀',
    'Kad otvaram frizider 47. put danas, mozda se nesto novo pojavilo',
    'Jedem jer sam tuzan, tuzan sam jer jedem. Krug zivota. 🔄',
    'Ovo izgleda kao sa Instagrama. Ukus je kao iz menze.',
  ],
  animal: [
    'Kad te sefovka gleda dok surfujes Instagram na poslu 🐶',
    'Ja kad cujem da neko otvara frizider',
    'Mood: ne diraj me, spavam ❌',
    'Jedan lajk = jedna mrvica za mene 🐱',
    'Kad roditelji kazu "imamo gosta" a ti nisi spreman',
    'Ovo sam ja kad me neko probudi pre 10 ujutru',
    'Kad te pitaju "jesi li jeo?" a ti vec razmisljas o veceri',
    'Zivotinja koju zasluzujem vs zivotinja koju imam',
    'Ovaj me razume bolje od svih ljudi koje znam',
    'Kad pas pojede domaci zadatak i spasi me od skole 🐕',
  ],
  people: [
    'Ekipa koja zajedno propada, zajedno se i smeje 😎',
    'Kad kazes "idem u 10" a krenes u 11:30',
    'Ovo je moj "radim nesto produktivno" izraz lica',
    'Glavni u grupi koji nikad nema plan',
    'Kad ti drugar kaze "veruj mi brate"...',
    'Ponedeljak mood vs petak mood',
    'Kad se slikas za Instagram vs kad te mama slika',
    'Introvert na zurci: *stoji pored stola sa hranom*',
    'Kad svi gledaju u telefone a ti si jedini koji gleda u pod',
    'Ova ekipa je dokaz da Bog ima smisao za humor',
  ],
  nature: [
    'Setnja u prirodi: 5 min odmora, 50 min trazenja signala 📱',
    'Priroda je lepa dok ne dodju komarci 🦟',
    'Instagram vs. Realnost: ja u prirodi',
    'Kad kazes "idem da se opustim" a telefon je na 5%',
    'Ovo je mesto gde WiFi ne postoji. Aj cao! 👋',
    'Planina zove, a ja nemam patike 🏔️',
    'Kad odes u prirodu i shvatis da nisi outdoor tip',
    'Ova slika je lepa dok ne vidis koliko sam se oznojio do ovde',
    'Google Maps kaze 2 sata pesacenja. Ja posle 30 min: 💀',
    'Priroda lepa, ali gde je uticnica?',
  ],
  vehicle: [
    'Kad parkiras perfektno iz prvog pokusaja 🅿️',
    'Moj auto posle zimske sezone: "Sta mi radis brate?"',
    'GPS kaze levo, ja idem desno. Ko ce koga.',
    'Gorivo: prazno. Volja za zivotom: takodje prazno.',
    'Kad vidis policiju i odjednom vozis 30km/h ⚠️',
    'Auto na tehnickom: "Sve je super!" Auto sledeceg dana: 💀',
    'Kad ti kazu "blizu je, 5 minuta peske" a ti vozes 20 min',
    'Moj auto trosi vise ulja nego benzina',
    'Kad udjes u auto ujutru i on ne pali. Ponedeljak.',
    'Gledaj mamu, bez ruku! *lupa u banderu*',
  ],
  selfie: [
    'Trebalo mi je 47 pokusaja za ovo selfie. Ovo je 48. 📸',
    'Kad nadjes savrseno svetlo u kupatilu',
    'Filter kaze lepo, ogledalo kaze drugacije 🪞',
    'Moj "slucajni" selfi posle 30 minuta pripreme',
    'Kad se slikas i shvatis da ti telefon pao na nos',
    'Prednja kamera: model. Zadnja kamera: FBI wanted poster.',
    'Jedan dobar selfi i samopozdanje za celu nedelju 💪',
  ],
  screenshot: [
    'Kad skrinsotujes poruku da je posaljes u grupu 👀',
    'Dokaz A u sudskom procesu protiv druga',
    'Ovo se ne brise, ovo je za arhivu 📁',
    'Sacuvano za crne dane',
    'Kad ti neko posalje poruku i odmah obrise — ali kasno 📸',
    'Ovo ce jednog dana biti dokaz na sudu 😈',
  ],
  sport: [
    'Ja posle 5 minuta trcanja: "Bio je dobar zivot" 🏃',
    'Trener kaze "jos jednom" vec peti put',
    'Moja forma: sjajan sam iz fotelje',
    'Kad kazes da ides u teretanu a zavrsis u kaficu',
    'Sportista sam. Ekstremno gledanje TV-a je sport, zar ne?',
  ],
  school: [
    'Kad profesor kaze "ovo ce biti na testu" 📝',
    'Ucio sam celu noc. Mislio sam na ucenje celu noc.',
    'Kad otvoris udzbenak dan pred ispit i shvatis da je na kineskom',
    'Kopiranje je timski rad, profesore 🤝',
    'Kad ti drugar kaze "nisam ucio" a dobije 5',
    'Veliki odmor: 15 minuta slobode u 8 sati zatvora',
  ],
  travel: [
    'Putovanje: 5% razgledanje, 95% trazenje WiFi-ja',
    'Kad kazes "idem na odmor" a vratis se umorniji nego pre',
    'Kofer: 20kg odece. Nosim: istu majicu 5 dana.',
    'Avion polece u 6. Ja u 5:55: "Stici cu!" 🏃',
    'Instagram putovanje vs stvarno putovanje: dva razlicita filma',
  ],
  party: [
    'Zurka je bila odlicna. Mislim. Ne secam se. 🎉',
    'Kad DJ pusti tvoju pesmu i ti postanes drugi covek 🕺',
    'Dosao sam na 5 minuta. Otisao u 5 ujutru.',
    'Pre zurke: "Necu piti." Posle: *pleše na stolu*',
    'Kad te slikaju na zurci bez tvog znanja 📸💀',
    'Ekskurzija: 3 dana bez spavanja i 300 slika za secanje',
  ],
  work: [
    'Radno vreme: 8-16. Produktivno vreme: 10:30-10:45.',
    'Kad sef salje mejl u petak u 16:55 📧',
    'Plata: mala. Ocekivanja: ogromna. Motivacija: 404 not found.',
    'Zoom poziv koji je mogao biti mejl. Opet.',
    'Kad kazes "radim od kuce" a gledas Netflix',
    'Ponedeljak: neprijatelj broj 1 svakog zaposlenog',
  ],
  baby: [
    'Kad beba konacno zaspi i ti se ne smejs pomeriti. Sat vremena. ⏰',
    'Beba se probudila u 3 ujutru. Ponovo. Kao i juce. I prekjuce.',
    'Pre deteta: 8 sati sna. Posle deteta: sta je san?',
    'Mali genije. Jede cipelice ali je genije.',
    'Kad ti beba nasmeje se — vredelo je svih besanih noci ❤️',
  ],
  default: [
    'Kad ne znas sta da napises ali hoces lajkove 😅',
    'Ovo je moj zvanicni mood za danas',
    'Bez konteksta, samo vibes ✨',
    'Posalji ovo nekom ko treba da se nasmeje 😂',
    'Nema objasnjenja. Samo poglej. 👀',
    'Kad nemas komentar ali ipak objavis',
    'Slika vredi hiljadu reci a ja nemam nijednu',
    'Ovo se desilo. Ne pitaj. 🤷',
    'Ja: imam plan. Zivot: imam bolji plan. 😤',
    'Kad svi misle da si lud ali ti samo uzivas',
    'Ponedeljak je izmisljen da nas testira 😤',
    'Ovo je dokaz da se cuda desavaju. Ili nesrece. Jedno od dva.',
  ],
};

// ML Kit label → category mapping with weighted keywords
const LABEL_CATEGORY_MAP: [RegExp, string][] = [
  [/food|meal|dish|pizza|burger|cake|fruit|vegetable|coffee|drink|wine|beer/i, 'food'],
  [/animal|dog|cat|bird|fish|horse|pet|puppy|kitten/i, 'animal'],
  [/person|people|man|woman|girl|boy|child|baby|crowd|portrait/i, 'people'],
  [/selfie|front.?camera/i, 'selfie'],
  [/plant|flower|tree|forest|mountain|beach|ocean|river|sky|sunset|sunrise|nature|garden|park/i, 'nature'],
  [/car|vehicle|truck|bus|motorcycle|bike|train|airplane|boat/i, 'vehicle'],
  [/sport|ball|football|basketball|tennis|gym|running|swimming|soccer/i, 'sport'],
  [/school|classroom|book|study|university|student|teacher|exam/i, 'school'],
  [/travel|airport|hotel|luggage|suitcase|tourism|monument|landmark/i, 'travel'],
  [/party|celebration|dance|club|concert|festival|birthday/i, 'party'],
  [/office|work|desk|computer|meeting|business|laptop/i, 'work'],
  [/baby|infant|toddler|newborn|stroller/i, 'baby'],
  [/screenshot|screen|ui|interface|notification|chat|message/i, 'screenshot'],
];

function matchCategory(labels: string[], sceneType: string): string {
  const combined = [...labels, sceneType].join(' ').toLowerCase();

  for (const [pattern, category] of LABEL_CATEGORY_MAP) {
    if (pattern.test(combined)) return category;
  }
  return 'default';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateTemplateCaptions(labels: string[], sceneType: string, count: number): string[] {
  const category = matchCategory(labels, sceneType);
  const pool = [...(TEMPLATES[category] || TEMPLATES.default)];
  // Mix in some defaults for variety
  if (category !== 'default') {
    pool.push(...TEMPLATES.default.slice(0, 3));
  }
  return shuffle(pool).slice(0, count);
}

// =====================================================
// Public API
// =====================================================

/**
 * Generate funny meme captions using 4-layer fallback:
 * Gemini → Claude → Community Trending → Templates
 */
export async function generateAiCaptions(
  labels: string[],
  sceneType: string,
  count: number = 5,
  authToken?: string
): Promise<string[]> {
  const labelsText = labels.length > 0 ? labels.join(', ') : sceneType;
  const prompt = MEME_PROMPT(labelsText, sceneType, count);

  // Layer 1: Gemini
  const geminiResult = await tryGemini(prompt);
  if (geminiResult) return geminiResult.slice(0, count);

  // Layer 2: Claude
  const claudeResult = await tryClaude(prompt);
  if (claudeResult) return claudeResult.slice(0, count);

  // Layer 3: Community trending
  const trendingResult = await tryTrending(matchCategory(labels, sceneType), authToken);
  if (trendingResult) return trendingResult.slice(0, count);

  // Layer 4: Templates + ML Kit matching
  return generateTemplateCaptions(labels, sceneType, count);
}

/**
 * Re-caption an existing meme with fresh humor.
 * Same 4-layer fallback.
 */
export async function recaptionMeme(
  currentCaption: string,
  imageDescription: string,
  count: number = 5
): Promise<string[]> {
  const prompt = `Ovo je meme sa tekstom: "${currentCaption}"
Opis slike: ${imageDescription}

Napravi ${count} alternativnih smesnih komentara na srpskom (latinica) koji bi bili jos smesniji.
Budi kreativan, koristi balkanski humor, emoji dozvoljeni.
Svaki komentar u novom redu, bez numeracije.`;

  const geminiResult = await tryGemini(prompt);
  if (geminiResult) return geminiResult.slice(0, count);

  const claudeResult = await tryClaude(prompt);
  if (claudeResult) return claudeResult.slice(0, count);

  return generateTemplateCaptions([], 'default', count);
}
