/**
 * AI Caption Generation System — 4-layer fallback:
 *
 * 1. Gemini 2.0 Flash (free 1500/day, then paid — cheapest AI) — primary
 * 2. Grok (xAI, $25/mo free) — only if Gemini is down
 * 3. Community Trending (from MemeWall) — social captions
 * 4. Template + ML Kit matching — offline, zero cost, always works
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GROK_API_KEY = process.env.EXPO_PUBLIC_GROK_API_KEY || '';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GROK_URL = 'https://api.x.ai/v1/chat/completions';

export type CaptionLanguage = 'sr' | 'en';

// Balkan humor patterns — teaches AI what's funny in Serbia
const BALKAN_HUMOR_GUIDE = `
Stil humora: Balkanski, srpski internet humor (Vukajlija stil).

NAJVAZNIJE PRAVILO: Komentar mora biti KRATAK i OSTAR. Jedna recenica, maksimum dve. NIKAD ne objasnjuj foru. NIKAD ne dodaj komentar posle poente. Kad punchline zavrsi — stani. Manje je vise.

LOSE primeri (predugacko, objasnjava foru, pravi lokalizovane WTF fore):
"Ja kad se slikam u ogledalu — jbg, brate, takav sam heroj!" ❌
"Ocekivao sam romantiku — to je kao epska bitka za moj prazan dzep!" ❌
"Ovo je moj balkanski Oscar!" ❌
"Prava drama, legenda sam, klasika!" ❌

DOBRO (kratko, univerzalno smesno, staje na poenti):
"Ocekivanje: model sa plaze. Realnost: zombi u pidzami." ✅
"Filter kaze lepo, ogledalo kaze drugacije 🪞" ✅
"Dieta pocinje od ponedeljka... vec 5 godina 😂" ✅
"Radno vreme: 8-16. Produktivno vreme: 10:30-10:45." ✅
"Plata dosla i otisla brze nego sto sam trepnuo 💸" ✅
"Zoom poziv koji je mogao biti mejl. Opet." ✅

Tehnike:
- KONTRAST: ocekivanje vs realnost u 2 kratke fraze — ovo je GLAVNA tehnika
- SAMOISMEIVANJE: "Ja kad..." — ali kratko, bez objasnjenja
- UNIVERZALNE TEME: ponedeljak, prazan frizider, kasnjenje, plata, lenjost, ispiti, WiFi ne radi
- TON: topao, samoironican, nikad zloban. Fore moraju biti smesne SVIMA, ne samo jednoj kulturi.

ZABRANJENO:
- Politika, veronauka, nacionalizam, uvrede
- Objasnjavanje fore ili dodavanje teksta posle poente
- Lokalizovane fraze koje nisu smesne ("balkanski Oscar", "epska bitka", "kafanska filozofija")
- Filler fraze: "prava drama", "takav sam heroj", "legenda sam", "klasika", "am I right?"
- Forsiranje balkanski izraza. "brate" i "jbg" samo ako prirodno stoji u recenici.`;

const MEME_PROMPT = (labels: string, scene: string, count: number, lang: CaptionLanguage = 'sr') => {
  if (lang === 'en') {
    return `Generate ${count} funny meme captions in English.
Image contains: ${labels}.
Scene: ${scene}.

MOST IMPORTANT RULE: Keep it SHORT. One sentence, max two. NEVER explain the joke. When the punchline lands — STOP. Less is more.

BAD (too long, explains the joke):
"Me when I sit down to work and instantly become a couch potato — classic procrastination at its finest, am I right?" ❌

GOOD (short, punchy, stops):
"Me when I sit down to work 💤" ✅
"Expectation: productivity. Reality: this." ✅
"My motivation left the chat" ✅

Techniques: expectation vs reality, "me when...", everyday struggles, passive-aggressive observations.
Tone: warm, self-aware, never mean.
Emojis allowed but don't overdo it.
Each caption on a new line, no numbering.`;
  }
  return `Generisi ${count} smesnih i duhovitih komentara za meme sliku na srpskom jeziku (latinica).
Slika sadrzi: ${labels}.
Scena: ${scene}.

${BALKAN_HUMOR_GUIDE}

Format:
- Max 2 recenice po komentaru
- Emoji dozvoljeni ali ne preterivati
- Svaki komentar u novom redu
- Samo komentare, bez numeracije ili dodatnog teksta`;
};

// Content moderation prompt — checks if meme text violates ToS
const MODERATION_PROMPT = (text: string) =>
  `Analyze this meme caption and determine if it contains any of the following:
- Hate speech or discrimination (religious, racial, sexual orientation)
- Threats or harassment
- Content that violates basic human rights
- Explicit calls to violence

Caption: "${text}"

Respond with ONLY a JSON object:
{"flagged": true/false, "reason": "short explanation if flagged, empty string if not"}`;

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
// Layer 2: Grok / xAI (OpenAI-compatible)
// =====================================================

async function tryGrok(prompt: string): Promise<string[] | null> {
  if (!GROK_API_KEY) return null;
  try {
    const res = await fetch(GROK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.9,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const captions = parseCaptions(text);
    return captions.length >= 3 ? captions : null;
  } catch {
    return null;
  }
}


// =====================================================
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
  monday: [
    'Ponedeljak: dan kad telo ustaje ali dusa ostaje u krevetu 😴',
    'Kad ti alarm zvoni u ponedeljak a ti razmisljas o smislu zivota',
    'Ponedeljak je dokaz da Bog ima smisao za humor. Los humor.',
    'Petak: heroj. Ponedeljak: zlocin protiv covecnosti.',
    'Svaki ponedeljak je novi pocetak. Ja: *spava do srede*',
    'Motivacioni govornik: "Ponedeljak je prilika!" Ja: 💀',
  ],
  money: [
    'Plata dosla i otisla brze nego sto sam trepnuo 💸',
    'Stedim novac tako sto ne gledam stanje na racunu',
    'Kad vidis cenu i stavis polako nazad na policu',
    'Banka: "Imate novo obaveštenje." Ja: *panika*',
    'Poslednji dan pred platu: preživljavanje na hlebu i vodi',
    'Kad ti drugar kaze "idemo napolje" a ti imas 200 din do plate',
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
    'Niko: ... Apsolutno niko: ... Ja: *ovo*',
    'Ma kakvi brate, sve pod kontrolom. *nista nije pod kontrolom*',
    'Zivot mi je kao WiFi — kad ga najvise trebam, ne radi',
    'Kad kazes "jbg" i to resi 90% problema',
  ],
};

const TEMPLATES_EN: Record<string, string[]> = {
  food: [
    'Diet starts Monday... for the 5th year in a row 😂',
    'When you say "just one bite" and then... 🍕',
    'This meal was made with a lot of love and even more calories',
    'Opening the fridge for the 47th time today, maybe something new appeared',
    'Fitness guru: "Eat healthy!" Me at 3am:',
    'My stomach says NO but my eyes say YES 👀',
    'Eating because I\'m sad, sad because I\'m eating. Circle of life. 🔄',
  ],
  animal: [
    'When your boss catches you scrolling Instagram at work 🐶',
    'Me when I hear someone opening the fridge',
    'Mood: don\'t touch me, I\'m sleeping ❌',
    'This one understands me better than any human I know',
    'When they ask "did you eat?" but you\'re already thinking about dinner',
    'The pet I deserve vs the pet I have',
  ],
  people: [
    'The squad that fails together, laughs together 😎',
    'When you say "leaving at 10" but start getting ready at 11:30',
    'This is my "I\'m being productive" face',
    'When your friend says "trust me bro"...',
    'Monday mood vs Friday mood',
    'Introvert at a party: *stands next to the food table*',
  ],
  nature: [
    'Nature walk: 5 min relaxation, 50 min looking for signal 📱',
    'Nature is beautiful until the mosquitoes arrive 🦟',
    'Instagram vs Reality: me in nature',
    'This is the place where WiFi doesn\'t exist. Bye! 👋',
    'Google Maps says 2 hours walking. Me after 30 min: 💀',
  ],
  selfie: [
    'It took 47 attempts for this selfie. This is attempt 48. 📸',
    'When you find the perfect bathroom lighting',
    'Filter says beautiful, mirror says otherwise 🪞',
    'Front camera: model. Back camera: FBI wanted poster.',
    'One good selfie and self-confidence for the whole week 💪',
  ],
  work: [
    'Work hours: 8-4. Productive hours: 10:30-10:45.',
    'When the boss sends an email at 4:55pm on Friday 📧',
    'Salary: small. Expectations: huge. Motivation: 404 not found.',
    'A Zoom call that could have been an email. Again.',
    'When you say "working from home" but you\'re watching Netflix',
  ],
  default: [
    'When you don\'t know what to write but want likes 😅',
    'This is my official mood for today',
    'No context, just vibes ✨',
    'Send this to someone who needs to laugh 😂',
    'No explanation needed. Just look. 👀',
    'A picture is worth a thousand words and I have none',
    'This happened. Don\'t ask. 🤷',
    'Me: I have a plan. Life: I have a better plan. 😤',
    'Monday was invented to test us 😤',
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
  [/money|cash|wallet|bank|credit|card|coin|price|bill|receipt/i, 'money'],
  [/monday|alarm|clock|morning|bed|sleep|tired|wake/i, 'monday'],
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

function generateTemplateCaptions(labels: string[], sceneType: string, count: number, lang: CaptionLanguage = 'sr'): string[] {
  const category = matchCategory(labels, sceneType);
  const templates = lang === 'en' ? TEMPLATES_EN : TEMPLATES;
  const pool = [...(templates[category] || templates.default)];
  // Mix in some defaults for variety
  if (category !== 'default') {
    pool.push(...(templates.default).slice(0, 3));
  }
  return shuffle(pool).slice(0, count);
}

// =====================================================
// Content Moderation
// =====================================================

/**
 * Check if a meme caption might violate Terms of Service.
 * Uses Gemini (free) → Grok → Claude fallback for moderation.
 * Returns { flagged, reason } — if flagged, UI must get user consent before publishing.
 */
