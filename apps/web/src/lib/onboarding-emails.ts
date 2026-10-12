import { db } from '@/lib/firebase-admin';
import { renderEmail, sendEmail } from '@/lib/email';
import { unsubscribeToken } from '@/lib/storage-nudge';

/**
 * Welcome series for new accounts, sent by the daily cron:
 *   day 1: turn on backup (or, if backup already runs, what else is there)
 *   day 3: make your first sticker / meme
 *   day 7: invite a friend, both sides benefit (+250 MB for the inviter)
 * Each step goes out once, only inside its one-day window (a cron that
 * missed a day does not send stale steps), and not to opted-out users.
 */

const DAY = 24 * 60 * 60 * 1000;
const STEPS = [1, 3, 7] as const;
type Step = (typeof STEPS)[number];

function origin() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://myphotomy.space';
}

function stepEmail(step: Step, u: Record<string, any>, unsubscribeUrl: string) {
  const o = origin();
  const name = (u.displayName && u.displayName !== 'User' ? String(u.displayName).split(' ')[0] : '') || '';
  const hi = name ? `Zdravo ${name}!` : 'Zdravo!';
  const hiEn = name ? `Hi ${name}!` : 'Hi!';

  if (step === 1) {
    const started = (Number(u.storageUsed) || 0) > 0;
    return started
      ? {
          subject: 'Backup radi. Evo šta još možeš · Your backup is running',
          ...renderEmail({
            paragraphs: [
              `${hi} Tvoje slike se već čuvaju u MyPhoto cloudu. Ako ti se telefon izgubi ili pokvari, sve je na sigurnom.`,
              'Probaj i ovo: od bilo koje slike napravi stiker ili mim za 10 sekundi i pošalji ga na Viber ili WhatsApp.',
              `${hiEn} Your photos are already backed up to MyPhoto. Try this too: turn any photo into a sticker or meme in 10 seconds.`,
            ],
            ctaLabel: 'Napravi stiker · Make a sticker',
            ctaUrl: `${o}/meme-creator`,
            unsubscribeUrl,
          }),
        }
      : {
          subject: 'Uključi backup slika (1 minut) · Turn on your photo backup',
          ...renderEmail({
            paragraphs: [
              `${hi} Napravio si MyPhoto nalog, ali slike se još ne čuvaju. Imaš 1 GB besplatno.`,
              'Instaliraj aplikaciju na telefon, prijavi se istim nalogom i uključi Backup. Od tada se svaka nova slika sama čuva u cloudu.',
              `${hiEn} Your MyPhoto account is ready but nothing is backed up yet. Install the app, sign in with the same account and turn on Backup. You have 1 GB free.`,
            ],
            ctaLabel: 'Preuzmi aplikaciju · Get the app',
            ctaUrl: `${o}/download`,
            unsubscribeUrl,
          }),
        };
  }

  if (step === 3) {
    return {
      subject: 'Napravi svoj prvi mim · Make your first meme',
      ...renderEmail({
        paragraphs: [
          `${hi} Znaš li da od svoje slike možeš da napraviš stiker bez pozadine ili mim sa tekstom? Traje 10 sekundi.`,
          'Najbolji mimovi idu na Meme Wall, gde ih vide i lajkuju drugi. Kad neko preko tvog mima napravi nalog, ti dobijaš 250 MB više prostora.',
          `${hiEn} Turn any photo into a sticker or a meme in 10 seconds. Post it on the Meme Wall; when someone signs up through your meme, you get 250 MB more storage.`,
        ],
        ctaLabel: 'Otvori Meme Wall · Open the Meme Wall',
        ctaUrl: `${o}/meme-wall`,
        unsubscribeUrl,
      }),
    };
  }

  const link = u.referralCode ? `${o}/?ref=${encodeURIComponent(u.referralCode)}` : `${o}/`;
  return {
    subject: 'Pozovi prijatelja, dobij 250 MB · Invite a friend, get 250 MB',
    ...renderEmail({
      paragraphs: [
        `${hi} Za svakog prijatelja koji napravi nalog preko tvog linka i sačuva prvih 100 MB, dobijaš 250 MB više prostora, do ukupno 2,5 GB besplatno.`,
        `Tvoj link: ${link}`,
        'Pošalji ga na Viber, WhatsApp ili Instagram. Ili samo podeli neki svoj mim, link je već u njemu.',
        `${hiEn} For every friend who signs up through your link and backs up their first 100 MB, you get 250 MB more, up to 2.5 GB free. Your link: ${link}`,
      ],
      ctaLabel: 'Moj link za poziv · My invite link',
      ctaUrl: link,
      unsubscribeUrl,
    }),
  };
}

/** Daily: send each new user the welcome step that is due today. */
export async function sendOnboardingEmails(): Promise<Record<string, number>> {
  const now = Date.now();
  const summary: Record<string, number> = {};
  const snap = await db
    .collection('users')
    .where('createdAt', '>=', new Date(now - (STEPS[STEPS.length - 1] + 1) * DAY))
    .where('createdAt', '<', new Date(now - STEPS[0] * DAY))
    .get();

  for (const doc of snap.docs) {
    const u = doc.data();
    if (!u.email || u.storageEmailsOptOut) continue;
    const ageDays = (now - (u.createdAt?.toMillis?.() ?? now)) / DAY;
    const step = STEPS.find((s) => ageDays >= s && ageDays < s + 1);
    const sent: number[] = Array.isArray(u.onboardingEmailsSent) ? u.onboardingEmailsSent : [];
    if (!step || sent.includes(step)) continue;
    const token = unsubscribeToken(doc.id);
    if (!token) continue;

    const unsubscribeUrl = `${origin()}/api/email/unsubscribe?u=${encodeURIComponent(doc.id)}&t=${token}`;
    const mail = stepEmail(step, u, unsubscribeUrl);
    const ok = await sendEmail({
      to: u.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
    if (ok) await doc.ref.update({ onboardingEmailsSent: [...sent, step] });
    const key = `welcome-d${step}-${ok ? 'sent' : 'failed'}`;
    summary[key] = (summary[key] || 0) + 1;
  }
  return summary;
}
