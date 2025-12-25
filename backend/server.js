const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration de la base de données
// Configuration de la base de données
const dbConfig = {
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'stade_db',
    port: process.env.DB_PORT || 3306
};

// Connexion à la base de données avec retry
let db;
async function connectDBWithRetry() {
    const maxRetries = 10;
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            console.log(`Tentative de connexion ${retries + 1}/${maxRetries} à MySQL...`);
            db = await mysql.createConnection(dbConfig);
            
            // Tester la connexion
            await db.execute('SELECT 1');
            console.log('✅ Connecté à la base de données MySQL');
            return;
        } catch (error) {
            retries++;
            console.log(`❌ Échec de connexion (${retries}/${maxRetries}): ${error.message}`);
            
            if (retries === maxRetries) {
                console.error('❌ Impossible de se connecter à MySQL après plusieurs tentatives');
                throw error;
            }
            
            // Attendre 5 secondes avant de réessayer
            console.log('⏳ Attente de 5 secondes avant nouvelle tentative...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}
// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'API Stade Réservation - Backend',
        status: 'running',
        version: '1.0.0',
        endpoints: {
            register: 'POST /api/register',
            login: 'POST /api/login',
            recharge: 'POST /api/recharge',
            matches: 'GET /api/matches',
            reserve: 'POST /api/reserve',
            reservations: 'GET /api/reservations/:email'
        }
    });
});

