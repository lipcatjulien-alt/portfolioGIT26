document.addEventListener('DOMContentLoaded', () => {
    const liensNav = document.querySelectorAll('.item-nav');
    const vues = document.querySelectorAll('.vue');
    const barreLaterale = document.querySelector('.barre-laterale');
    const boutonMenu = document.querySelector('.bouton-menu-mobile');

    // Fonction pour afficher une vue spécifique
    function afficherVue(idCible) {
        // Cacher toutes les vues
        vues.forEach(vue => vue.classList.remove('vue-active'));
        
        // Retirer la classe active de tous les liens
        liensNav.forEach(lien => {
            lien.classList.remove('active');
            lien.removeAttribute('aria-current');
        });

        // Afficher la bonne vue
        const vueCible = document.querySelector(idCible);
        if (vueCible) {
            vueCible.classList.add('vue-active');
            // Optionnel : petite animation d'apparition
            vueCible.style.animation = 'none';
            vueCible.offsetHeight; /* trigger reflow */
            vueCible.style.animation = 'apparition 0.5s var(--transition)';
        }

        // Mettre à jour le lien actif
        const lienActif = document.querySelector(`.item-nav[href="${idCible}"]`);
        if (lienActif) {
            lienActif.classList.add('active');
            lienActif.setAttribute('aria-current', 'page');
        }

        // Sur mobile : fermer le menu après un clic
        if (barreLaterale && barreLaterale.classList.contains('ouverte')) {
            barreLaterale.classList.remove('ouverte');
            if (boutonMenu) boutonMenu.setAttribute('aria-expanded', 'false');
        }
    }

    // Gestion des clics sur les liens de navigation
    liensNav.forEach(lien => {
        lien.addEventListener('click', (e) => {
            // Si le lien est vers un ID de la page
            const href = lien.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                afficherVue(href);
                // Mettre à jour l'URL sans recharger la page
                history.pushState(null, null, href);
            }
        });
    });

    // Gestion des clics sur les boutons "Voir mes projets" et "Me contacter" dans l'accueil
    const boutonsAction = document.querySelectorAll('.btn-primaire, .btn-secondaire');
    boutonsAction.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const href = btn.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                afficherVue(href);
                history.pushState(null, null, href);
            }
        });
    });

    // Gérer l'arrivée sur la page avec un # dans l'URL (ex: index.html#projets)
    if (window.location.hash) {
        afficherVue(window.location.hash);
    } else {
        // Par défaut, afficher l'accueil
        afficherVue('#accueil');
    }

    // Gérer le bouton retour du navigateur
    window.addEventListener('popstate', () => {
        if (window.location.hash) {
            afficherVue(window.location.hash);
        } else {
            afficherVue('#accueil');
        }
    });

    // Système de filtre pour les procédures
    const boutonsFiltre = document.querySelectorAll('.btn-filtre');
    const cartesProcedure = document.querySelectorAll('.carte-procedure');

    if (boutonsFiltre.length > 0 && cartesProcedure.length > 0) {
        boutonsFiltre.forEach(bouton => {
            bouton.addEventListener('click', () => {
                // Retirer la classe actif de tous les boutons
                boutonsFiltre.forEach(b => b.classList.remove('actif'));
                // Ajouter au bouton cliqué
                bouton.classList.add('actif');

                const filtre = bouton.getAttribute('data-filter');

                cartesProcedure.forEach(carte => {
                    if (filtre === 'tout') {
                        carte.style.display = 'flex';
                    } else {
                        const categories = carte.getAttribute('data-categorie') || '';
                        if (categories.includes(filtre)) {
                            carte.style.display = 'flex';
                        } else {
                            carte.style.display = 'none';
                        }
                    }
                });
            });
        });
    }
});

// Missions de stage (fenêtres de détail), zoom photo et liens internes
document.addEventListener('DOMContentLoaded', () => {
    const ouvrir = (d) => { d.showModal(); document.body.classList.add('fenetre-ouverte'); };
    document.querySelectorAll('dialog').forEach(d => {
        d.addEventListener('close', () => {
            if (!document.querySelector('dialog[open]')) document.body.classList.remove('fenetre-ouverte');
        });
        d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
        const btn = d.querySelector('.fermer-fenetre');
        if (btn) btn.addEventListener('click', () => d.close());
    });
    document.querySelectorAll('[data-mission]').forEach(carte => {
        carte.addEventListener('click', () => {
            const d = document.getElementById(carte.dataset.mission);
            if (d) ouvrir(d);
        });
    });

    const zoom = document.getElementById('fenetre-zoom');
    function zoomer(src, legende) {
        if (!zoom) return;
        zoom.querySelector('img').src = src;
        zoom.querySelector('img').alt = legende || '';
        zoom.querySelector('.legende-zoom').textContent = legende || '';
        ouvrir(zoom);
    }
    document.querySelectorAll('img.zoomable').forEach(img => img.addEventListener('click', () => zoomer(img.src, img.alt)));
    document.querySelectorAll('.zoomable-btn').forEach(b => b.addEventListener('click', () => zoomer(b.dataset.src, b.dataset.legende)));

    // Liens internes dans le contenu (ex : "Mis en œuvre : Fibre Grigny")
    document.querySelectorAll('.vue-principale a[href^="#"]:not(.item-nav):not(.btn-primaire):not(.btn-secondaire)').forEach(lien => {
        lien.addEventListener('click', (e) => {
            e.preventDefault();
            const nav = document.querySelector('.item-nav[href="' + lien.getAttribute('href') + '"]');
            if (nav) nav.click();
            document.querySelector('.vue-principale').scrollTop = 0;
        });
    });

    // Formulaire de contact : ouvre la messagerie avec le message pré-rempli
    const form = document.getElementById('form-contact');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const nom = form.nom.value.trim();
            const email = form.email.value.trim();
            const message = form.message.value.trim();
            const sujet = encodeURIComponent('Contact portfolio — ' + nom);
            const corps = encodeURIComponent(message + '\n\n' + nom + ' (' + email + ')');
            window.location.href = 'mailto:lipcat.julien@gmail.com?subject=' + sujet + '&body=' + corps;
        });
    }
});
