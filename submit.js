const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;

const WEBHOOKS = {
  douane: process.env.WEBHOOK_DOUANE,
  staff:  process.env.WEBHOOK_STAFF,
  dev:    process.env.WEBHOOK_DEV,
};

export default async function handler(req, res) {
  // CORS — seulement depuis apps.lastway.ca
  res.setHeader('Access-Control-Allow-Origin', 'https://apps.lastway.ca');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { type, turnstileToken, embed } = req.body;

  // ── Validation basique ──────────────────────────────────────────────────
  if (!type || !turnstileToken || !embed) {
    return res.status(400).json({ error: 'Champs manquants.' });
  }

  const webhookUrl = WEBHOOKS[type];
  if (!webhookUrl) {
    return res.status(400).json({ error: 'Type de formulaire invalide.' });
  }

  // ── Vérification Turnstile ──────────────────────────────────────────────
  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret:   TURNSTILE_SECRET,
      response: turnstileToken,
      remoteip: req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress,
    }),
  });

  const verifyData = await verifyRes.json();

  if (!verifyData.success) {
    console.warn('[Turnstile] Échec:', verifyData['error-codes']);
    return res.status(403).json({ error: 'Vérification anti-bot échouée. Rechargez la page et réessayez.' });
  }

  // ── Envoi vers Discord ──────────────────────────────────────────────────
  const discordRes = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username:   'apps.lastway.ca',
      avatar_url: 'https://r2.fivemanage.com/JslDOPFlC7vuh5WBc8xjk/lastway-white-removebg-preview.png',
      embeds:     [embed],
    }),
  });

  if (!discordRes.ok) {
    const err = await discordRes.text();
    console.error('[Discord webhook] Erreur:', discordRes.status, err);
    return res.status(502).json({ error: `Erreur Discord: ${discordRes.status}` });
  }

  return res.status(200).json({ ok: true });
}
