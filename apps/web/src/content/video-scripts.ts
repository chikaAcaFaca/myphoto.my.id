/**
 * Scripts for the avatar videos the content pipeline renders and posts
 * (lib/content-pipeline.ts), in posting order. Spoken Serbian, read by the
 * owner's avatar "Čika Aca" straight to camera.
 *
 * Shape of every script (10–30 s, at most MAX_SCRIPT_WORDS words):
 *   hook (one sentence) → 2–3 sentences of concrete advice → sign-off + call
 *   to action. The recurring sign-off builds Čika Aca as the go-to person
 *   for photos, phones and storage.
 *
 * Keep every claim true: prices are VAT-exclusive list prices from
 * packages/shared, features must exist in the app. New scripts: append with
 * a new unique id; never change the id of one that may be rendered/posted.
 */

export const MAX_SCRIPT_WORDS = 70; // ≈ 30 s of speech

export interface VideoScript {
  id: string;
  series: 'google-pun' | 'mim' | 'saveti';
  /** YouTube title, ≤ 100 chars. */
  title: string;
  /** What the avatar says. */
  script: string;
  /** Post text for TikTok / Instagram / Facebook / YouTube description. */
  caption: string;
}

const TAGS_GOOGLE = '#čikaaca #google #googlephotos #telefon #saveti #srbija';
const TAGS_MIM = '#čikaaca #mimovi #stikeri #viber #humor #srbija';
const TAGS_SAVETI = '#čikaaca #telefon #android #slike #backup #srbija';
const LINK = 'MyPhoto: myphotomy.space (1 GB besplatno)';

