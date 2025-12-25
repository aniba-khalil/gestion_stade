const API_URL = 'http://localhost:3000/api';

let currentUser = null;

// Navigation entre écrans
function showScreen(screenName) {
    console.log(`Changement d'écran: ${screenName}`);
    
    // Masquer tous les écrans
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Chercher l'élément avec différentes possibilités
    let element = document.getElementById(`${screenName}-screen`);
    if (!element) {
        // Essayer sans le suffixe -screen
        element = document.getElementById(screenName);
    }
    
    if (element) {
        element.style.display = 'block';
        console.log(`✅ Écran ${screenName} affiché`);
    } else {
        console.error(`❌ Écran ${screenName} non trouvé`);
        return;
    }
    
    // Si on montre le dashboard, charger les données
    if (screenName === 'dashboard') {
        loadDashboardData();
    }
}

// Charger les données du dashboard
async function loadDashboardData() {
    try {
        console.log('Chargement des données du dashboard...');
        await loadMatches();
        await populateMatchSelect();
        console.log('✅ Données dashboard chargées');
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
    }
}

// Remplir le select des matchs
async function populateMatchSelect() {
    try {
        console.log('Remplissage du select des matchs...');
        const response = await fetch(`${API_URL}/matches`);
        if (!response.ok) throw new Error('Erreur chargement matchs');
        
        const matches = await response.json();
        const select = document.getElementById('match-select');
        select.innerHTML = '<option value="">Sélectionnez un match</option>';
        
        matches.forEach(match => {
            const option = document.createElement('option');
            option.value = match.id;
            option.textContent = `${match.equipe1} vs ${match.equipe2} - ${new Date(match.date_h).toLocaleDateString()}`;
            select.appendChild(option);
        });
        console.log(`✅ ${matches.length} match(s) chargé(s) dans le select`);
    } catch (error) {
        console.error('Erreur population matchs:', error);
    }
}

// Navigation entre sections du dashboard
function showSection(sectionName) {
    console.log(`Changement de section: ${sectionName}`);
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    const sectionElement = document.getElementById(`${sectionName}-section`);
    if (sectionElement) {
        sectionElement.style.display = 'block';
        console.log(`✅ Section ${sectionName} affichée`);
    } else {
        console.error(`❌ Section ${sectionName} non trouvée`);
    }
    
    // Charger les données spécifiques à la section
    if(sectionName === 'matches') loadMatches();
    if(sectionName === 'my-reservations') loadUserReservations();
}

// Inscription
async function register() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    if (!email || !password) {
        alert('Veuillez remplir tous les champs');
        return;
    }
    
    try {
        console.log(`Tentative d'inscription: ${email}`);
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password})
        });
        
        const data = await response.json();
        console.log('Réponse inscription:', data);
        
        if(response.ok) {
            alert('✅ Inscription réussie ! Connectez-vous.');
            showScreen('login');
        } else {
            alert(`❌ ${data.error || 'Erreur d\'inscription'}`);
        }
    } catch (error) {
        console.error('Erreur inscription:', error);
        alert('❌ Erreur de connexion au serveur');
    }
}

// Connexion
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        alert('Veuillez remplir tous les champs');
        return;
    }
    
    try {
        console.log(`Tentative de connexion: ${email}`);
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password})
        });
        
        const data = await response.json();
        console.log('Réponse login:', data);
        
        if(response.ok) {
            currentUser = data.user;
            console.log('✅ Utilisateur connecté:', currentUser);
            
            // Mettre à jour l'affichage
            document.getElementById('user-email').textContent = email;
            document.getElementById('user-sold').textContent = `Solde: ${data.user.sold}€`;
            
            // Afficher le dashboard
            showScreen('dashboard');
        } else {
            alert(`❌ ${data.error || 'Email ou mot de passe incorrect'}`);
        }
    } catch (error) {
        console.error('Erreur connexion:', error);
        alert('❌ Erreur de connexion au serveur');
    }
}

// Déconnexion
function logout() {
    console.log('Déconnexion utilisateur:', currentUser?.email);
    currentUser = null;
    showScreen('login');
}

// Recharger compte
async function rechargeAccount() {
    const code = document.getElementById('recharge-code').value;
    
    if (!code) {
        alert('Veuillez entrer un code de recharge');
        return;
    }
    
    if (!currentUser) {
        alert('Vous devez être connecté');
        return;
    }
    
    try {
        console.log(`Tentative recharge: ${code} pour ${currentUser.email}`);
        const response = await fetch(`${API_URL}/recharge`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                email: currentUser.email, 
                code: code.toUpperCase()
            })
        });
        
        const data = await response.json();
        if(response.ok) {
            alert(`✅ Recharge réussie ! Nouveau solde: ${data.newSold}€`);
            document.getElementById('user-sold').textContent = `Solde: ${data.newSold}€`;
            document.getElementById('recharge-code').value = '';
        } else {
            alert(`❌ ${data.error || 'Code invalide'}`);
        }
    } catch (error) {
        console.error('Erreur recharge:', error);
        alert('❌ Erreur de connexion au serveur');
    }
}

