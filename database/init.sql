-- Créer la base de données
CREATE DATABASE IF NOT EXISTS stade_db;
USE stade_db;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(100) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    sold DECIMAL(10,2) DEFAULT 0.00,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des codes de recharge
CREATE TABLE IF NOT EXISTS recharge (
    coderecharge VARCHAR(50) PRIMARY KEY,
    prix DECIMAL(10,2) NOT NULL
);

-- Table des matchs (AJOUTEZ LES BACKTICKS ICI)
CREATE TABLE IF NOT EXISTS `match` (  -- <-- CHANGÉ ICI
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipe1 VARCHAR(100) NOT NULL,
    equipe2 VARCHAR(100) NOT NULL,
    date_h DATETIME NOT NULL
);

-- Table des places
CREATE TABLE IF NOT EXISTS place (
    id_place INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT,
    post ENUM('VIP', 'Normal', 'Economy') NOT NULL,
    prix DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (match_id) REFERENCES `match`(id)  -- <-- CHANGÉ ICI AUSSI
);

-- Table des réservations
CREATE TABLE IF NOT EXISTS reservation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email_user VARCHAR(100),
    id_place INT,
    date_reservation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_user) REFERENCES users(email) ON DELETE CASCADE,
    FOREIGN KEY (id_place) REFERENCES place(id_place) ON DELETE CASCADE
);

-- Insérer des données de test
INSERT IGNORE INTO recharge (coderecharge, prix) VALUES 
('RECHARGE100', 100.00),
('RECHARGE50', 50.00),
('RECHARGE20', 20.00);

INSERT IGNORE INTO `match` (equipe1, equipe2, date_h) VALUES  -- <-- CHANGÉ ICI
('PSG', 'OM', '2024-12-15 20:00:00'),
('Real Madrid', 'Barcelona', '2024-12-20 21:00:00'),
('Manchester United', 'Liverpool', '2024-12-25 19:00:00');

INSERT IGNORE INTO place (match_id, post, prix) VALUES 
(1, 'VIP', 100.00), (1, 'Normal', 50.00), (1, 'Economy', 20.00),
(2, 'VIP', 120.00), (2, 'Normal', 60.00), (2, 'Economy', 25.00),
(3, 'VIP', 110.00), (3, 'Normal', 55.00), (3, 'Economy', 22.00);