/**
 * api/submit.js — Vercel Serverless Function
 *
 * 1. Valide le token Turnstile
 * 2. Attribue le rôle @Application en attente au joueur
 * 3. Envoie un DM au joueur (confirmation + conseil vocal)
 * 4. Poste l'embed + boutons dans le bon canal Discord via l'API bot
 */

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;
const BOT_TOKEN        = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID         = '1464450868601426108';

const CHANNELS = {
  douane: process.env.CHANNEL_DOUANE,
  staff : process.env.CHANNEL_STAFF,
  dev   : process.env.CHANNEL_DEV,
};

// Rôle attribué dès la soumission d'un formulaire douane
const ROLE_ATTENTE = '1464540340726792202';

// Canal vocal où le joueur est invité à se présenter
const CHANNEL_VOCAL = '1475446344452931744';

// ─── Helper : appel API Discord ──────────────────────────────────────────────
async function discordAPI(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type' : 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://discord.com/api/v10${path}`, opts);
  return res;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://apps.lastway.ca');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { type, turnstileToken, embed, discordId } = req.body;

  if (!type || !turnstileToken || !embed) {
    return res.status(400).json({ error: 'Champs manquants.' });
  }

  const channelId = CHANNELS[type];
  if (!channelId) {
    return res.status(400).json({ error: 'Type de formulaire invalide.' });
  }

  // ── Vérification Turnstile ──────────────────────────────────────────────
  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      secret  : TURNSTILE_SECRET,
      response: turnstileToken,
      remoteip: req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress,
    }),
  });

  const verifyData = await verifyRes.json();
  if (!verifyData.success) {
    console.warn('[Turnstile] Échec:', verifyData['error-codes']);
    return res.status(403).json({ error: 'Vérification anti-bot échouée. Rechargez la page et réessayez.' });
  }

  const userId = discordId || null;

  // ── Rôle @Application en attente + DM (douane seulement) ───────────────
  if (type === 'douane' && userId) {
    // Attribuer le rôle
    await discordAPI('PUT', `/guilds/${GUILD_ID}/members/${userId}/roles/${ROLE_ATTENTE}`)
      .catch(e => console.warn('[Role] Impossible d\'attribuer le rôle:', e.message));

    // DM de confirmation avec conseil vocal
    const dmEmbed = {
      color      : 0x3498db,
      title      : '📩 Formulaire de douane reçu — LastWay',
      description:
        `Hey <@${userId}> 👋\n\n` +
        `On a bien reçu ton formulaire de douane ! Notre équipe va l'analyser sous peu.\n\n` +
        `💡 **Conseil :** Te présenter dans le canal vocal <#${CHANNEL_VOCAL}> pourrait grandement **améliorer tes chances** de passer cette dernière étape et d'obtenir ton droit d'entrée en ville ! N'hésite pas à y faire un tour. 🎙️\n\n` +
        `⏳ Sois patient — un douanier te contactera dès que possible.\n\n` +
        `*— L'équipe LastWay*`,
      timestamp: new Date().toISOString(),
    };

    await discordAPI('POST', `/users/@me/channels`, { recipient_id: userId })
      .then(async r => {
        if (r.ok) {
          const dmChannel = await r.json();
          await discordAPI('POST', `/channels/${dmChannel.id}/messages`, { embeds: [dmEmbed] });
        }
      })
      .catch(e => console.warn('[DM] Impossible d\'envoyer le DM:', e.message));
  }

  // ── Boutons selon le type ───────────────────────────────────────────────
  let components = [];
  const uid = userId || '0';

  if (type === 'douane') {
    components = [{
      type      : 1,
      components: [
        { type: 2, style: 3, label: '✅ Approuver',       custom_id: `web_approve_${uid}` },
        { type: 2, style: 4, label: '❌ Rejeter',          custom_id: `web_reject_${uid}`  },
        { type: 2, style: 2, label: '🎙️ Demander vocal',  custom_id: `web_vocal_${uid}`   },
      ]
    }];
  } else if (type === 'staff') {
    components = [{
      type      : 1,
      components: [
        { type: 2, style: 3, label: '✅ Accepter', custom_id: `web_staff_approve_${uid}` },
        { type: 2, style: 4, label: '❌ Refuser',  custom_id: `web_staff_reject_${uid}`  },
      ]
    }];
  } else if (type === 'dev') {
    components = [{
      type      : 1,
      components: [
        { type: 2, style: 3, label: '✅ Accepter', custom_id: `web_dev_approve_${uid}` },
        { type: 2, style: 4, label: '❌ Refuser',  custom_id: `web_dev_reject_${uid}`  },
      ]
    }];
  }

  // ── Envoi de l'embed + boutons dans le canal ────────────────────────────
  const discordRes = await discordAPI('POST', `/channels/${channelId}/messages`, {
    embeds    : [embed],
    components: components,
  });

  if (!discordRes.ok) {
    const err = await discordRes.text();
    console.error('[Discord API] Erreur:', discordRes.status, err);
    return res.status(502).json({ error: `Erreur Discord: ${discordRes.status}` });
  }

  return res.status(200).json({ ok: true });
}