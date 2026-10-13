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
 * `script` is Serbian Cyrillic written the way it is spoken: the TTS voice
 * reads Latin Serbian with a foreign accent ("j" as "dž"), so foreign words
 * are spelled phonetically (MyPhoto → Мај Фото, Gmail → Џимејл, cloud →
 * клауд). Titles and captions stay in Latin for search.
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
      'Стигла ти је порука да је Гугл простор пун? Није ситница. Џимејл, Драјв и Гугл слике деле петнаест гигабајта. Кад се напуне, не стижу ти мејлови, а нове слике се нигде не чувају. Ја сам Чика Аца, и показаћу ти како то да решиш. Запрати ме, а слике сачувај у Мај Фото, први гигабајт је бесплатан.',
    caption: `Google prostor pun? Evo šta se dešava. ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm01-stiker-10s',
    series: 'mim',
    title: 'Stiker od svoje slike za 10 sekundi',
    script:
      'Најбољи стикер је онај са ликом твог друга. Отвориш слику у Мај Фото, притиснеш Направи стикер, и позадина нестане. Додаш текст, сачуваш, пошаљеш на Вајбер. Десет секунди. Чика Аца каже: пробај одмах. Линк је у опису, апликација је бесплатна.',
    caption: `Stiker od slike druga za 10 sekundi 😂 ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's01-pre-prodaje',
    series: 'saveti',
    title: 'Prodaješ telefon? Prvo uradi ovo sa slikama',
    script:
      'Продајеш телефон? Стани. Прво провери да су све слике у клауду. Друго, сачувај и Вајбер и Вотсап слике, оне су у посебним фолдерима. Тек онда ресетуј телефон. Ја сам Чика Аца. Ако слике чуваш у Мај Фото, на новом телефону се само пријавиш и све је ту. Линк је у опису.',
    caption: `3 stvari pre prodaje telefona 📱 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g02-gmail-ciscenje',
    series: 'google-pun',
    title: 'Oslobodi Google prostor za 2 minuta: Gmail trik',
    script:
      'Ево најбржег начина да ослободиш Гугл простор. У Џимејл претрагу укуцај: хез, две тачке, атачмент, размак, ларџер, две тачке, десет ем. Добијеш све велике прилоге. Обриши их и испразни Отпад. Чика Аца ти препоручује: слике држи одвојено, у Мај Фото, па ти се Џимејл никад више не напуни.',
    caption: `Gmail trik: has:attachment larger:10M 🧹 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm02-mim-tekst',
    series: 'mim',
    title: 'Kako da mim zaista bude smešan',
    script:
      'Тајна доброг мима? Кратак текст. Највише осам речи. Горе поставка, доле поента. И узми своју слику, позната лица су увек смешнија. Чика Аца те изазива: направи мим у Мај Фото и објави га на Мим Вол. Мим са највише лајкова те недеље осваја пет гигабајта.',
    caption: `Pravilo dobrog mima: max 8 reči 😎 Mim nedelje osvaja 5 GB. ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's02-razbijen-telefon',
    series: 'saveti',
    title: 'Telefon se razbio. Gde su slike?',
    script:
      'Телефон ти је пао и екран је црн. Где су слике? Ако нису биле у клауду, једино решење је сервис, и то не увек. Зато Чика Аца каже: бекап се укључује док телефон ради. Мај Фото сам чува сваку нову слику. Укључи га данас, линк је у опису.',
    caption: `Ne čekaj da se telefon razbije 💔 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g03-photos-ciscenje',
    series: 'google-pun',
    title: 'Google Photos: obriši snimke ekrana i mutne slike',
    script:
      'У Гугл сликама постоји скривено место које ослобађа гигабајте. Библиотека, па Услужни програми, па Управљање простором. Ту су снимци екрана, мутне слике и највећи видео снимци. Пази, дугме Ослободи простор брише слике са телефона, не из клауда. Ја сам Чика Аца, запрати ме за још оваквих трикова.',
    caption: `Skriveno mesto u Google Photos koje oslobađa gigabajte 👀 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm03-meme-wall',
    series: 'mim',
    title: 'Mim nedelje: najviše lajkova osvaja 5 GB',
    script:
      'Сваке недеље на Мим Волу имамо тему. Направиш мим, објавиш га, и ако скупи највише лајкова, добијаш пет гигабајта на годину дана. Без пријаве, без ситних слова. Чика Аца те чека на Мим Волу. Преузми Мај Фото, линк је у опису.',
    caption: `Mim nedelje 🏆 Najviše lajkova = 5 GB na godinu dana. ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's03-whatsapp-folder',
    series: 'saveti',
    title: 'Zašto ti WhatsApp puni telefon',
    script:
      'Знаш зашто ти је телефон пун? Вотсап чува сваку слику из сваке групе. Добро јутро слике, мимови, туђа деца. Отвори подешавања, Складиште и подаци, и искључи аутоматско преузимање. Чика Аца саветује: твоје праве слике чувај у Мај Фото, а смеће остави у групи.',
    caption: `Ovo ti puni telefon 📵 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g04-cena',
    series: 'google-pun',
    title: '24 GB za slike za 4,99 evra godišnje',
    script:
      'Колико кошта простор за слике? Гугл Оне сто гигабајта је око двадесет евра годишње, и дели се са мејлом. Коме треба мање, Мај Фото даје двадесет четири гигабајта за четири деведесет девет годишње. Ја сам Чика Аца, и први гигабајт ти дајем бесплатно. Линк је у опису.',
    caption: `24 GB za €4,99 godišnje (bez PDV-a) 💶 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm04-ljubimac',
    series: 'mim',
    title: 'Napravi stiker od svog psa ili mačke',
    script:
      'Твој пас има израз лица за сваку ситуацију. Искористи то. Сликај га, отвори у Мај Фото, Направи стикер, и позадина нестаје. Имаш стикер за понедељак, за плату, за шефа. Чика Аца гарантује: љубимац увек победи у групи. Пробај, линк је у опису.',
    caption: `Pas kao stiker = najbolja reakcija u grupi 🐶 ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's04-wifi-backup',
    series: 'saveti',
    title: 'Backup slika bez trošenja interneta',
    script:
      'Плашиш се да ће бекап појести мобилни интернет? Не мора. У Мај Фото изабереш да се слике чувају само преко вајфаја. Кад дођеш кући, телефон сам пошаље све нове слике и видео. Ја сам Чика Аца, и то је бекап без бриге. Укључи га данас, линк је у опису.',
    caption: `Backup samo preko WiFi-a 📶 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g05-drive',
    series: 'google-pun',
    title: 'Google Drive: nađi najveće fajlove za 5 sekundi',
    script:
      'На Гугл Драјву постоји листа свих фајлова по величини. Отвори драјв, тачка, гугл, тачка, ком, коса црта драјв, коса црта квота. На врху су највећи, обично стари видео снимци. Чика Аца ти каже: обриши их, а видео чувај тамо где има места. Запрати ме за још трикова.',
    caption: `Najveći fajlovi na Drive-u: drive.google.com/drive/quota 🔎 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm05-tekst-stiker',
    series: 'mim',
    title: 'Stiker samo od teksta',
    script:
      'Не треба ти слика да направиш стикер. У Мај Фото направиш стикер само од текста. Укуцаш реченицу коју твоја екипа стално понавља, изабереш боју, и готово. Постане званични стикер групе. Чика Аца предлаже: пробај са реченицом коју твој тата увек каже. Линк је у опису.',
    caption: `Stiker od rečenice koju tvoj tata uvek kaže 😂 ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's05-novi-telefon',
    series: 'saveti',
    title: 'Novi telefon: sve slike za minut',
    script:
      'Купио си нови телефон? Не пребацуј слике каблом. Ако су у Мај Фото клауду, инсталираш апликацију, пријавиш се истим Гугл налогом, и све слике су ту. Стари телефон продаш без бриге. Ја сам Чика Аца. Припреми се пре куповине, линк је у опису.',
    caption: `Novi telefon, stare slike za minut 📲 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g06-otpad',
    series: 'google-pun',
    title: 'Obrisao si, a prostor i dalje pun?',
    script:
      'Обрисао си гомилу слика, а Гугл и даље каже да је пун? Зато што су у Отпаду. Обрисане слике тамо стоје шездесет дана и троше простор. Испразни Отпад у сликама, Џимејлу и Драјву. Чика Аца овде. Запрати ме, сваке недеље нови трик за твој телефон.',
    caption: `Obrisao si, a i dalje je pun? Evo zašto 🗑️ ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm06-podeli-zaradi',
    series: 'mim',
    title: 'Podeli mim, dobij više prostora',
    script:
      'Сваки мим који поделиш из Мај Фото носи твој линк. Кад неко преко њега направи налог и сачува првих сто мегабајта, ти добијаш двеста педесет мегабајта више. До два и по гигабајта бесплатно. Чика Аца каже: што смешнији мим, то више простора. Крени, линк је у опису.',
    caption: `Smešniji mim = više prostora 😏 ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's06-video-zauzima',
    series: 'saveti',
    title: 'Jedan video zauzima koliko 100 slika',
    script:
      'Један минут видеа у фор кеј заузима преко триста мегабајта. То је као сто слика. Снимаш децу, утакмице, концерте? Телефон се пуни за пар недеља. Чика Аца саветује: видео држи у клауду, а на телефону само оно што стално гледаш. Мај Фото то ради сам, линк је у опису.',
    caption: `1 minut 4K videa = 100 slika 🎥 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g07-mejlovi-odbijeni',
    series: 'google-pun',
    title: 'Ne stižu ti mejlovi? Proveri Google prostor',
    script:
      'Неко ти је послао мејл, а ти га немаш? Провери Гугл простор. Кад је пун, Џимејл не прима поруке, а пошиљалац добије обавештење да је сандуче пуно. Најчешћи кривац су слике. Ја сам Чика Аца: пребаци слике у Мај Фото и Џимејл поново ради. Линк је у опису.',
    caption: `Ne stižu ti mejlovi? Ovo je razlog 📧 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm07-ponedeljak',
    series: 'mim',
    title: 'Mim za ponedeljak ujutru',
    script:
      'Понедељак ујутру, сви у групи ћуте. Твој тренутак. Узми најгору слику себе од јутрос и напиши: ја у осам нула нула. Готов мим за десет секунди у Мај Фото. Чика Аца те изазива: објави га на Мим Вол, можда је ова недеља твоја. Линк је у опису.',
    caption: `Ja u 08:00 ☕ ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's07-porodicni-album',
    series: 'saveti',
    title: 'Jedan link za sve slike sa letovanja',
    script:
      'Породица ти тражи слике са летовања једну по једну на Вајберу? Направи албум у Мај Фото, убаци најлепше слике и пошаљи један линк. Свако их види и преузме које хоће, без апликације и без налога. Чика Аца каже: један линк уместо педесет порука. Пробај, линк је у опису.',
    caption: `Jedan link umesto 50 slika na Viberu 👨‍👩‍👧 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g08-eu-serveri',
    series: 'google-pun',
    title: 'Gde se tačno čuvaju tvoje slike?',
    script:
      'Знаш ли где се тачно чувају твоје слике? Код великих сервиса, негде у свету. Код Мај Фото, у Франкфурту, у Европској унији, под европским законима. Шифроване су у преносу и на серверу, и не користимо их за рекламе. Ја сам Чика Аца, и то ти гарантујем. Линк је у опису.',
    caption: `Tvoje slike u Frankfurtu, u EU 🇪🇺 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm08-slava',
    series: 'mim',
    title: 'Stikeri sa slave i rođendana',
    script:
      'После сваке славе имаш сто слика и бар пет савршених израза лица. Не дај да пропадну. Направи стикере од родбине, уз њихову дозволу наравно, и породична група никад неће бити иста. Чика Аца каже: Мај Фото, Направи стикер, пошаљи. Линк је у опису.',
    caption: `Stikeri od rodbine (uz dozvolu 😅) ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's08-original-kvalitet',
    series: 'saveti',
    title: 'Da li ti cloud kvari kvalitet slika?',
    script:
      'Неки сервиси смањују квалитет слика да би уштедели простор. На телефону не приметиш, али на увеличаној одштампаној слици се види. Мај Фото чува слике у оригиналу, онако како их је телефон направио. Ја сам Чика Аца, и твоје успомене заслужују пун квалитет. Линк је у опису.',
    caption: `Original kvalitet, bez kompresije 🖼️ ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g09-koliko-treba',
    series: 'google-pun',
    title: 'Koliko prostora ti zaista treba?',
    script:
      'Колико простора ти заиста треба? Слика са телефона има око четири мегабајта. Хиљаду слика је четири гигабајта. Годишње направиш две до три хиљаде. За већину људи двадесет четири гигабајта траје годинама, а кошта четири деведесет девет годишње. Чика Аца је израчунао уместо тебе. Линк је у опису.',
    caption: `1000 slika ≈ 4 GB. Koliko tebi treba? 🤔 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm09-sef',
    series: 'mim',
    title: 'Mim kad šef kaže "samo nešto kratko"',
    script:
      'Шеф каже: само нешто кратко пре него што одеш. Сви знамо шта то значи. Направи мим: горе само нешто кратко, доле слика сата у девет увече. У Мај Фото упишеш текст и готово. Чика Аца саветује: пошаљи колегама, али не у групу где је шеф. Линк је у опису.',
    caption: `"Samo nešto kratko" 🙃 ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's09-deca-slike',
    series: 'saveti',
    title: 'Roditelji: slike dece čuvajte na dva mesta',
    script:
      'Родитељи, слике деце се не могу поновити. Први корак, први зуб, први дан школе. Правило је једноставно: свака важна слика мора да постоји на два места, на телефону и у клауду. Чика Аца вас моли: укључите аутоматски бекап данас. Мај Фото, линк је у опису.',
    caption: `Slike dece na dva mesta, uvek 👶 ${LINK} ${TAGS_SAVETI}`,
  },
  {
    id: 'g10-besplatno',
    series: 'google-pun',
    title: 'Besplatno do 2,5 GB uz preporuke',
    script:
      'Не желиш да плаћаш? Не мораш. Мај Фото даје један гигабајт бесплатно. За сваког пријатеља који се региструје преко твог линка и сачува првих сто мегабајта, добијаш још двеста педесет. До два и по гигабајта, бесплатно. Ја сам Чика Аца, и ово је мој поклон. Линк је у опису.',
    caption: `Do 2,5 GB besplatno uz preporuke 🎁 ${LINK} ${TAGS_GOOGLE}`,
  },
  {
    id: 'm10-utakmica',
    series: 'mim',
    title: 'Mim za utakmicu',
    script:
      'Утакмица је, твој тим губи, група је у шоку. Сад је време за мим. Узми слику свог лица док гледаш и напиши: кад судија не види ништа. Десет секунди у Мај Фото. Чика Аца каже: резултат заборавимо, мим остаје. Направи свој, линк је у опису.',
    caption: `Kad sudija ne vidi ništa ⚽ ${LINK} ${TAGS_MIM}`,
  },
  {
    id: 's10-dupla-sigurnost',
    series: 'saveti',
    title: 'Pravilo 3-2-1 za slike, jednostavno',
    script:
      'Фотографи имају правило три два један: три копије, на два места, једна ван куће. Теби је довољно једноставније: слике на телефону плус аутоматски у клауду. А једном годишње преузми све на рачунар. Ја сам Чика Аца, и ово је правило које те никад неће издати. Мај Фото, линк је у опису.',
    caption: `Pravilo 3-2-1, verzija za svakoga 🔐 ${LINK} ${TAGS_SAVETI}`,
  },
];
