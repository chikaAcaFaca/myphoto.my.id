# Izveštaj: Mobile app crash na splash ekranu

**Datum:** 2026-05-20
**Status:** ✅ REŠENO — duplikat React 18/19 u bundle-u (globalni pnpm override)

---

## REŠENJE (TL;DR)

**Uzrok:** Globalni pnpm override u root `package.json` je forsirao `react: 18.3.1`
na CEO monorepo — uključujući `react-native@0.81.5` koji **zahteva React 19**.
Bundle je zato sadržao **DVE kopije React-a** (18 iz override-a + 19 iz mobile-a).
`react-native` je čitao `ReactSharedInternals.S` iz pogrešne/undefined kopije →
`TypeError: Cannot read property 'S' of undefined` → crash na splash-u.

**Kako je nađen:** Android emulator (`emulator-5554`) + `adb logcat` — bez telefona.
Dekompajlovan APK bundle pokazao oba markera: React 18 **i** React 19.

**Fix:** Uklonjen globalni `react`/`react-dom` override iz root `package.json`.
Sada mobile koristi svoj deklarisani React 19, web ostaje React 18 (Vercel bezbedan).

**Verifikacija:** APK bundle → React 18 markeri = **0**, React 19 = **1** (jedna kopija).
App renderuje login ekran na emulatoru. Crash nestao.

---

## 1. Šta smo hteli da uradimo

Dodavanje **on-device "Ukloni pozadinu" (remove background)** funkcije u mobilnu aplikaciju — da radi na telefonu, offline, bez slanja na server.

Izabrani pristup: **ONNX model (briaai/RMBG-1.4)** + `onnxruntime-react-native` paket.

---

## 2. Hronologija verzija (APK build-ovi)

| Verzija | Šta sadrži | Rezultat |
|---|---|---|
| v4 | Google OAuth login fix | ✅ RADILO (fresh install, "Uspeo login") |
| v5–v9 | Device-only foto, auto-backup, video, meme content:// fix | ✅ Radilo (preko OTA update-a) |
| **v10** | **Dodat ONNX (onnxruntime-react-native + model)** | ❌ Crash na splash-u |
| v11 | + react-native.config.js (autolinking ONNX) | ❌ Crash na splash-u |
| v12 | Lazy-load ONNX (require umesto import) | ❌ Crash na splash-u |
| v14 | **ONNX potpuno uklonjen**, stub remove-bg | ❌ I dalje crash |
| v15 | + expo-updates ISKLJUČEN | ❌ I dalje crash |
| v16 | **Tačan povratak na v9** (git checkout + pnpm install) | ❌ I dalje crash |

**Ključni nalaz:** Čak i v16, koji je BAJT-ZA-BAJT kod kao v9 (kad je radilo), puca. Znači uzrok NIJE u kodu koji smo menjali.

---

## 3. Šta smo eliminisali kao uzrok

Sistematski isključeno (svaki sa zasebnim build-om i testom):

- ❌ **ONNX** — uklonjen u v14, crash ostao
- ❌ **Dependencies (node_modules)** — vraćeni na tačan v9 lockfile preko `pnpm install`, crash ostao
- ❌ **expo-updates / OTA** — isključen u v15, crash ostao
- ❌ **Hermes bytecode format** — proverili: APK bundle JESTE validan Hermes bytecode (magic `c61fbc03`), gradle pravilno pokreće hermesc

---

## 4. Tehnička analiza

### Šta znamo sigurno
1. **APK bundle je validan** — Hermes bytecode, pravilno kompajliran
2. **ErrorBoundary postoji** u `app/_layout.tsx` ali se NE prikazuje → crash je PRE nego što React stigne da renderuje (native nivo) ILI async u Provider init-u
3. **Isti build metod** (lokalni Gradle + `bundle-stub.js` workaround) je proizveo i v4 (radio) i v16 (puca)

### Build okruženje (lokalni build, jer je EAS budžet potrošen do kraja meseca)
- `gradlew assembleRelease` na Windows-u
- JAVA_HOME = Android Studio JBR
- `bundle-stub.js` workaround — Metro u monorepo-u ne može da reši `expo-router/entry` kroz Gradle, pa pre-bundle-ujemo ručno (`npx expo export:embed`) i kopiramo bundle
- `hermesEnabled=true`, `newArchEnabled=false`

### Najverovatniji preostali uzroci (bez log-a, hipoteze)
1. **Native modul crash pri init-u** — neki od ML Kit paketa (`face-detection`, `image-labeling`, `text-recognition`) ili drugi native modul puca pri startu na korisnikovom telefonu
2. **Razlika u native modul verzijama** — iako je JS kod = v9, instalirane native verzije posle svih pnpm operacija možda nisu identične v4-ovom stanju
3. **Async greška u AuthProvider init-u** (Firebase) koju ErrorBoundary ne hvata

---

## 5. Trenutno stanje (REŠENO)

- **Root uzrok:** globalni pnpm override `react: 18.3.1` (vidi TL;DR). Uklonjen.
- **APK:** `app-release.apk` (202 MB), bundle ima samo React 19 — verifikovano.
- **Emulator:** app renderuje login ekran, nema crash-a.
- **Web (myphotomy.space):** radi normalno, React 18 nepromenjen (Vercel build nezavisan).
- **Desktop app:** radi (set-password login).

---

## 6. Kako reprodukovati dijagnozu (za ubuduće)

Provera da li bundle ima duplikat React-a:
```bash
unzip -o app-release.apk assets/index.android.bundle -d /tmp/b
grep -c "18.3.1" /tmp/b/assets/index.android.bundle   # mora biti 0
grep -c "19.1.0" /tmp/b/assets/index.android.bundle   # mora biti >=1
```
Ako se vrati React 18 marker → opet je negde ubačen override/hoisting na React 18.

Emulator test loop (bez telefona):
```bash
emulator -avd <ime> &
adb install -r app-release.apk
adb logcat -c; adb shell am start -n id.my.myphoto/.MainActivity
adb logcat -d ReactNativeJS:E AndroidRuntime:E *:S
```

---

## 7. Pouke za ubuduće

- **Globalni pnpm `overrides` za `react` su opasni u monorepo-u** gde web (React 18)
  i mobile (React 19) žive zajedno — override forsira jednu verziju na oba.
- **Dva React-a u jednom RN bundle-u = `Cannot read property 'S' of undefined`**
  (ReactSharedInternals nije deljen između kopija). Uvek proveri marker count.
- **Emulator je dovoljan za dijagnozu** — ne treba fizički telefon za logcat.
- **Lokalni Gradle build + bundle-stub** ostaje krhak workaround za monorepo;
  EAS je čistiji kad je budžet dostupan, ali nije bio uzrok ovog crash-a.