export const VIDEO_SCRIPTS: VideoScript[] = [
  {
    id: 'g01-google-pun',
    series: 'google-pun',
    title: 'Google prostor je pun? Evo šta to znači',
    script:
      'Stigla ti je poruka da je Google prostor pun? Nije sitnica. Gmail, Drive i Google slike dele petnaest gigabajta. Kad se napune, ne stižu ti mejlovi, a nove slike se nigde ne čuvaju. Ja sam Čika Aca, i pokazaću ti kako to da rešiš. Zaprati me, a slike sačuvaj u MyPhoto, prvi gigabajt je besplatan.',
    caption: `Google prostor pun? Evo šta se dešava. ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm01-stiker-10s',
    series: 'mim',
    title: 'Stiker od svoje slike za 10 sekundi',
    script:
      'Najbolji stiker je onaj sa likom tvog druga. Otvoriš sliku u MyPhoto, pritisneš Napravi stiker, i pozadina nestane. Dodaš tekst, sačuvaš, pošalješ na Viber. Deset sekundi. Čika Aca kaže: probaj odmah. Link je u opisu, aplikacija je besplatna.',
    caption: `Stiker od slike druga za 10 sekundi 😂 ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's01-pre-prodaje',
    series: 'saveti',
    title: 'Prodaješ telefon? Prvo uradi ovo sa slikama',
    script:
      'Prodaješ telefon? Stani. Prvo proveri da su sve slike u cloudu. Drugo, sačuvaj i Viber i WhatsApp slike, one su u posebnim folderima. Tek onda resetuj telefon. Ja sam Čika Aca. Ako slike čuvaš u MyPhoto, na novom telefonu se samo prijaviš i sve je tu. Link je u opisu.',
    caption: `3 stvari pre prodaje telefona 📱 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g02-gmail-ciscenje',
    series: 'google-pun',
    title: 'Oslobodi Google prostor za 2 minuta: Gmail trik',
    script:
      'Evo najbržeg načina da oslobodiš Google prostor. U Gmail pretragu ukucaj: has, dve tačke, attachment, razmak, larger, dve tačke, deset M. Dobiješ sve velike priloge. Obriši ih i isprazni Otpad. Čika Aca ti preporučuje: slike drži odvojeno, u MyPhoto, pa ti se Gmail nikad više ne napuni.',
    caption: `Gmail trik: has:attachment larger:10M 🧹 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm02-mim-tekst',
    series: 'mim',
    title: 'Kako da mim zaista bude smešan',
    script:
      'Tajna dobrog mima? Kratak tekst. Najviše osam reči. Gore postavka, dole poenta. I uzmi svoju sliku, poznata lica su uvek smešnija. Čika Aca te izaziva: napravi mim u MyPhoto i objavi ga na Meme Wall. Mim sa najviše lajkova te nedelje osvaja pet gigabajta.',
    caption: `Pravilo dobrog mima: max 8 reči 😎 Mim nedelje osvaja 5 GB. ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's02-razbijen-telefon',
    series: 'saveti',
    title: 'Telefon se razbio. Gde su slike?',
    script:
      'Telefon ti je pao i ekran je crn. Gde su slike? Ako nisu bile u cloudu, jedino rešenje je servis, i to ne uvek. Zato Čika Aca kaže: backup se uključuje dok telefon radi. MyPhoto sam čuva svaku novu sliku. Uključi ga danas, link je u opisu.',
    caption: `Ne čekaj da se telefon razbije 💔 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g03-photos-ciscenje',
    series: 'google-pun',
    title: 'Google Photos: obriši snimke ekrana i mutne slike',
    script:
      'U Google slikama postoji skriveno mesto koje oslobađa gigabajte. Biblioteka, pa Uslužni programi, pa Upravljanje prostorom. Tu su snimci ekrana, mutne slike i najveći video snimci. Pazi, dugme Oslobodi prostor briše slike sa telefona, ne iz clouda. Ja sam Čika Aca, zaprati me za još ovakvih trikova.',
    caption: `Skriveno mesto u Google Photos koje oslobađa gigabajte 👀 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm03-meme-wall',
    series: 'mim',
    title: 'Mim nedelje: najviše lajkova osvaja 5 GB',
    script:
      'Svake nedelje na Meme Wall-u imamo temu. Napraviš mim, objaviš ga, i ako skupi najviše lajkova, dobijaš pet gigabajta na godinu dana. Bez prijave, bez sitnih slova. Čika Aca te čeka na Meme Wall-u. Preuzmi MyPhoto, link je u opisu.',
    caption: `Mim nedelje 🏆 Najviše lajkova = 5 GB na godinu dana. ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's03-whatsapp-folder',
    series: 'saveti',
    title: 'Zašto ti WhatsApp puni telefon',
    script:
      'Znaš zašto ti je telefon pun? WhatsApp čuva svaku sliku iz svake grupe. Dobro jutro slike, mimovi, tuđa deca. Otvori podešavanja, Skladište i podaci, i isključi automatsko preuzimanje. Čika Aca savetuje: tvoje prave slike čuvaj u MyPhoto, a smeće ostavi u grupi.',
    caption: `Ovo ti puni telefon 📵 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g04-cena',
    series: 'google-pun',
    title: '24 GB za slike za 4,99 evra godišnje',
    script:
      'Koliko košta prostor za slike? Google One sto gigabajta je oko dvadeset evra godišnje, i deli se sa mejlom. Kome treba manje, MyPhoto daje dvadeset četiri gigabajta za četiri devedeset devet godišnje. Ja sam Čika Aca, i prvi gigabajt ti dajem besplatno. Link je u opisu.',
    caption: `24 GB za €4,99 godišnje (bez PDV-a) 💶 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm04-ljubimac',
    series: 'mim',
    title: 'Napravi stiker od svog psa ili mačke',
    script:
      'Tvoj pas ima izraz lica za svaku situaciju. Iskoristi to. Slikaj ga, otvori u MyPhoto, Napravi stiker, i pozadina nestaje. Imaš stiker za ponedeljak, za platu, za šefa. Čika Aca garantuje: ljubimac uvek pobedi u grupi. Probaj, link je u opisu.',
    caption: `Pas kao stiker = najbolja reakcija u grupi 🐶 ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's04-wifi-backup',
    series: 'saveti',
    title: 'Backup slika bez trošenja interneta',
    script:
      'Plašiš se da će backup pojesti mobilni internet? Ne mora. U MyPhoto izabereš da se slike čuvaju samo preko WiFi-a. Kad dođeš kući, telefon sam pošalje sve nove slike i video. Ja sam Čika Aca, i to je backup bez brige. Uključi ga danas, link je u opisu.',
    caption: `Backup samo preko WiFi-a 📶 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g05-drive',
    series: 'google-pun',
    title: 'Google Drive: nađi najveće fajlove za 5 sekundi',
    script:
      'Na Google Drive-u postoji lista svih fajlova po veličini. Otvori drive, tačka, google, tačka, com, kosa crta drive, kosa crta quota. Na vrhu su najveći, obično stari video snimci. Čika Aca ti kaže: obriši ih, a video čuvaj tamo gde ima mesta. Zaprati me za još trikova.',
    caption: `Najveći fajlovi na Drive-u: drive.google.com/drive/quota 🔎 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm05-tekst-stiker',
    series: 'mim',
    title: 'Stiker samo od teksta',
    script:
      'Ne treba ti slika da napraviš stiker. U MyPhoto napraviš stiker samo od teksta. Ukucaš rečenicu koju tvoja ekipa stalno ponavlja, izabereš boju, i gotovo. Postane zvanični stiker grupe. Čika Aca predlaže: probaj sa rečenicom koju tvoj tata uvek kaže. Link je u opisu.',
    caption: `Stiker od rečenice koju tvoj tata uvek kaže 😂 ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's05-novi-telefon',
    series: 'saveti',
    title: 'Novi telefon: sve slike za minut',
    script:
      'Kupio si novi telefon? Ne prebacuj slike kablom. Ako su u MyPhoto cloudu, instaliraš aplikaciju, prijaviš se istim Google nalogom, i sve slike su tu. Stari telefon prodaš bez brige. Ja sam Čika Aca. Pripremi se pre kupovine, link je u opisu.',
    caption: `Novi telefon, stare slike za minut 📲 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g06-otpad',
    series: 'google-pun',
    title: 'Obrisao si, a prostor i dalje pun?',
    script:
      'Obrisao si gomilu slika, a Google i dalje kaže da je pun? Zato što su u Otpadu. Obrisane slike tamo stoje šezdeset dana i troše prostor. Isprazni Otpad u slikama, Gmail-u i Drive-u. Čika Aca ovde. Zaprati me, svake nedelje novi trik za tvoj telefon.',
    caption: `Obrisao si, a i dalje je pun? Evo zašto 🗑️ ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm06-podeli-zaradi',
    series: 'mim',
    title: 'Podeli mim, dobij više prostora',
    script:
      'Svaki mim koji podeliš iz MyPhoto nosi tvoj link. Kad neko preko njega napravi nalog i sačuva prvih sto megabajta, ti dobijaš dvesta pedeset megabajta više. Do dva i po gigabajta besplatno. Čika Aca kaže: što smešniji mim, to više prostora. Kreni, link je u opisu.',
    caption: `Smešniji mim = više prostora 😏 ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's06-video-zauzima',
    series: 'saveti',
    title: 'Jedan video zauzima koliko 100 slika',
    script:
      'Jedan minut videa u 4K zauzima preko trista megabajta. To je kao sto slika. Snimaš decu, utakmice, koncerte? Telefon se puni za par nedelja. Čika Aca savetuje: video drži u cloudu, a na telefonu samo ono što stalno gledaš. MyPhoto to radi sam, link je u opisu.',
    caption: `1 minut 4K videa = 100 slika 🎥 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g07-mejlovi-odbijeni',
    series: 'google-pun',
    title: 'Ne stižu ti mejlovi? Proveri Google prostor',
    script:
      'Neko ti je poslao mejl, a ti ga nemaš? Proveri Google prostor. Kad je pun, Gmail ne prima poruke, a pošiljalac dobije obaveštenje da je sanduče puno. Najčešći krivac su slike. Ja sam Čika Aca: prebaci slike u MyPhoto i Gmail ponovo radi. Link je u opisu.',
    caption: `Ne stižu ti mejlovi? Ovo je razlog 📧 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm07-ponedeljak',
    series: 'mim',
    title: 'Mim za ponedeljak ujutru',
    script:
      'Ponedeljak ujutru, svi u grupi ćute. Tvoj trenutak. Uzmi najgoru sliku sebe od jutros i napiši: ja u osam nula nula. Gotov mim za deset sekundi u MyPhoto. Čika Aca te izaziva: objavi ga na Meme Wall, možda je ova nedelja tvoja. Link je u opisu.',
    caption: `Ja u 08:00 ☕ ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's07-porodicni-album',
    series: 'saveti',
    title: 'Jedan link za sve slike sa letovanja',
    script:
      'Porodica ti traži slike sa letovanja jednu po jednu na Viberu? Napravi album u MyPhoto, ubaci najlepše slike i pošalji jedan link. Svako ih vidi i preuzme koje hoće, bez aplikacije i bez naloga. Čika Aca kaže: jedan link umesto pedeset poruka. Probaj, link je u opisu.',
    caption: `Jedan link umesto 50 slika na Viberu 👨‍👩‍👧 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g08-eu-serveri',
    series: 'google-pun',
    title: 'Gde se tačno čuvaju tvoje slike?',
    script:
      'Znaš li gde se tačno čuvaju tvoje slike? Kod velikih servisa, negde u svetu. Kod MyPhoto, u Frankfurtu, u Evropskoj uniji, pod evropskim zakonima. Šifrovane su u prenosu i na serveru, i ne koristimo ih za reklame. Ja sam Čika Aca, i to ti garantujem. Link je u opisu.',
    caption: `Tvoje slike u Frankfurtu, u EU 🇪🇺 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm08-slava',
    series: 'mim',
    title: 'Stikeri sa slave i rođendana',
    script:
      'Posle svake slave imaš sto slika i bar pet savršenih izraza lica. Ne daj da propadnu. Napravi stikere od rodbine, uz njihovu dozvolu naravno, i porodična grupa nikad neće biti ista. Čika Aca kaže: MyPhoto, Napravi stiker, pošalji. Link je u opisu.',
    caption: `Stikeri od rodbine (uz dozvolu 😅) ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's08-original-kvalitet',
    series: 'saveti',
    title: 'Da li ti cloud kvari kvalitet slika?',
    script:
      'Neki servisi smanjuju kvalitet slika da bi uštedeli prostor. Na telefonu ne primetiš, ali na uveličanoj odštampanoj slici se vidi. MyPhoto čuva slike u originalu, onako kako ih je telefon napravio. Ja sam Čika Aca, i tvoje uspomene zaslužuju pun kvalitet. Link je u opisu.',
    caption: `Original kvalitet, bez kompresije 🖼️ ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g09-koliko-treba',
    series: 'google-pun',
    title: 'Koliko prostora ti zaista treba?',
    script:
      'Koliko prostora ti zaista treba? Slika sa telefona ima oko četiri megabajta. Hiljadu slika je četiri gigabajta. Godišnje napraviš dve do tri hiljade. Za većinu ljudi dvadeset četiri gigabajta traje godinama, a košta četiri devedeset devet godišnje. Čika Aca je izračunao umesto tebe. Link je u opisu.',
    caption: `1000 slika ≈ 4 GB. Koliko tebi treba? 🤔 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm09-sef',
    series: 'mim',
    title: 'Mim kad šef kaže "samo nešto kratko"',
    script:
      'Šef kaže: samo nešto kratko pre nego što odeš. Svi znamo šta to znači. Napravi mim: gore samo nešto kratko, dole slika sata u devet uveče. U MyPhoto upišeš tekst i gotovo. Čika Aca savetuje: pošalji kolegama, ali ne u grupu gde je šef. Link je u opisu.',
    caption: `"Samo nešto kratko" 🙃 ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's09-deca-slike',
    series: 'saveti',
    title: 'Roditelji: slike dece čuvajte na dva mesta',
    script:
      'Roditelji, slike dece se ne mogu ponoviti. Prvi korak, prvi zub, prvi dan škole. Pravilo je jednostavno: svaka važna slika mora da postoji na dva mesta, na telefonu i u cloudu. Čika Aca vas moli: uključite automatski backup danas. MyPhoto, link je u opisu.',
    caption: `Slike dece na dva mesta, uvek 👶 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g10-besplatno',
    series: 'google-pun',
    title: 'Besplatno do 2,5 GB uz preporuke',
    script:
      'Ne želiš da plaćaš? Ne moraš. MyPhoto daje jedan gigabajt besplatno. Za svakog prijatelja koji se registruje preko tvog linka i sačuva prvih sto megabajta, dobijaš još dvesta pedeset. Do dva i po gigabajta, besplatno. Ja sam Čika Aca, i ovo je moj poklon. Link je u opisu.',
    caption: `Do 2,5 GB besplatno uz preporuke 🎁 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm10-utakmica',
    series: 'mim',
    title: 'Mim za utakmicu',
    script:
      'Utakmica je, tvoj tim gubi, grupa je u šoku. Sad je vreme za mim. Uzmi sliku svog lica dok gledaš i napiši: kad sudija ne vidi ništa. Deset sekundi u MyPhoto. Čika Aca kaže: rezultat zaboravimo, mim ostaje. Napravi svoj, link je u opisu.',
    caption: `Kad sudija ne vidi ništa ⚽ ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's10-dupla-sigurnost',
    series: 'saveti',
    title: 'Pravilo 3-2-1 za slike, jednostavno',
    script:
      'Fotografi imaju pravilo tri dva jedan: tri kopije, na dva mesta, jedna van kuće. Tebi je dovoljno jednostavnije: slike na telefonu plus automatski u cloudu. A jednom godišnje preuzmi sve na računar. Ja sam Čika Aca, i ovo je pravilo koje te nikad neće izdati. MyPhoto, link je u opisu.',
    caption: `Pravilo 3-2-1, verzija za svakoga 🔐 ${LINK} ${TAGS_SAVETI}`,
  },
];
