/**
 * Transactional email via Brevo's REST API — plain fetch, no SDK, so
 * nothing new lands in node_modules (Dropbox locks it on install).
 *
 * Env:
 *   BREVO_API_KEY  xkeysib-…  (brevo.com → SMTP & API → API keys; first add
 *                  and authenticate myphotomy.space under Senders & Domains)
 *   EMAIL_FROM     optional, defaults to "MyPhoto <noreply@myphotomy.space>"
 *
 * Returns false (never throws) when email is not configured or the send
 * fails, so callers can decide whether a missing email must block an action.
 */

export function emailIsConfigured(): boolean {
  return !!process.env.BREVO_API_KEY;
}

/** "Name <addr@x>" or "addr@x" → Brevo sender object. */
function parseSender(from: string): { name?: string; email: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || undefined, email: m[2] } : { email: from.trim() };
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.warn('sendEmail skipped: BREVO_API_KEY is not set', params.subject);
    return false;
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: parseSender(process.env.EMAIL_FROM || 'MyPhoto <noreply@myphotomy.space>'),
        to: [{ email: params.to }],
        replyTo: { email: 'support@myphotomy.space' },
        subject: params.subject,
        htmlContent: params.html,
        textContent: params.text,
      }),
    });
    if (!res.ok) {
      console.error('sendEmail failed', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (e) {
    console.error('sendEmail error', e);
    return false;
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Minimal branded layout: paragraphs plus one call-to-action button. */
export function renderEmail(opts: { paragraphs: string[]; ctaLabel: string; ctaUrl: string }): {
  html: string;
  text: string;
} {
  const body = opts.paragraphs.map((p) => `<p style="margin:0 0 14px">${escapeHtml(p)}</p>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="font-size:20px;font-weight:bold;color:#0ea5e9;margin:0 0 18px">MyPhoto</p>
<div style="background:#ffffff;border-radius:12px;padding:24px;font-size:15px;line-height:1.5">${body}
<p style="margin:22px 0 0"><a href="${escapeHtml(opts.ctaUrl)}" style="background:#0ea5e9;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:bold">${escapeHtml(opts.ctaLabel)}</a></p>
</div>
<p style="font-size:12px;color:#64748b;margin:16px 0 0">MyPhoto · myphotomy.space · support@myphotomy.space</p>
</div></body></html>`;
  const text = `${opts.paragraphs.join('\n\n')}\n\n${opts.ctaLabel}: ${opts.ctaUrl}\n\n— MyPhoto · myphotomy.space`;
  return { html, text };
}