export async function moderateCaption(
  caption: string
): Promise<{ flagged: boolean; reason: string }> {
  const prompt = MODERATION_PROMPT(caption);
  const safe = { flagged: false, reason: '' };

  function parseModeration(text: string): { flagged: boolean; reason: string } | null {
    try {
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) return null;
      const result = JSON.parse(jsonMatch[0]);
      if (typeof result.flagged === 'boolean') return result;
      return null;
    } catch {
      return null;
    }
  }

  // Try Gemini first (free)
  if (GEMINI_API_KEY) {
    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const result = parseModeration(text);
        if (result) return result;
      }
    } catch { /* fall through */ }
  }

  // Try Grok
  if (GROK_API_KEY) {
    try {
      const res = await fetch(GROK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.1,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        const result = parseModeration(text);
        if (result) return result;
      }
    } catch { /* fall through */ }
  }

  // If all moderation fails, allow (don't block users because AI is down)
  return safe;
}

// =====================================================
// Public API
// =====================================================

/**
 * Generate funny meme captions using 5-layer fallback:
 * Gemini → Grok → Claude → Community Trending → Templates
 */
export async function generateAiCaptions(
  labels: string[],
  sceneType: string,
  count: number = 5,
  authToken?: string,
  lang: CaptionLanguage = 'sr'
): Promise<string[]> {
  const labelsText = labels.length > 0 ? labels.join(', ') : sceneType;
  const prompt = MEME_PROMPT(labelsText, sceneType, count, lang);

  // Layer 1: Gemini (free 1500/day, then paid — cheapest)
  const geminiResult = await tryGemini(prompt);
  if (geminiResult) return geminiResult.slice(0, count);

  // Layer 2: Grok (only if Gemini is down)
  const grokResult = await tryGrok(prompt);
  if (grokResult) return grokResult.slice(0, count);

  // Layer 3: Community trending
  const trendingResult = await tryTrending(matchCategory(labels, sceneType), authToken);
  if (trendingResult) return trendingResult.slice(0, count);

  // Layer 4: Templates (offline, always works)
  return generateTemplateCaptions(labels, sceneType, count, lang);
}

