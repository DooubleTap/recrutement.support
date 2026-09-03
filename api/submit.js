/**
 * api/submit.js — Vercel Serverless Function
 *
 * 1. Valide le token Turnstile
 * 2. Poste l'embed + boutons dans le bon canal Discord via l'API bot
 * 3. Attribue le rôle @Application en attente au joueur (douane)
 * 4. Envoie un DM au joueur (confirmation + conseil vocal)
 *
 * L'ordre compte : la candidature est postée AVANT le rôle et le DM. Le budget
 * d'exécution est de 10 s (vercel.json) et chaque appel Discord peut être
 * rate-limité ; si la fonction est tuée, on préfère perdre le DM que la
 * candidature.
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

// Limites Discord sur les embeds
const MAX_FIELD_VALUE = 1024;
const MAX_FIELDS      = 25;

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

/**
 * Discord rejette (400) tout embed dont un champ dépasse 1024 caractères.
 * Les textareas staff/dev n'ont pas de maxlength côté client, donc on tronque
 * ici plutôt que de perdre la candidature entière.
 */
function sanitizeEmbed(embed) {
  const clean = { ...embed };
  if (Array.isArray(embed.fields)) {
    clean.fields = embed.fields.slice(0, MAX_FIELDS).map(f => {
      const value = String(f.value ?? '');
      return {
        ...f,
        value: value.length > MAX_FIELD_VALUE
          ? value.slice(0, MAX_FIELD_VALUE - 14) + '… [tronqué]'
          : value,
      };
    });
  }
  return clean;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://apps.lastway.ca');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, turnstileToken, embed, discordId } = req.body ?? {};

    if (!type || !turnstileToken || !embed) {
      return res.status(400).json({ error: 'Champs manquants.' });
    }

    const channelId = CHANNELS[type];
    if (!channelId) {
      console.error('[Config] Aucun canal pour le type:', type);
      return res.status(400).json({ error: 'Type de formulaire invalide.' });
    }

    // ── Vérification Turnstile ────────────────────────────────────────────
    // `remoteip` est volontairement omis : Cloudflare exige qu'il corresponde
    // exactement à l'IP ayant résolu le challenge, or un client dual-stack
    // résout en IPv6 puis poste en IPv4 → mismatch → invalid-input-response
    // pour tout le monde. Le paramètre est optionnel.
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        secret  : TURNSTILE_SECRET,
        response: turnstileToken,
      }),
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      const codes = verifyData['error-codes'] ?? [];
      console.warn('[Turnstile] Échec:', codes);

      // Token périmé ou déjà consommé : le joueur peut se rattraper seul.
      if (codes.includes('invalid-input-response') || codes.includes('timeout-or-duplicate')) {
        return res.status(403).json({
          code : 'turnstile-expired',
          error: 'Votre vérification anti-bot a expiré. Refaites le captcha en bas du formulaire puis renvoyez — votre texte est conservé.',
        });
      }

      // Secret absent/invalide : problème de configuration, pas la faute du joueur.
      if (codes.includes('missing-input-secret') || codes.includes('invalid-input-secret')) {
        console.error('[Turnstile] TURNSTILE_SECRET absent ou invalide côté Vercel.');
        return res.status(500).json({
          error: 'Erreur de configuration du serveur. Prévenez un administrateur.',
        });
      }

      return res.status(403).json({ error: 'Vérification anti-bot échouée. Rechargez la page et réessayez.' });
    }

    const userId = /^\d{17,20}$/.test(String(discordId ?? '')) ? String(discordId) : null;

    // ── Boutons selon le type ─────────────────────────────────────────────
    const uid = userId || '0';
    let components = [];

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

    // ── Envoi de l'embed + boutons dans le canal (priorité absolue) ───────
    const discordRes = await discordAPI('POST', `/channels/${channelId}/messages`, {
      embeds    : [sanitizeEmbed(embed)],
      components: components,
    });

    if (!discordRes.ok) {
      const err = await discordRes.text();
      console.error('[Discord API] Erreur:', discordRes.status, err);
      return res.status(502).json({
        error: "Discord a refusé la candidature. Réessayez dans quelques minutes ou contactez un administrateur.",
      });
    }

    // ── Rôle @Application en attente + DM (douane seulement) ──────────────
    // Best effort : un échec ici ne doit jamais faire échouer la soumission,
    // la candidature est déjà postée.
    if (type === 'douane' && userId) {
      try {
        const roleRes = await discordAPI('PUT', `/guilds/${GUILD_ID}/members/${userId}/roles/${ROLE_ATTENTE}`);
        if (!roleRes.ok) console.warn('[Role] Échec attribution:', roleRes.status);
      } catch (e) {
        console.warn('[Role] Impossible d\'attribuer le rôle:', e.message);
      }

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

      try {
        const dmRes = await discordAPI('POST', `/users/@me/channels`, { recipient_id: userId });
        if (dmRes.ok) {
          const dmChannel = await dmRes.json();
          await discordAPI('POST', `/channels/${dmChannel.id}/messages`, { embeds: [dmEmbed] });
        } else {
          console.warn('[DM] Ouverture du canal refusée:', dmRes.status);
        }
      } catch (e) {
        console.warn('[DM] Impossible d\'envoyer le DM:', e.message);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    // Sans ce filet, une exception remonte à Vercel et le joueur reçoit une
    // page d'erreur brute (5xx) sans rien dans les logs applicatifs.
    console.error('[submit] Exception non gérée:', e);
    return res.status(500).json({ error: 'Erreur interne du serveur. Réessayez dans un instant.' });
  }
}
