document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('recruitmentForm');
    const submitBtn = document.getElementById('submitBtn');
    const toast = document.getElementById('toast');

    // Custom Select Logic
    const customSelect = document.getElementById('anydeskSelect');
    const trigger = customSelect.querySelector('.select-trigger');
    const options = customSelect.querySelector('.select-options');
    const hiddenInput = document.getElementById('anydeskInput');

    trigger.addEventListener('click', () => {
        customSelect.classList.toggle('active');
    });

    customSelect.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', () => {
            const value = option.dataset.value;
            const text = option.textContent;

            trigger.querySelector('span').textContent = text;
            hiddenInput.value = value;

            customSelect.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');

            customSelect.classList.remove('active');
        });
    });

    // Fermer le select si clic à l'extérieur
    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) {
            customSelect.classList.remove('active');
        }
    });

    // PARTICLE SYSTEM (CANVAS)
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particlesArray = [];
    let mouse = { x: null, y: null, radius: 150 };

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    // IMPORTANT : La classe Particle DOIT être déclarée AVANT d'être utilisée
    // (les classes JS ne sont pas hoistées comme les fonctions)
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
                    let dx = this.x - this.baseX;
                    this.x -= dx / 10;
                }
                if (this.y !== this.baseY) {
                    let dy = this.y - this.baseY;
                    this.y -= dy / 10;
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
    resizeCanvas(); // Maintenant safe : Particle est déjà déclarée

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].draw();
            particlesArray[i].update();
        }
        requestAnimationFrame(animate);
    }
    animate();

    // --- CONFIGURATION WEBHOOK ---
    const WEBHOOK_URL = "https://discord.com/api/webhooks/1476521529146609815/0xzWZp25v6lvDutPiJ03_zWX616oZXzAVrLVj0sUQ5-4dMrZwAqAqel0lmM_ZgAXV3_O";

    async function sendApplication() {
        // Validation manuelle
        const discord = document.getElementById('discord').value.trim();
        const age = document.getElementById('age').value.trim();
        const frameworks = document.getElementById('frameworks').value.trim();
        const sql = document.getElementById('sql').value.trim();
        const devExp = document.getElementById('devExp').value.trim();
        const scripts = document.getElementById('scripts').value.trim();
        const aiUsage = document.getElementById('aiUsage').value.trim();
        const anydeskVal = document.getElementById('anydeskInput').value;
        const pedagogie = document.getElementById('pedagogie').value.trim();
        const motivations = document.getElementById('motivations').value.trim();
        const benevolat = document.getElementById('benevolat').checked;

        if (!discord || !age || !frameworks || !sql || !devExp || !scripts || !aiUsage || !pedagogie || !motivations) {
            alert("⚠️ Veuillez remplir tous les champs du formulaire.");
            return;
        }

        if (!anydeskVal) {
            alert("⚠️ Veuillez sélectionner une option pour la maîtrise de GitHub.");
            return;
        }

        if (!benevolat) {
            alert("⚠️ Veuillez accepter le statut bénévole pour continuer.");
            return;
        }

        // Animation bouton
        submitBtn.disabled = true;
        const originalText = submitBtn.querySelector('span').textContent;
        submitBtn.querySelector('span').textContent = 'ENVOI EN COURS...';

        const embed = {
            title: "📩 Nouvelle Candidature Support LastWay RP",
            color: 4873856,
            fields: [
                { name: "👤 Identité", value: `**ID Discord:** <@${discord}> **Âge:** ${age} ans`, inline: true },
                { name: "💻 Technique", value: `**Frameworks:** ${frameworks}\n**SQL:** ${sql}\n**GitHub:** ${anydeskVal}`, inline: false },
                { name: "🛠️ Expérience Dev & Scripts", value: `**Développeur projet:** ${devExp}\n**Création scripts:** ${scripts}`, inline: false },
                { name: "🤖 Utilisation IA", value: aiUsage, inline: false },
                { name: "🤝 Relationnel & Motivations", value: `**Mise en situation:** ${pedagogie}\n**Motivations:** ${motivations}`, inline: false },
                { name: "⚖️ Statut Bénévolat", value: "✅ Accepté", inline: true }
            ],
            //footer: { text: "Recrutement LastWay System" },
            //timestamp: new Date().toISOString()
        };

        const payload = {
            username: "apps.lastway.ca",
            avatar_url: "https://r2.fivemanage.com/JslDOPFlC7vuh5WBc8xjk/lastway-white-removebg-preview.png",
            embeds: [embed]
        };

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast('Votre candidature a été envoyée avec succès !');
                form.reset();
                trigger.querySelector('span').textContent = "Sélectionnez une option";
                document.getElementById('anydeskInput').value = "";
            } else {
                alert("Erreur Discord : " + response.status);
            }
        } catch (error) {
            console.error(error);
            alert("Erreur d'envoi : " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = originalText;
        }
    }

    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        setTimeout(() => {
            toast.className = 'toast hidden';
        }, 5000);
    }

    // Click handler direct (pas de form submit)
    submitBtn.addEventListener('click', () => {
        sendApplication();
    });
});