/**
 * Re-caption an existing meme with fresh humor.
 * Same 5-layer fallback.
 */
export async function recaptionMeme(
  currentCaption: string,
  imageDescription: string,
  count: number = 5,
  lang: CaptionLanguage = 'sr'
): Promise<string[]> {
  const prompt = lang === 'en'
    ? `This is a meme with text: "${currentCaption}"
Image description: ${imageDescription}

Create ${count} alternative funny captions in English that would be even funnier.
Use relatable, self-deprecating humor. "Me when...", expectation vs reality, everyday struggles as comedy.
Be creative, emojis allowed. Each caption on a new line, no numbering.`
    : `Ovo je meme sa tekstom: "${currentCaption}"
Opis slike: ${imageDescription}

${BALKAN_HUMOR_GUIDE}

Napravi ${count} alternativnih smesnih komentara na srpskom (latinica) koji bi bili jos smesniji od originala.
Svaki komentar u novom redu, bez numeracije.`;

  const geminiResult = await tryGemini(prompt);
  if (geminiResult) return geminiResult.slice(0, count);

  const grokResult = await tryGrok(prompt);
  if (grokResult) return grokResult.slice(0, count);

  const claudeResult = await tryClaude(prompt);
  if (claudeResult) return claudeResult.slice(0, count);

  return generateTemplateCaptions([], 'default', count, lang);
}
