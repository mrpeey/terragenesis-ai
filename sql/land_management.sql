-- Schema for TerraGenesis AI - land_management
CREATE DATABASE IF NOT EXISTS terragenesis_ai;
USE terragenesis_ai;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    user_type ENUM('farmer', 'landowner', 'ngo', 'government') NOT NULL
);

CREATE TABLE IF NOT EXISTS land_parcels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    coordinates POLYGON NOT NULL,
    area_hectares DECIMAL(10,2),
    soil_type ENUM('sandy', 'clay', 'loam', 'peat'),
    degradation_level ENUM('low', 'moderate', 'high', 'severe'),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ai_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parcel_id INT,
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ndvi_index DECIMAL(5,2),
    soil_moisture DECIMAL(5,2),
    erosion_risk DECIMAL(5,2),
    recommendations JSON,
    FOREIGN KEY (parcel_id) REFERENCES land_parcels(id)
);

CREATE TABLE IF NOT EXISTS regeneration_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parcel_id INT,
    creation_date DATE,
    implementation_status ENUM('pending', 'in_progress', 'completed'),
    soil_strategy TEXT,
    vegetation_strategy TEXT,
    water_strategy TEXT,
    timeline_months INT,
    FOREIGN KEY (parcel_id) REFERENCES land_parcels(id)
);

-- Seed example user and parcel (optional)
INSERT IGNORE INTO users (id, name, email, user_type) VALUES (1, 'Demo User', 'demo@example.com', 'landowner');
INSERT IGNORE INTO land_parcels (id, user_id, coordinates, area_hectares, soil_type, degradation_level) 
VALUES (1, 1, ST_GeomFromText('POLYGON((36.80 -1.29,36.84 -1.29,36.84 -1.30,36.80 -1.30,36.80 -1.29))'), 5.00, 'loam', 'moderate');
