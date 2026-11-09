/**
 * Cloud Code Router - Auth Utilities
 * 
 * Benutzerkonten, Passwort-Hashing und JWT-Token für den Router-zu-Router Chat.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logger } = require('../middleware/logger');

const USERS_FILE = path.join(process.cwd(), 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = '7d';

/**
 * Lädt alle Benutzer aus der Datei
 * @returns {Array} Benutzerliste
 */
function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Fehler beim Laden der Benutzer:', error);
    return [];
  }
}

/**
 * Speichert alle Benutzer in die Datei
 * @param {Array} users - Benutzerliste
 */
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    logger.error('Fehler beim Speichern der Benutzer:', error);
    throw error;
  }
}

/**
 * Registriert einen neuen Benutzer
 * @param {string} username - Benutzername
 * @param {string} password - Passwort
 * @returns {Object} Ergebnis
 */
function registerUser(username, password) {
  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return { success: false, error: 'Benutzername bereits vergeben' };
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = {
    id: crypto.randomBytes(16).toString('hex'),
    username,
    passwordHash,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);

  return {
    success: true,
    user: { id: user.id, username: user.username, createdAt: user.createdAt }
  };
}

/**
 * Authentifiziert einen Benutzer
 * @param {string} username - Benutzername
 * @param {string} password - Passwort
 * @returns {Object} Ergebnis mit Token bei Erfolg
 */
function authenticateUser(username, password) {
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) {
    return { success: false, error: 'Ungültiger Benutzername oder Passwort' };
  }

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: 'Ungültiger Benutzername oder Passwort' };
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    success: true,
    token,
    user: { id: user.id, username: user.username }
  };
}

/**
 * Verifiziert ein JWT-Token und gibt den Benutzer zurück
 * @param {string} token - JWT-Token
 * @returns {Object|null} Benutzer oder null
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = loadUsers();
    const user = users.find(u => u.id === decoded.userId);
    if (!user) return null;
    return { id: user.id, username: user.username };
  } catch (error) {
    return null;
  }
}

/**
 * Extrahiert das Token aus dem Authorization-Header
 * @param {Object} req - Express Request
 * @returns {string|null} Token oder null
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

module.exports = {
  USERS_FILE,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  loadUsers,
  saveUsers,
  registerUser,
  authenticateUser,
  verifyToken,
  extractToken
};
