/**
 * api/submit.js — Vercel Serverless Function
 *
 * 1. Valide le token Turnstile
 * 2. Vérifie via l'API Discord si le candidat a les bons rôles
 *    - Douane  : bloqué si déjà @Citoyen
 *    - Staff   : bloqué si pas @Citoyen
 *    - Dev     : bloqué si pas @Citoyen
 * 3. Attribue @Application en attente (douane seulement)
 * 4. Envoie un DM au joueur
 * 5. Poste l'embed + boutons dans le bon canal
 */

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;
const BOT_TOKEN        = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID         = '1464450868601426108';

const CHANNELS = {
  douane: process.env.CHANNEL_DOUANE,
  staff : process.env.CHANNEL_STAFF,
  dev   : process.env.CHANNEL_DEV,
};

const ROLE_ATTENTE  = '1464540340726792202'; // @Application en attente
const ROLE_CITOYEN  = '1464540418929721344'; // @Citoyen
const CHANNEL_VOCAL_DOUANE = '1475446344452931744';
const VOTE_DURATION_H      = 168; // 7 jours en heures

async function discordAPI(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`https://discord.com/api/v10${path}`, opts);
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
    return res.status(403).json({ error: 'Vérification anti-bot échouée. Rechargez la page et réessayez.' });
  }

  // ── Vérification des rôles Discord ─────────────────────────────────────
  if (discordId) {
    const memberRes = await discordAPI('GET', `/guilds/${GUILD_ID}/members/${discordId}`);

    if (memberRes.ok) {
      const memberData = await memberRes.json();
      const roles      = memberData.roles || [];

      const isCitoyen = roles.includes(ROLE_CITOYEN);

      // Douane : bloqué si déjà citoyen
      if (type === 'douane' && isCitoyen) {
        return res.status(403).json({
          error: 'Tu es déjà Citoyen sur le serveur ! Le formulaire de douane est réservé aux nouveaux arrivants.'
        });
      }

      // Staff / Dev : réservé aux citoyens
      if ((type === 'staff' || type === 'dev') && !isCitoyen) {
        return res.status(403).json({
          error: 'Tu dois être @Citoyen sur le serveur LastWay pour postuler à ce poste. Complète d\'abord la douane !'
        });
      }
    }
    // Si l'API échoue (membre pas trouvé), on laisse passer — le bot gèrera
  }

  const uid = discordId || '0';

  // ── Rôle @Application en attente + DM (douane) ─────────────────────────
  if (type === 'douane' && discordId) {
    await discordAPI('PUT', `/guilds/${GUILD_ID}/members/${discordId}/roles/${ROLE_ATTENTE}`)
      .catch(() => {});

    // DM confirmation douane
    const dmEmbed = {
      color      : 0x3498db,
      title      : '📩 Formulaire de douane reçu — LastWay',
      description:
        `Hey <@${uid}> 👋\n\n` +
        `On a bien reçu ton formulaire de douane ! Notre équipe va l'analyser sous peu.\n\n` +
        `💡 **Conseil :** Te présenter dans le canal vocal <#${CHANNEL_VOCAL_DOUANE}> pourrait grandement **améliorer tes chances** de passer cette dernière étape ! N'hésite pas à y faire un tour. 🎙️\n\n` +
        `⏳ Sois patient — un douanier te contactera dès que possible.\n\n` +
        `*— L'équipe LastWay*`,
      timestamp: new Date().toISOString(),
    };

    const dmChannelRes = await discordAPI('POST', '/users/@me/channels', { recipient_id: discordId });
    if (dmChannelRes.ok) {
      const dmChannel = await dmChannelRes.json();
      await discordAPI('POST', `/channels/${dmChannel.id}/messages`, { embeds: [dmEmbed] });
    }
  }

  // ── DM confirmation staff/dev ───────────────────────────────────────────
  if ((type === 'staff' || type === 'dev') && discordId) {
    const typeLabel = type === 'staff' ? 'Staff' : 'Dev';
    const dmEmbed = {
      color      : type === 'staff' ? 0x3066993 : 0x5793266,
      title      : `📩 Candidature ${typeLabel} reçue — LastWay`,
      description:
        `Hey <@${uid}> 👋\n\n` +
        `On a bien reçu ta candidature **${typeLabel}** !\n\n` +
        `🗳️ **Comment ça fonctionne :**\n` +
        `L'ensemble du staff va voter **anonymement** sur ta candidature. Pour qu'elle soit acceptée, le vote doit être **unanimement positif**.\n\n` +
        `⏳ **Délai :** Le vote est ouvert pendant **7 jours** afin de donner la chance à tous les membres de se prononcer.\n\n` +
        `Tu seras contacté dès que le vote sera clôturé. Sois patient !\n\n` +
        `*— L'équipe LastWay*`,
      timestamp: new Date().toISOString(),
    };

    const dmChannelRes = await discordAPI('POST', '/users/@me/channels', { recipient_id: discordId });
    if (dmChannelRes.ok) {
      const dmChannel = await dmChannelRes.json();
      await discordAPI('POST', `/channels/${dmChannel.id}/messages`, { embeds: [dmEmbed] });
    }
  }

  // ── Boutons selon le type ───────────────────────────────────────────────
  // Pour staff/dev : les boutons de vote seront ajoutés par le bot après
  // avoir reçu le messageId — on envoie sans boutons, le bot les ajoute via
  // un webhook de confirmation. On utilise un placeholder qu'on remplace.
  // Approche simplifiée : on envoie avec les boutons de vote directement.
  // Le messageId n'est connu qu'après l'envoi, donc on édite après.

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
  }
  // Staff/Dev : pas de boutons encore — on les ajoute après avoir le messageId

  // ── Envoi de l'embed dans le canal ─────────────────────────────────────
  const discordRes = await discordAPI('POST', `/channels/${channelId}/messages`, {
    embeds    : [embed],
    components: components,
  });

  if (!discordRes.ok) {
    const err = await discordRes.text();
    console.error('[Discord API] Erreur:', discordRes.status, err);
    return res.status(502).json({ error: `Erreur Discord: ${discordRes.status}` });
  }

  const sentMessage = await discordRes.json();
  const messageId   = sentMessage.id;

  // ── Pour staff/dev : ajouter les boutons de vote maintenant qu'on a le messageId ──
  if ((type === 'staff' || type === 'dev') && messageId) {
    const voteComponents = [{
      type      : 1,
      components: [
        { type: 2, style: 3, label: '✅ Pour',    custom_id: `web_vote_yes_${messageId}` },
        { type: 2, style: 4, label: '❌ Contre',  custom_id: `web_vote_no_${messageId}`  },
      ]
    }];

    // Éditer le message pour ajouter les boutons
    await discordAPI('PATCH', `/channels/${channelId}/messages/${messageId}`, {
      components: voteComponents,
    });

    // Envoyer les infos du vote au bot via le canal (message épinglé invisible)
    // On encode les métadonnées dans un message séparé que le bot va lire
    const metaMsg = {
      content: `__VOTE_META__${JSON.stringify({
        messageId,
        channelId,
        userId : uid,
        type,
        endsAt : Date.now() + (7 * 24 * 60 * 60 * 1000),
      })}__END__`,
      flags: 64, // ephemeral n'existe pas pour les messages normaux, on supprime après
    };

    // Stocker via un message dans un canal de log (le bot va le parser au démarrage)
    // Alternative plus propre : le bot écoute MESSAGE_CREATE et parse les VOTE_META
    const logChannelId = process.env.CHANNEL_VOTE_LOG || channelId;
    await discordAPI('POST', `/channels/${logChannelId}/messages`, metaMsg);
  }

  return res.status(200).json({ ok: true, messageId });
}