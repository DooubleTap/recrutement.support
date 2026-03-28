document.addEventListener('DOMContentLoaded', () => {
    const toast = document.getElementById('toast');

    // =============================================
    // NAVIGATION ENTRE PAGES
    // =============================================
    window.showForm = function(type) {
        document.getElementById('landingPage').classList.add('hidden');
        document.getElementById('staffForm').classList.add('hidden');
        document.getElementById('devForm').classList.add('hidden');

        if (type === 'staff') {
            document.getElementById('staffForm').classList.remove('hidden');
            document.getElementById('pageSubtitle').textContent = 'Application Staff';
        } else if (type === 'dev') {
            document.getElementById('devForm').classList.remove('hidden');
            document.getElementById('pageSubtitle').textContent = 'Application Dev';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.showLanding = function() {
        document.getElementById('staffForm').classList.add('hidden');
        document.getElementById('devForm').classList.add('hidden');
        document.getElementById('landingPage').classList.remove('hidden');
        document.getElementById('pageSubtitle').textContent = 'Recrutement LastWay';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // =============================================
    // CUSTOM SELECT — DEV FORM
    // =============================================
    const devGithubSelect = document.getElementById('devGithubSelect');
    if (devGithubSelect) {
        const trigger = devGithubSelect.querySelector('.select-trigger');
        const devGithubInput = document.getElementById('devGithubInput');

        trigger.addEventListener('click', () => {
            devGithubSelect.classList.toggle('active');
        });

        devGithubSelect.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                const text = option.textContent;
                trigger.querySelector('span').textContent = text;
                devGithubInput.value = value;
                devGithubSelect.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                devGithubSelect.classList.remove('active');
            });
        });

        document.addEventListener('click', (e) => {
            if (!devGithubSelect.contains(e.target)) {
                devGithubSelect.classList.remove('active');
            }
        });
    }

    // =============================================
    // PARTICLE SYSTEM
    // =============================================
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particlesArray = [];
    let mouse = { x: null, y: null, radius: 150 };

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.baseX = this.x;
            this.baseY = this.y;
            this.density = (Math.random() * 30) + 1;
            this.color = '#fdfdfd';
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }

        update() {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            let maxDistance = mouse.radius;
            let force = (maxDistance - distance) / maxDistance;
            let directionX = forceDirectionX * force * this.density;
            let directionY = forceDirectionY * force * this.density;

            if (distance < mouse.radius) {
                this.x -= directionX;
                this.y -= directionY;
            } else {
                if (this.x !== this.baseX) {
                    this.x -= (this.x - this.baseX) / 10;
                }
                if (this.y !== this.baseY) {
                    this.y -= (this.y - this.baseY) / 10;
                }
            }
        }
    }

    function initParticles() {
        particlesArray = [];
        let numberOfParticles = (canvas.width * canvas.height) / 9000;
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].draw();
            particlesArray[i].update();
        }
        requestAnimationFrame(animate);
    }
    animate();

    // =============================================
    // CONFIGURATION WEBHOOKS
    // =============================================
    const WEBHOOK_STAFF = "https://discord.com/api/webhooks/1476521529146609815/0xzWZp25v6lvDutPiJ03_zWX616oZXzAVrLVj0sUQ5-4dMrZwAqAqel0lmM_ZgAXV3_O";
    const WEBHOOK_DEV   = "https://discord.com/api/webhooks/1476521529146609815/0xzWZp25v6lvDutPiJ03_zWX616oZXzAVrLVj0sUQ5-4dMrZwAqAqel0lmM_ZgAXV3_O"; // Remplacer par le webhook Dev si différent

    // =============================================
    // ENVOI — APPLICATION STAFF
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
            title: "📋 Nouvelle Candidature STAFF — LastWay",
            color: 3066993, // Vert
            fields: [
                { name: "👤 Identité",          value: `**ID Discord:** <@${discord}>\n**Âge:** ${age} ans`,                         inline: false },
                { name: "🏆 Expérience Staff",  value: experience,                                                                   inline: false },
                { name: "📚 Pédagogie",         value: pedagogie,                                                                    inline: false },
                { name: "⚡ Gestion conflits",  value: conflict,                                                                     inline: false },
                { name: "🕐 Disponibilités",    value: disponibilite,                                                                inline: true  },
                { name: "🎯 Motivations",       value: motivations,                                                                  inline: false },
                { name: "⚖️ Confirmation",      value: "✅ Accepté",                                                                 inline: true  }
            ]
        };

        await submitToDiscord(WEBHOOK_STAFF, embed, btn, "ENVOYER LA CANDIDATURE STAFF", document.getElementById('staffForm'));
    }

    // =============================================
    // ENVOI — APPLICATION DEV
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
            title: "💻 Nouvelle Candidature DEV — LastWay",
            color: 5793266, // Bleu
            fields: [
                { name: "👤 Identité",              value: `**ID Discord:** <@${discord}>\n**Âge:** ${age} ans`,                              inline: false },
                { name: "💻 Frameworks",            value: frameworks,                                                                         inline: false },
                { name: "🗄️ SQL / DB",              value: sql,                                                                                inline: false },
                { name: "🛠️ Expérience Dev",        value: devExp,                                                                             inline: false },
                { name: "📦 Scripts créés",         value: scripts,                                                                            inline: false },
                { name: "🤖 Utilisation IA",        value: aiUsage,                                                                            inline: false },
                { name: "🐙 GitHub",                value: githubVal,                                                                          inline: true  },
                { name: "🎯 Motivations",           value: motivations,                                                                        inline: false },
                { name: "⚖️ Confirmation",          value: "✅ Accepté",                                                                       inline: true  }
            ]
        };

        await submitToDiscord(WEBHOOK_DEV, embed, btn, "ENVOYER LA CANDIDATURE DEV", document.getElementById('devForm'));
    }

    // =============================================
    // HELPER — Envoi Discord commun
    // =============================================
    async function submitToDiscord(webhookUrl, embed, btn, originalLabel, form) {
        const payload = {
            username: "apps.lastway.ca",
            avatar_url: "https://r2.fivemanage.com/JslDOPFlC7vuh5WBc8xjk/lastway-white-removebg-preview.png",
            embeds: [embed]
        };

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast('Votre candidature a été envoyée avec succès !');
                form.reset();
                // Reset custom selects
                const selectTrigger = form.querySelector('.select-trigger span');
                if (selectTrigger) selectTrigger.textContent = 'Sélectionnez une option';
                const hiddenInput = form.querySelector('input[type="hidden"]');
                if (hiddenInput) hiddenInput.value = '';
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
        toast.className = `toast ${type}`;
        setTimeout(() => {
            toast.className = 'toast hidden';
        }, 5000);
    }

    // =============================================
    // CLICK HANDLERS
    // =============================================
    document.getElementById('staffSubmitBtn').addEventListener('click', sendStaffApplication);
    document.getElementById('devSubmitBtn').addEventListener('click', sendDevApplication);
});