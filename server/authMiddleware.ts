import { Request, Response, NextFunction } from 'express';
import { UserRole, UserRoleType } from '@shared/schema';

/**
 * Interface pour l'objet utilisateur stocké dans la session
 */
export interface SessionUser {
  id: number;
  username: string;
  email: string;
  role: string;
  therapistId?: number;
  isActive: boolean;
}

/**
 * Type étendu de Express.Request pour inclure les informations de l'utilisateur
 */
export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
  isAuthenticated(): boolean;
}

/**
 * Middleware pour vérifier si l'utilisateur est authentifié
 */
export function isAuthenticated(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Non autorisé - Veuillez vous connecter' });
  }
  next();
}

/**
 * Middleware pour vérifier si l'utilisateur a un rôle spécifique
 * @param roles Tableau des rôles autorisés
 */
export function hasRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non autorisé - Veuillez vous connecter' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé - Droits insuffisants' });
    }
    
    next();
  };
}

/**
 * Middleware pour autoriser uniquement les administrateurs
 */
export const isAdmin = hasRole([UserRole.ADMIN]);

/**
 * Middleware pour autoriser le personnel administratif (admin et secrétariat)
 */
export const isAdminStaff = hasRole([UserRole.ADMIN, UserRole.SECRETARIAT]);

/**
 * Middleware pour vérifier si l'utilisateur est un thérapeute accédant à ses propres données
 * Ce middleware permet à un thérapeute d'accéder uniquement à ses propres données,
 * mais permet aussi au personnel administratif d'accéder à toutes les données.
 */
export function isTherapistOwner(paramName: string = 'therapistId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non autorisé - Veuillez vous connecter' });
    }
    
    // Les administrateurs et le secrétariat ont accès à tout
    if ([UserRole.ADMIN, UserRole.SECRETARIAT].includes(req.user.role)) {
      return next();
    }
    
    // Les thérapeutes ne peuvent accéder qu'à leurs propres données
    const requestedTherapistId = parseInt(req.params[paramName]);
    
    if (
      req.user.role === UserRole.THERAPIST &&
      req.user.therapistId &&
      req.user.therapistId === requestedTherapistId
    ) {
      return next();
    }
    
    return res.status(403).json({ error: 'Accès refusé - Vous ne pouvez accéder qu\'à vos propres données' });
  };
}