// Route de santé
app.get('/health', async (req, res) => {
    try {
        // Tester la connexion à la base de données
        await db.execute('SELECT 1');
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString(),
            services: {
                backend: 'running',
                database: 'connected'
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 1. Inscription
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Vérifier si l'utilisateur existe déjà
        const [existing] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email déjà utilisé' });
        }
        
        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Créer l'utilisateur
        await db.execute(
            'INSERT INTO users (email, password, sold, role) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, 0, 'user']
        );
        
        res.status(201).json({ message: 'Utilisateur créé avec succès' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 2. Connexion
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        res.json({ 
            message: 'Connexion réussie',
            user: {
                email: user.email,
                sold: user.sold,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
// Ligne 130 (ou environ) - fonction get matches
app.get('/api/matches', async (req, res) => {
    try {
        const [matches] = await db.execute(
            'SELECT * FROM `match` ORDER BY date_h ASC'  // Ajoutez les backticks
        );
        res.json(matches);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur', details: error.message });
    }
});

// Ligne 163 (ou environ) - fonction de réservation
app.post('/api/reserve', async (req, res) => {
    try {
        const { email, matchId, placeType } = req.body;
        
        // Vérifier le prix de la place
        const [places] = await db.execute(
            'SELECT * FROM place WHERE post = ?',
            [placeType]
        );
        
        if (places.length === 0) {
            return res.status(400).json({ error: 'Type de place invalide' });
        }
        
        const place = places[0];
        
        // Vérifier le solde
        const [users] = await db.execute(
            'SELECT sold FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0 || users[0].sold < place.prix) {
            return res.status(400).json({ error: 'Solde insuffisant ou utilisateur non trouvé' });
        }
        
        // Décrémenter le solde
        await db.execute(
            'UPDATE users SET sold = sold - ? WHERE email = ?',
            [place.prix, email]
        );
        
        // Créer la réservation
        await db.execute(
            'INSERT INTO reservation (email_user, id_place) VALUES (?, ?)',
            [email, place.id_place]
        );
        
        // Récupérer le nouveau solde
        const [updatedUsers] = await db.execute(
            'SELECT sold FROM users WHERE email = ?',
            [email]
        );
        
        res.json({ 
            message: 'Réservation réussie',
            newSold: updatedUsers[0].sold
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur', details: error.message });
    }
});

// Ligne 205 (ou environ) - fonction get reservations
app.get('/api/reservations/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        const [reservations] = await db.execute(`
            SELECT r.*, p.post, p.prix, m.equipe1, m.equipe2, m.date_h
            FROM reservation r
            JOIN place p ON r.id_place = p.id_place
            JOIN \`match\` m ON p.match_id = m.id  -- Ajoutez les backticks
            WHERE r.email_user = ?
        `, [email]);
        
        const formatted = reservations.map(res => ({
            ...res,
            match_info: `${res.equipe1} vs ${res.equipe2}`
        }));
        
        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur', details: error.message });
    }
});
// 3. Recharger le compte
app.post('/api/recharge', async (req, res) => {
    try {
        const { email, code } = req.body;
        
        // Vérifier le code de recharge
        const [recharges] = await db.execute(
            'SELECT * FROM recharge WHERE coderecharge = ?',
            [code]
        );
        
        if (recharges.length === 0) {
            return res.status(400).json({ error: 'Code invalide' });
        }
        
        const recharge = recharges[0];
        
        // Mettre à jour le solde
        await db.execute(
            'UPDATE users SET sold = sold + ? WHERE email = ?',
            [recharge.prix, email]
        );
        
        // Récupérer le nouveau solde
        const [users] = await db.execute(
            'SELECT sold FROM users WHERE email = ?',
            [email]
        );
        
        // Supprimer le code utilisé
        await db.execute(
            'DELETE FROM recharge WHERE coderecharge = ?',
            [code]
        );
        
        res.json({ 
            message: 'Recharge réussie',
            newSold: users[0].sold
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 4. Lister les matchs
app.get('/api/matches', async (req, res) => {
    try {
        const [matches] = await db.execute(
            'SELECT * FROM match ORDER BY date_h ASC'
        );
        res.json(matches);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 5. Réserver une place
app.post('/api/reserve', async (req, res) => {
    try {
        const { email, matchId, placeType } = req.body;
        
        // Vérifier le prix de la place
        const [places] = await db.execute(
            'SELECT * FROM place WHERE post = ?',
            [placeType]
        );
        
        if (places.length === 0) {
            return res.status(400).json({ error: 'Type de place invalide' });
        }
        
        const place = places[0];
        
        // Vérifier le solde
        const [users] = await db.execute(
            'SELECT sold FROM users WHERE email = ?',
            [email]
        );
        
        if (users[0].sold < place.prix) {
            return res.status(400).json({ error: 'Solde insuffisant' });
        }
        
        // Décrémenter le solde
        await db.execute(
            'UPDATE users SET sold = sold - ? WHERE email = ?',
            [place.prix, email]
        );
        
        // Créer la réservation
        await db.execute(
            'INSERT INTO reservation (email_user, id_place) VALUES (?, ?)',
            [email, place.id_place]
        );
        
        // Récupérer le nouveau solde
        const [updatedUsers] = await db.execute(
            'SELECT sold FROM users WHERE email = ?',
            [email]
        );
        
        res.json({ 
            message: 'Réservation réussie',
            newSold: updatedUsers[0].sold
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 6. Voir les réservations
app.get('/api/reservations/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        const [reservations] = await db.execute(`
            SELECT r.*, p.post, p.prix, m.equipe1, m.equipe2, m.date_h
            FROM reservation r
            JOIN place p ON r.id_place = p.id_place
            JOIN match m ON p.match_id = m.id
            WHERE r.email_user = ?
        `, [email]);
        
        const formatted = reservations.map(res => ({
            ...res,
            match_info: `${res.equipe1} vs ${res.equipe2}`
        }));
        
        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
// Démarrer le serveur
async function startServer() {
    try {
        await connectDBWithRetry();
        
        app.listen(PORT, () => {
            console.log(`🚀 Serveur backend en écoute sur le port ${PORT}`);
            console.log(`📊 Connexion MySQL établie avec succès`);
        });
    } catch (error) {
        console.error('❌ Échec critique: ', error.message);
        process.exit(1);
    }
}

startServer();