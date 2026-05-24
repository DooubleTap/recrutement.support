document.addEventListener('DOMContentLoaded', () => {
    const toast = document.getElementById('toast');

    // =============================================
    // TURNSTILE
    // =============================================
    let turnstileToken = null;

    window.onTurnstileSuccess = function(token) {
        turnstileToken = token;
        // Activer les cartes
        document.querySelectorAll('.choice-card').forEach(c => {
            c.classList.remove('choice-card-locked');
            c.removeAttribute('disabled');
        });
        document.getElementById('turnstileHint').textContent = '✅ Vérification réussie — choisissez votre formulaire.';
        document.getElementById('turnstileHint').style.color = '#4ade80';
    };

    window.onTurnstileExpire = function() {
        turnstileToken = null;
        document.querySelectorAll('.choice-card').forEach(c => {
            c.classList.add('choice-card-locked');
            c.setAttribute('disabled', 'disabled');
        });
        document.getElementById('turnstileHint').textContent = '⚠️ Vérification expirée — veuillez recommencer.';
        document.getElementById('turnstileHint').style.color = '#f39c12';
    };

    // Bloquer les cartes au chargement (avant Turnstile)
    document.querySelectorAll('.choice-card').forEach(c => {
        c.classList.add('choice-card-locked');
        c.setAttribute('disabled', 'disabled');
    });

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
    // WEBHOOKS
    // =============================================
    const WEBHOOK_DOUANE = "https://discord.com/api/webhooks/1487984543234523146/sklJDcW8UN-ivkoWFDmLqMPl_AlekKMNlQNkI8ZVRyhl_vLTjH5JnyDDufwtc1t-c0_U";
    const WEBHOOK_STAFF  = "https://discord.com/api/webhooks/1476521529146609815/0xzWZp25v6lvDutPiJ03_zWX616oZXzAVrLVj0sUQ5-4dMrZwAqAqel0lmM_ZgAXV3_O";
    const WEBHOOK_DEV    = "https://discord.com/api/webhooks/1476521529146609815/0xzWZp25v6lvDutPiJ03_zWX616oZXzAVrLVj0sUQ5-4dMrZwAqAqel0lmM_ZgAXV3_O";

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

        await submitToDiscord(WEBHOOK_DOUANE, embed, btn, "ENVOYER LE FORMULAIRE DE DOUANE", document.getElementById('douaneForm'), discord);
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

        await submitToDiscord(WEBHOOK_STAFF, embed, btn, "ENVOYER LA CANDIDATURE STAFF", document.getElementById('staffForm'), discord);
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

        await submitToDiscord(WEBHOOK_DEV, embed, btn, "ENVOYER LA CANDIDATURE DEV", document.getElementById('devForm'), discord);
    }

    // =============================================
    // HELPER — Envoi Discord
    // =============================================
    async function submitToDiscord(webhookUrl, embed, btn, originalLabel, form, discordId = null) {
        // Extraire le type depuis l'URL du webhook (on passe maintenant par /api/submit)
        const typeMap = {
            [WEBHOOK_DOUANE]: 'douane',
            [WEBHOOK_STAFF]:  'staff',
            [WEBHOOK_DEV]:    'dev',
        };
        const type = typeMap[webhookUrl] || 'douane';

        if (!turnstileToken) {
            alert('⚠️ Vérification anti-bot manquante. Retournez à l\'accueil et complétez le widget.');
            btn.disabled = false;
            btn.querySelector('span').textContent = originalLabel;
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
                // Reset Turnstile (token usage unique)
                turnstileToken = null;
                if (window.turnstile) window.turnstile.reset();
                document.querySelectorAll('.choice-card').forEach(c => {
                    c.classList.add('choice-card-locked');
                    c.setAttribute('disabled', 'disabled');
                });
                document.getElementById('turnstileHint').textContent = 'Complétez la vérification ci-dessus pour accéder aux formulaires.';
                document.getElementById('turnstileHint').style.color = '';
                showLanding();
                // Reset custom selects
                const trigger = form.querySelector('.select-trigger span');
                if (trigger) trigger.textContent = 'Sélectionnez une option';
                const hidden  = form.querySelector('input[type="hidden"]');
                if (hidden) hidden.value = '';
            } else {
                alert("Erreur Discord : " + response.status);
            }
        } catch (error) {
            console.error(error);
            alert("Erreur d'envoi : " + error.message);
        } finally {
            btn.disabled = false;
            btn.querySelector('span').textContent = originalLabel;
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