// Charger les matchs
async function loadMatches() {
    try {
        console.log('Chargement des matchs...');
        const response = await fetch(`${API_URL}/matches`);
        if (!response.ok) throw new Error('Erreur API');
        
        const matches = await response.json();
        console.log(`${matches.length} match(s) chargé(s):`, matches);
        
        const matchesList = document.getElementById('matches-list');
        if (matches.length === 0) {
            matchesList.innerHTML = '<p>Aucun match disponible</p>';
        } else {
            matchesList.innerHTML = matches.map(match => `
                <div class="match-card">
                    <h4>${match.equipe1} vs ${match.equipe2}</h4>
                    <p>Date: ${new Date(match.date_h).toLocaleString()}</p>
                    <p>ID: ${match.id}</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Erreur chargement matchs:', error);
        document.getElementById('matches-list').innerHTML = '<p>Erreur de chargement des matchs</p>';
    }
}

// Faire une réservation
async function makeReservation() {
    const matchId = document.getElementById('match-select').value;
    const placeType = document.getElementById('place-type').value;
    
    if (!matchId) {
        alert('Veuillez sélectionner un match');
        return;
    }
    
    if (!currentUser) {
        alert('Vous devez être connecté');
        return;
    }
    
    try {
        console.log(`Tentative réservation: match ${matchId}, place ${placeType} pour ${currentUser.email}`);
        const response = await fetch(`${API_URL}/reserve`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                email: currentUser.email,
                matchId: parseInt(matchId),
                placeType: placeType
            })
        });
        
        const data = await response.json();
        if(response.ok) {
            alert(`✅ Réservation réussie ! Nouveau solde: ${data.newSold}€`);
            document.getElementById('user-sold').textContent = `Solde: ${data.newSold}€`;
        } else {
            alert(`❌ ${data.error || 'Erreur de réservation'}`);
        }
    } catch (error) {
        console.error('Erreur réservation:', error);
        alert('❌ Erreur de connexion au serveur');
    }
}

// Charger les réservations de l'utilisateur
async function loadUserReservations() {
    if (!currentUser) {
        console.log('Aucun utilisateur connecté pour charger les réservations');
        return;
    }
    
    try {
        console.log(`Chargement réservations pour: ${currentUser.email}`);
        const response = await fetch(`${API_URL}/reservations/${currentUser.email}`);
        if (!response.ok) throw new Error('Erreur API');
        
        const reservations = await response.json();
        console.log(`${reservations.length} réservation(s) trouvée(s):`, reservations);
        
        const reservationsList = document.getElementById('reservations-list');
        if (reservations.length === 0) {
            reservationsList.innerHTML = '<p>Aucune réservation</p>';
        } else {
            reservationsList.innerHTML = reservations.map(res => `
                <div class="reservation-card">
                    <p><strong>Place ${res.post}</strong> - ${res.prix}€</p>
                    <p>Match: ${res.equipe1} vs ${res.equipe2}</p>
                    <p>Date: ${new Date(res.date_h).toLocaleString()}</p>
                    <small>Réservé le: ${new Date(res.date_reservation).toLocaleString()}</small>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Erreur chargement réservations:', error);
        document.getElementById('reservations-list').innerHTML = '<p>Erreur de chargement des réservations</p>';
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Application initialisée');
    
    // Vérifier que tous les éléments existent
    const checkElements = () => {
        const elements = [
            'login-screen', 'register-screen', 'dashboard',
            'login-email', 'login-password', 'register-email', 'register-password',
            'user-email', 'user-sold', 'recharge-code', 'match-select', 'place-type',
            'matches-list', 'reservations-list'
        ];
        
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log(`✅ Élément ${id} trouvé`);
            } else {
                console.warn(`⚠️ Élément ${id} NON TROUVÉ`);
            }
        });
    };
    
    checkElements();
    showScreen('login');
    
    // Tester la connexion API
    fetch(`${API_URL}/matches`)
        .then(response => {
            if (response.ok) {
                console.log('✅ API backend fonctionnelle');
            } else {
                console.error('❌ API backend non disponible');
            }
        })
        .catch(error => {
            console.error('❌ Erreur connexion API:', error);
        });
});