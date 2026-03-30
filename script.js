document.addEventListener('DOMContentLoaded', () => {
    const toast = document.getElementById('toast');

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

            ta.addEventListener('input', () => {
                const len = ta.value.length;
                counter.textContent = `${len} / ${max}`;

                // Barre de progression
                const pct = Math.min((len / max) * 100, 100);
                fill.style.width = pct + '%';

                // Couleur selon si le minimum est atteint
                if (len < min) {
                    fill.style.background = '#e74c3c';
                    counter.style.color = '#e74c3c';
                } else {
                    fill.style.background = '#3a7d44';
                    counter.style.color = '#4ade80';
                }

                // Limite max
                if (len >= max) {
                    ta.value = ta.value.slice(0, max);
                }
            });
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
    // PARTICLE SYSTEM
    // =============================================
    const canvas = document.getElementById('particleCanvas');
    const ctx    = canvas.getContext('2d');
    let particlesArray = [];
    let mouse = { x: null, y: null, radius: 150 };

    window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });

    class Particle {
        constructor() {
            this.x = this.baseX = Math.random() * canvas.width;
            this.y = this.baseY = Math.random() * canvas.height;
            this.size    = Math.random() * 2 + 0.5;
            this.density = Math.random() * 30 + 1;
            this.color   = '#fdfdfd';
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }
        update() {
            const dx = mouse.x - this.x, dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const force = (mouse.radius - dist) / mouse.radius;
            if (dist < mouse.radius) {
                this.x -= (dx / dist) * force * this.density;
                this.y -= (dy / dist) * force * this.density;
            } else {
                if (this.x !== this.baseX) this.x -= (this.x - this.baseX) / 10;
                if (this.y !== this.baseY) this.y -= (this.y - this.baseY) / 10;
            }
        }
    }

    function resizeCanvas() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        particlesArray = [];
        const n = (canvas.width * canvas.height) / 9000;
        for (let i = 0; i < n; i++) particlesArray.push(new Particle());
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particlesArray.forEach(p => { p.draw(); p.update(); });
        requestAnimationFrame(animate);
    }
    animate();

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
            title : "🛃 Formulaire - `<@${discord}>`",
            color : 16753920, // Orange
            fields: [
                { name: "👤 Identité",                        value: `**ID Discord:** <@${discord}>\n**Âge:** ${age} ans`,       inline: false },
                { name: "📢 Comment a connu le serveur",      value: connu,                                                       inline: false },
                { name: "🎭 Expérience RP",                   value: xp,                                                          inline: false },
                { name: "📖 PowerGaming & MetaGaming",        value: regles,                                                      inline: false },
                { name: "🧬 Histoire du personnage",           value: perso,                                                       inline: false },
                { name: "🎯 Buts en ville (court/long terme)", value: buts,                                                        inline: false },
                { name: "✅ Confirmation",                    value: "Le joueur a cocher la case!",                             inline: true  }
            ],
            footer: { text: `ID Discord: ${discord}` },
            timestamp: new Date().toISOString()
        };

        await submitToDiscord(WEBHOOK_DOUANE, embed, btn, "ENVOYER LE FORMULAIRE DE DOUANE", document.getElementById('douaneForm'));
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

        await submitToDiscord(WEBHOOK_STAFF, embed, btn, "ENVOYER LA CANDIDATURE STAFF", document.getElementById('staffForm'));
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

        await submitToDiscord(WEBHOOK_DEV, embed, btn, "ENVOYER LA CANDIDATURE DEV", document.getElementById('devForm'));
    }

    // =============================================
    // HELPER — Envoi Discord
    // =============================================
    async function submitToDiscord(webhookUrl, embed, btn, originalLabel, form) {
        const payload = {
            username  : "apps.lastway.ca",
            avatar_url: "https://r2.fivemanage.com/JslDOPFlC7vuh5WBc8xjk/lastway-white-removebg-preview.png",
            embeds    : [embed]
        };

        try {
            const response = await fetch(webhookUrl, {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify(payload)
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
