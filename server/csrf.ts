import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

// Configurer le middleware CSRF
export const csrfProtection = csrf({
  cookie: {
    key: '_csrf',
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 jour
  }
});

// Middleware pour gérer les erreurs CSRF
export function handleCsrfError(err: any, req: Request, res: Response, next: NextFunction) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  
  // Enregistrer la tentative d'attaque CSRF potentielle
  console.error(`Erreur CSRF détectée: ${req.method} ${req.path} - IP: ${req.ip}`);
  
  // Renvoyer une erreur 403 Forbidden
  return res.status(403).json({
    error: 'Session expirée ou token de sécurité invalide',
    code: 'CSRF_ERROR'
  });
}

// Middleware pour fournir le token CSRF à l'API
export function csrfApiProtection(req: Request, res: Response, next: NextFunction) {
  // Ne pas appliquer la protection CSRF aux endpoints spécifiques
  const excludedPaths = [
    '/api/auth/login',      // Login doit être accessible sans CSRF token
    '/api/auth/register'    // Register également
  ];
  
  if (excludedPaths.includes(req.path)) {
    return next();
  }
  
  // Appliquer la protection CSRF pour toutes les autres routes API
  return csrfProtection(req, res, next);
}

// Route pour fournir le token CSRF au client
export function setupCsrfRoutes(app: any) {
  app.get('/api/csrf-token', csrfProtection, (req: Request, res: Response) => {
    res.json({ csrfToken: req.csrfToken() });
  });
}