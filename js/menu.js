document.addEventListener('DOMContentLoaded', () => {
    const boutonMenu = document.querySelector('.bouton-menu-mobile');
    const barreLaterale = document.querySelector('.barre-laterale');
    
    if (boutonMenu && barreLaterale) {
        boutonMenu.addEventListener('click', () => {
            const estOuvert = boutonMenu.getAttribute('aria-expanded') === 'true';
            
            boutonMenu.setAttribute('aria-expanded', !estOuvert);
            barreLaterale.classList.toggle('ouverte');
            
            if (!estOuvert) {
                // Focus sur le premier lien quand le menu s'ouvre
                const premierLien = barreLaterale.querySelector('a');
                if (premierLien) premierLien.focus();
            }
        });

        // Fermer le menu si on clique en dehors
        document.addEventListener('click', (e) => {
            if (barreLaterale.classList.contains('ouverte') && 
                !barreLaterale.contains(e.target) && 
                !boutonMenu.contains(e.target)) {
                
                boutonMenu.setAttribute('aria-expanded', 'false');
                barreLaterale.classList.remove('ouverte');
            }
        });
        
        // Fermer le menu si on appuie sur Echap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && barreLaterale.classList.contains('ouverte')) {
                boutonMenu.setAttribute('aria-expanded', 'false');
                barreLaterale.classList.remove('ouverte');
                boutonMenu.focus();
            }
        });
    }
});
