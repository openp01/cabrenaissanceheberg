import { Request, Response, NextFunction } from 'express';

// Simple système de limitation de taux pour prévenir les attaques par force brute
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes en millisecondes

// Stocker les tentatives de connexion en mémoire
// Dans une application de production réelle, on utiliserait une solution plus robuste comme Redis
interface LoginAttempt {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const loginAttempts: Record<string, LoginAttempt> = {};

/**
 * Nettoie périodiquement les entrées expirées pour éviter les fuites de mémoire
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  Object.keys(loginAttempts).forEach(key => {
    const attempt = loginAttempts[key];
    if (attempt.blockedUntil && attempt.blockedUntil < now) {
      delete loginAttempts[key];
    } else if (!attempt.blockedUntil && (now - attempt.firstAttempt) > LOGIN_BLOCK_DURATION) {
      delete loginAttempts[key];
    }
  });
}

// Nettoyer le stockage toutes les 30 minutes
setInterval(cleanupExpiredEntries, 30 * 60 * 1000);

/**
 * Middleware pour limiter les tentatives de connexion
 */
export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  // N'appliquer qu'aux routes de connexion
  if (req.path !== '/api/auth/login' || req.method !== 'POST') {
    return next();
  }

  // Utiliser l'adresse IP comme identifiant
  // Dans une application réelle, on pourrait utiliser une combinaison de facteurs
  const identifier = req.ip;
  const now = Date.now();

  // Vérifier si cet identifiant est déjà bloqué
  if (loginAttempts[identifier] && loginAttempts[identifier].blockedUntil) {
    if (loginAttempts[identifier].blockedUntil! > now) {
      const remainingTimeMinutes = Math.ceil((loginAttempts[identifier].blockedUntil! - now) / 60000);
      return res.status(429).json({
        error: `Trop de tentatives de connexion. Veuillez réessayer dans ${remainingTimeMinutes} minute(s).`
      });
    } else {
      // La période de blocage est terminée, réinitialiser
      delete loginAttempts[identifier];
    }
  }

  // Initialiser ou augmenter le compteur
  if (!loginAttempts[identifier]) {
    loginAttempts[identifier] = {
      count: 1,
      firstAttempt: now
    };
  } else {
    loginAttempts[identifier].count++;
  }

  // Si trop de tentatives, bloquer
  if (loginAttempts[identifier].count > MAX_LOGIN_ATTEMPTS) {
    loginAttempts[identifier].blockedUntil = now + LOGIN_BLOCK_DURATION;
    return res.status(429).json({
      error: `Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.`
    });
  }

  // Intercepter la réponse pour réinitialiser le compteur en cas de succès
  const originalSend = res.send;
  res.send = function(body): Response {
    if (res.statusCode === 200 && identifier in loginAttempts) {
      delete loginAttempts[identifier];
    }
    return originalSend.call(this, body);
  };

  next();
}