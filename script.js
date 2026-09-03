// api.js est chargé en async/defer : son callback onload peut arriver avant ou
// après DOMContentLoaded. On expose donc le callback immédiatement, et le reste
// du script attend cette promesse avant de toucher à window.turnstile.
let resolveTurnstileReady;
const turnstileReady = new Promise(resolve => { resolveTurnstileReady = resolve; });
window.onTurnstileLoad = () => resolveTurnstileReady();

document.addEventListener('DOMContentLoaded', () => {
    const toast = document.getElementById('toast');

    // =============================================
    // TURNSTILE
    // =============================================
    const TURNSTILE_SITEKEY = '0x4AAAAAACx5PJv1lgysPTdQ';

    // Un token Cloudflare vit 300 s. On le renouvelle au-delà de 240 s pour
    // garder une marge sur la latence réseau et l'horloge du client.
    const TOKEN_MAX_AGE_MS = 240000;

    // Un widget par formulaire, rendu à l'ouverture de celui-ci. Turnstile ne
    // peut ni s'afficher ni renouveler son token dans un conteneur masqué,
    // d'où le rendu explicite plutôt que trois .cf-turnstile en auto-render.
    const widgets = {};   // type -> { id, token, issuedAt, waiters }

    function setHint(type, text, color) {
        const el = document.getElementById('turnstileHint_' + type);
        if (!el) return;
        el.textContent = text;
        el.style.color = color || '';
    }

    async function renderTurnstile(type) {
        await turnstileReady;

        const existing = widgets[type];
        if (existing) {
            // Déjà en place : on repart d'un token neuf à chaque ouverture.
            existing.token    = null;
            existing.issuedAt = 0;
            window.turnstile.reset(existing.id);
            return;
        }

        const w = widgets[type] = { id: null, token: null, issuedAt: 0, waiters: [] };

        w.id = window.turnstile.render('#turnstile_' + type, {
            sitekey : TURNSTILE_SITEKEY,
            theme   : 'dark',
            callback: (token) => {
                w.token    = token;
                w.issuedAt = Date.now();
                setHint(type, '✅ Vérification réussie.', '#4ade80');
                w.waiters.splice(0).forEach(resolve => resolve(token));
            },
            'expired-callback': () => {
                w.token = null;
                setHint(type, '⚠️ Vérification expirée — renouvellement en cours...', '#f39c12');
            },
            'error-callback': () => {
                w.token = null;
                setHint(type, '❌ Échec de la vérification. Rechargez la page.', '#e74c3c');
                w.waiters.splice(0).forEach(resolve => resolve(null));
            },
        });
    }

    /**
     * Renvoie un token utilisable, ou null si le joueur doit agir.
     * Au-delà de TOKEN_MAX_AGE_MS on force un reset et on attend le nouveau
     * token plutôt que d'envoyer un token périmé que /api/submit rejettera.
     */
    function getFreshToken(type) {
        const w = widgets[type];
        if (!w) return Promise.resolve(null);

        if (w.token && Date.now() - w.issuedAt < TOKEN_MAX_AGE_MS) {
            return Promise.resolve(w.token);
        }

        w.token = null;
        setHint(type, '⏳ Renouvellement de la vérification...', '#f39c12');
        window.turnstile.reset(w.id);

        return new Promise(resolve => {
            w.waiters.push(resolve);
            // Si Cloudflare exige une interaction, on rend la main au joueur.
            setTimeout(() => {
                const i = w.waiters.indexOf(resolve);
                if (i !== -1) {
                    w.waiters.splice(i, 1);
                    resolve(null);
                }
            }, 20000);
        });
    }

    // =============================================
    // NAVIGATION
    // =============================================
    window.showForm = function(type) {
        document.getElementById('landingPage').classList.add('hidden');
        document.getElementById('douaneForm').classList.add('hidden');
        document.getElementById('staffForm').classList.add('hidden');
        document.getElementById('devForm').classList.add('hidden');

        if (type === 'douane') {
            document.getElementById('douaneForm').classList.remove('hidden');
            document.getElementById('pageSubtitle').textContent = 'Formulaire de Douane';
        } else if (type === 'staff') {
            document.getElementById('staffForm').classList.remove('hidden');
            document.getElementById('pageSubtitle').textContent = 'Application Staff';
        } else if (type === 'dev') {
            document.getElementById('devForm').classList.remove('hidden');
            document.getElementById('pageSubtitle').textContent = 'Application Dev';
        }

        // Le widget n'est rendu qu'une fois son conteneur visible.
        renderTurnstile(type);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.showLanding = function() {
        document.getElementById('douaneForm').classList.add('hidden');
        document.getElementById('staffForm').classList.add('hidden');
        document.getElementById('devForm').classList.add('hidden');
        document.getElementById('landingPage').classList.remove('hidden');
        document.getElementById('pageSubtitle').textContent = 'Recrutement LastWay';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // =============================================
    // COMPTEURS DE CARACTÈRES
    // =============================================
    function initCharCounters() {
        document.querySelectorAll('textarea[data-min]').forEach(ta => {
            const id      = ta.id;
            const max     = parseInt(ta.dataset.max);
            const min     = parseInt(ta.dataset.min);
            const counter = document.getElementById(id + '_count');
            const fill    = document.getElementById(id + '_fill');

            if (!counter || !fill) return;

            function updateCounter() {
                // Tronquer AVANT de lire la longueur (couvre paste, drag-drop, etc.)
                if (ta.value.length > max) {
                    const pos = ta.selectionStart;
                    ta.value = ta.value.slice(0, max);
                    ta.selectionStart = ta.selectionEnd = Math.min(pos, max);
                }
                const len = ta.value.length;
                const remaining = max - len;
                counter.textContent = `${len} / ${max}`;

                // Couleur du compteur selon proximité du max
                if (remaining <= 0) {
                    counter.style.color = '#e74c3c';
                } else if (remaining <= 20) {
                    counter.style.color = '#f39c12';
                } else if (len < min) {
                    counter.style.color = '#e74c3c';
                } else {
                    counter.style.color = '#4ade80';
                }

                // Barre de progression
                const pct = Math.min((len / max) * 100, 100);
                fill.style.width = pct + '%';
                if (len < min) {
                    fill.style.background = '#e74c3c';
                } else if (remaining <= 20) {
                    fill.style.background = '#f39c12';
                } else {
                    fill.style.background = '#3a7d44';
                }
            }

            ta.addEventListener('input',     updateCounter);
            ta.addEventListener('paste',     () => setTimeout(updateCounter, 0));
            ta.addEventListener('drop',      () => setTimeout(updateCounter, 0));
            ta.addEventListener('keydown',   updateCounter);
        });
    }
    initCharCounters();

    // =============================================
    // CUSTOM SELECT — DEV FORM
    // =============================================
    const devGithubSelect = document.getElementById('devGithubSelect');
    if (devGithubSelect) {
        const trigger       = devGithubSelect.querySelector('.select-trigger');
        const devGithubInput = document.getElementById('devGithubInput');

        trigger.addEventListener('click', () => devGithubSelect.classList.toggle('active'));

        devGithubSelect.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', () => {
                trigger.querySelector('span').textContent = option.textContent;
                devGithubInput.value = option.dataset.value;
                devGithubSelect.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                devGithubSelect.classList.remove('active');
            });
        });

        document.addEventListener('click', (e) => {
            if (!devGithubSelect.contains(e.target)) devGithubSelect.classList.remove('active');
        });
    }

    // =============================================
    // PARTICLE SYSTEM — désactivé (canvas retiré)
    // =============================================

    // =============================================
    // VALIDATION CHAR MIN
    // =============================================
    function validateMinChars(form) {
        const textareas = form.querySelectorAll('textarea[data-min]');
        for (const ta of textareas) {
            const min = parseInt(ta.dataset.min);
            if (ta.value.trim().length < min) {
                const label = form.querySelector(`label[for="${ta.id}"]`);
                const name  = label ? label.childNodes[0].textContent.trim() : ta.id;
                alert(`⚠️ Le champ "${name}" requiert un minimum de ${min} caractères.\n\nActuellement : ${ta.value.trim().length} caractère(s).`);
                ta.focus();
                return false;
            }
        }
        return true;
    }

    // =============================================
    // ENVOI — DOUANE
    // =============================================
    async function sendDouaneApplication() {
        const discord = document.getElementById('douane_discord').value.trim();
        const age     = document.getElementById('douane_age').value.trim();
        const connu   = document.getElementById('douane_connu').value.trim();
        const xp      = document.getElementById('douane_xp').value.trim();
        const regles  = document.getElementById('douane_regles').value.trim();
        const perso   = document.getElementById('douane_perso').value.trim();
        const buts    = document.getElementById('douane_buts').value.trim();
        const confirm = document.getElementById('douane_confirm').checked;
        const btn     = document.getElementById('douaneSubmitBtn');

        if (!discord || !age || !connu || !xp || !regles || !perso || !buts) {
            alert("⚠️ Veuillez remplir tous les champs du formulaire.");
            return;
        }

        if (!validateMinChars(document.getElementById('douaneForm'))) return;

        if (!confirm) {
            alert("⚠️ Vous devez cocher la case de confirmation avant d'envoyer.");
            return;
        }

        btn.disabled = true;
        btn.querySelector('span').textContent = 'ENVOI EN COURS...';

        const embed = {
            color : 16753920, // Orange
            fields: [
                { name: "👤 Identité",                        value: `**ID Discord:** <@${discord}>\n**Âge:** ${age} ans`,       inline: false },
                { name: "📢 Comment a connu le serveur",      value: connu,                                                       inline: false },
                { name: "🎭 Expérience RP",                   value: xp,                                                          inline: false },
                { name: "📖 PowerGaming & MetaGaming",        value: regles,                                                      inline: false },
                { name: "🧬 Histoire du personnage",           value: perso,                                                       inline: false },
                { name: "🎯 Buts en ville (court/long terme)", value: buts,                                                        inline: false },
                { name: "✅ Confirmation",                    value: "Le joueur confirme ne pas pinger le staff.",                inline: true  }
            ],
            footer: { text: `ID Discord: ${discord}` },
            timestamp: new Date().toISOString()
        };

        await submitToDiscord('douane', embed, btn, "ENVOYER LE FORMULAIRE DE DOUANE", document.getElementById('douaneForm'), discord);
    }

    // =============================================
    // ENVOI — STAFF
    // =============================================
    async function sendStaffApplication() {
        const discord       = document.getElementById('staff_discord').value.trim();
        const age           = document.getElementById('staff_age').value.trim();
        const experience    = document.getElementById('staff_experience').value.trim();
        const pedagogie     = document.getElementById('staff_pedagogie').value.trim();
        const conflict      = document.getElementById('staff_conflict').value.trim();
        const disponibilite = document.getElementById('staff_disponibilite').value.trim();
        const motivations   = document.getElementById('staff_motivations').value.trim();
        const confirm       = document.getElementById('staff_confirm').checked;
        const btn           = document.getElementById('staffSubmitBtn');

        if (!discord || !age || !experience || !pedagogie || !conflict || !disponibilite || !motivations) {
            alert("⚠️ Veuillez remplir tous les champs du formulaire.");
            return;
        }
        if (!confirm) {
            alert("⚠️ Veuillez cocher la case de confirmation avant d'envoyer.");
            return;
        }

        btn.disabled = true;
        btn.querySelector('span').textContent = 'ENVOI EN COURS...';

        const embed = {
            title : "📋 Nouvelle Candidature STAFF — LastWay",
            color : 3066993,
            fields: [
                { name: "👤 Identité",         value: `**ID Discord:** <@${discord}>\n**Âge:** ${age} ans`, inline: false },
                { name: "🏆 Expérience Staff", value: experience,                                            inline: false },
                { name: "📚 Pédagogie",        value: pedagogie,                                             inline: false },
                { name: "⚡ Gestion conflits", value: conflict,                                              inline: false },
                { name: "🕐 Disponibilités",   value: disponibilite,                                         inline: true  },
                { name: "🎯 Motivations",      value: motivations,                                           inline: false },
                { name: "⚖️ Confirmation",     value: "✅ Accepté",                                          inline: true  }
            ]
        };

        await submitToDiscord('staff', embed, btn, "ENVOYER LA CANDIDATURE STAFF", document.getElementById('staffForm'), discord);
    }

    // =============================================
    // ENVOI — DEV
    // =============================================
    async function sendDevApplication() {
        const discord     = document.getElementById('dev_discord').value.trim();
        const age         = document.getElementById('dev_age').value.trim();
        const frameworks  = document.getElementById('dev_frameworks').value.trim();
        const sql         = document.getElementById('dev_sql').value.trim();
        const devExp      = document.getElementById('dev_devExp').value.trim();
        const scripts     = document.getElementById('dev_scripts').value.trim();
        const aiUsage     = document.getElementById('dev_aiUsage').value.trim();
        const githubVal   = document.getElementById('devGithubInput').value;
        const motivations = document.getElementById('dev_motivations').value.trim();
        const confirm     = document.getElementById('dev_confirm').checked;
        const btn         = document.getElementById('devSubmitBtn');

        if (!discord || !age || !frameworks || !sql || !devExp || !scripts || !aiUsage || !motivations) {
            alert("⚠️ Veuillez remplir tous les champs du formulaire.");
            return;
        }
        if (!githubVal) {
            alert("⚠️ Veuillez sélectionner votre niveau de maîtrise GitHub.");
            return;
        }
        if (!confirm) {
            alert("⚠️ Veuillez cocher la case de confirmation avant d'envoyer.");
            return;
        }

        btn.disabled = true;
        btn.querySelector('span').textContent = 'ENVOI EN COURS...';

        const embed = {
            title : "💻 Nouvelle Candidature DEV — LastWay",
            color : 5793266,
            fields: [
                { name: "👤 Identité",        value: `**ID Discord:** <@${discord}>\n**Âge:** ${age} ans`, inline: false },
                { name: "💻 Frameworks",      value: frameworks,                                             inline: false },
                { name: "🗄️ SQL / DB",        value: sql,                                                   inline: false },
                { name: "🛠️ Expérience Dev",  value: devExp,                                                inline: false },
                { name: "📦 Scripts créés",   value: scripts,                                               inline: false },
                { name: "🤖 Utilisation IA",  value: aiUsage,                                               inline: false },
                { name: "🐙 GitHub",          value: githubVal,                                             inline: true  },
                { name: "🎯 Motivations",     value: motivations,                                           inline: false },
                { name: "⚖️ Confirmation",    value: "✅ Accepté",                                          inline: true  }
            ]
        };

        await submitToDiscord('dev', embed, btn, "ENVOYER LA CANDIDATURE DEV", document.getElementById('devForm'), discord);
    }

    // =============================================
    // HELPER — Envoi Discord
    // =============================================
    async function submitToDiscord(type, embed, btn, originalLabel, form, discordId = null) {
        const restoreBtn = () => {
            btn.disabled = false;
            btn.querySelector('span').textContent = originalLabel;
        };

        const turnstileToken = await getFreshToken(type);
        if (!turnstileToken) {
            alert('⚠️ Complétez la vérification anti-bot en bas du formulaire, puis renvoyez.\n\nVotre texte est conservé.');
            restoreBtn();
            return;
        }

        try {
            const response = await fetch('/api/submit', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ type, turnstileToken, embed, discordId })
            });

            if (response.ok) {
                showToast('Votre formulaire a été envoyé avec succès !');
                form.reset();
                // Reset compteurs
                form.querySelectorAll('.char-counter').forEach(c => {
                    const ta  = document.getElementById(c.id.replace('_count', ''));
                    const max = ta ? ta.dataset.max : '?';
                    c.textContent = `0 / ${max}`;
                    c.style.color = '';
                });
                form.querySelectorAll('.char-fill').forEach(f => { f.style.width = '0%'; });
                // Un token Turnstile est à usage unique.
                const w = widgets[type];
                if (w) {
                    w.token    = null;
                    w.issuedAt = 0;
                    window.turnstile.reset(w.id);
                }
                setHint(type, 'Complétez la vérification avant d\'envoyer.', '');
                showLanding();
                // Reset custom selects
                const trigger = form.querySelector('.select-trigger span');
                if (trigger) trigger.textContent = 'Sélectionnez une option';
                const hidden  = form.querySelector('input[type="hidden"]');
                if (hidden) hidden.value = '';
            } else {
                // Ce statut vient de /api/submit (Vercel), pas de Discord.
                const data = await response.json().catch(() => ({}));
                alert(data.error || `Envoi refusé par le serveur (code ${response.status}). Réessayez dans un instant.`);

                if (data.code === 'turnstile-expired') {
                    const w = widgets[type];
                    if (w) {
                        w.token    = null;
                        w.issuedAt = 0;
                        window.turnstile.reset(w.id);
                    }
                }
            }
        } catch (error) {
            console.error(error);
            alert("Impossible de contacter le serveur : " + error.message + "\n\nVérifiez votre connexion et réessayez.");
        } finally {
            restoreBtn();
        }
    }

    // =============================================
    // TOAST
    // =============================================
    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className   = `toast ${type}`;
        setTimeout(() => { toast.className = 'toast hidden'; }, 5000);
    }

    // =============================================
    // CLICK HANDLERS
    // =============================================
    document.getElementById('douaneSubmitBtn').addEventListener('click', sendDouaneApplication);
    document.getElementById('staffSubmitBtn').addEventListener('click', sendStaffApplication);
    document.getElementById('devSubmitBtn').addEventListener('click', sendDevApplication);
});