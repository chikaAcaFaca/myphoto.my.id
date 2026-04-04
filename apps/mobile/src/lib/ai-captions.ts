const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Generate funny meme captions using Google Gemini API (free tier).
 * Falls back to template-based captions if API is unavailable.
 */
export async function generateAiCaptions(
  labels: string[],
  sceneType: string,
  count: number = 5
): Promise<string[]> {
  if (!GEMINI_API_KEY) {
    return generateTemplateCaptions(labels, sceneType, count);
  }

  try {
    const labelsText = labels.length > 0 ? labels.join(', ') : sceneType;

    const prompt = `Generisi ${count} smesnih i duhovitih komentara za meme sliku na srpskom jeziku (latinica).
Slika sadrzi: ${labelsText}.
Scena: ${sceneType}.

Pravila:
- Komentari treba da budu smesni, kratki (max 2 recenice)
- Koristi humor koji je popularan na Balkanu
- Moze da ukljuci emoji
- Svaki komentar u novom redu
- Samo komentare, bez numeracije ili dodatnog teksta`;

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!res.ok) {
      console.log('Gemini API error:', res.status);
      return generateTemplateCaptions(labels, sceneType, count);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse response - split by newlines, filter empty
    const captions = text
      .split('\n')
      .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').trim()) // remove numbering
      .filter((line: string) => line.length > 5 && line.length < 200);

    if (captions.length >= 3) {
      return captions.slice(0, count);
    }

    // Not enough captions from AI, supplement with templates
    return generateTemplateCaptions(labels, sceneType, count);
  } catch (error) {
    console.log('Gemini caption error:', error);
    return generateTemplateCaptions(labels, sceneType, count);
  }
}

/**
 * Generate captions for meme based on image content description.
 * Uses Gemini to re-caption an existing meme with new humor.
 */
export async function recaptionMeme(
  currentCaption: string,
  imageDescription: string,
  count: number = 5
): Promise<string[]> {
  if (!GEMINI_API_KEY) {
    return generateTemplateCaptions([], 'default', count);
  }

  try {
    const prompt = `Ovo je meme sa tekstom: "${currentCaption}"
Opis slike: ${imageDescription}

Napravi ${count} alternativnih smesnih komentara na srpskom (latinica) koji bi bili jos smesniji.
Budi kreativan, koristi balkanski humor, emoji dozvoljeni.
Svaki komentar u novom redu, bez numeracije.`;

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1.0, maxOutputTokens: 500 },
      }),
    });

    if (!res.ok) return generateTemplateCaptions([], 'default', count);

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const captions = text
      .split('\n')
      .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((line: string) => line.length > 5 && line.length < 200);

    return captions.length >= 3 ? captions.slice(0, count) : generateTemplateCaptions([], 'default', count);
  } catch {
    return generateTemplateCaptions([], 'default', count);
  }
}

// ---- Template fallback (zero cost, works offline) ----

const TEMPLATES: Record<string, string[]> = {
  food: [
    'Dieta pocinje od ponedeljka... vec 5 godina 😂',
    'Kad kazes "samo jedan zalogaj" a onda... 🍕',
    'Ovaj obrok je napravljen sa puno ljubavi i jos vise kalorija',
    'Kuvar sam od rodjenja. Problem je sto tada niko to ne jede 👨‍🍳',
    'Fitness guru: "Jedi zdravo!" Ja u 3 ujutru:',
    'Stomak kaze NE ali oci kazu DA 👀',
    'Kad vidis cenu u restoranu posle rucka 💀',
  ],
  animal: [
    'Kad te sefovka gleda dok surfujes Instagram na poslu 🐶',
    'Ja kad cujem da neko otvara frizider',
    'Mood: ne diraj me, spavam ❌',
    'Jedan lajk = jedna mrvica za mene 🐱',
    'Kad roditelji kazu "imamo gosta" a ti nisi spreman',
    'Ovo sam ja kad me neko probudi pre 10 ujutru',
    'Kad te pitaju "jesi li jeo?" a ti vec razmisljas o veceri',
  ],
  people: [
    'Ekipa koja zajedno propada, zajedno se i smeje 😎',
    'Kad kazes "idem u 10" a krenes u 11:30',
    'Ovo je moj "radim nesto produktivno" izraz lica',
    'Glavni u grupi koji nikad nema plan',
    'Kad ti drugar kaze "veruj mi brate"...',
    'Ponedeljak mood vs petak mood',
    'Kad se slikas za Instagram vs kad te mama slika',
  ],
  nature: [
    'Setnja u prirodi: 5 min odmora, 50 min trazenja signala 📱',
    'Priroda je lepa dok ne dodju komarci 🦟',
    'Instagram vs. Realnost: ja u prirodi',
    'Kad kazes "idem da se opustim" a telefon je na 5%',
    'Ovo je mesto gde WiFi ne postoji. Aj cao! 👋',
    'Planina zove, a ja nemam patike 🏔️',
    'Kad odes u prirodu i shvatis da nisi outdoor tip',
  ],
  vehicle: [
    'Kad parkiras perfektno iz prvog pokusaja 🅿️',
    'Moj auto posle zimske sezone: "Sta mi radis brate?"',
    'GPS kaze levo, ja idem desno. Ko ce koga.',
    'Gorivo: prazno. Volja za zivotom: takodje prazno.',
    'Kad vidis policiju i odjednom vozis 30km/h ⚠️',
    'Auto na tehnickom: "Sve je super!" Auto sledeceg dana: 💀',
    'Kad ti kazu "blizu je, 5 minuta peske" a ti vozes 20 min',
  ],
  selfie: [
    'Trebalo mi je 47 pokusaja za ovo selfie. Ovo je 48. 📸',
    'Kad nadjes savrseno svetlo u kupatilu',
    'Filter kaze lepo, ogledalo kaze drugacije 🪞',
    'Moj "slucajni" selfi posle 30 minuta pripreme',
    'Kad se slikas i shvatis da ti telefon pao na nos',
  ],
  screenshot: [
    'Kad skrinsotujes poruku da je posaljes u grupu 👀',
    'Dokaz A u sudskom procesu protiv druga',
    'Ovo se ne brise, ovo je za arhivu 📁',
    'Sacuvano za crne dane',
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
  ],
};

function generateTemplateCaptions(labels: string[], sceneType: string, count: number): string[] {
  let category = sceneType || 'default';

  // Try to match by labels
  if (labels.length > 0) {
    const labelSet = labels.map(l => l.toLowerCase()).join(' ');
    if (labelSet.includes('food') || labelSet.includes('meal') || labelSet.includes('dish')) category = 'food';
    else if (labelSet.includes('animal') || labelSet.includes('dog') || labelSet.includes('cat')) category = 'animal';
    else if (labelSet.includes('person') || labelSet.includes('people') || labelSet.includes('selfie')) category = 'people';
    else if (labelSet.includes('plant') || labelSet.includes('nature') || labelSet.includes('tree')) category = 'nature';
    else if (labelSet.includes('car') || labelSet.includes('vehicle')) category = 'vehicle';
  }

  const pool = [...(TEMPLATES[category] || TEMPLATES.default)];

  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}
