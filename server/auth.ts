import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { authService } from "./authService";
import { SessionUser, isAuthenticated, isAdmin } from "./authMiddleware";
import { UserRole, UserRoleType, User } from "@shared/schema";
import { createId } from "@paralleldrive/cuid2";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import bcrypt from "bcrypt";

// Étendre les types Express
declare global {
  namespace Express {
    interface User extends SessionUser {}
  }
}

/**
 * Configure l'authentification avec Passport.js
 * @param app L'application Express
 */
export function setupAuth(app: Express) {
  // Initialiser le store PostgreSQL pour les sessions
  const PgSession = connectPgSimple(session);
  
  // Configuration de la session
  const isProduction = process.env.NODE_ENV === 'production';
  
  const sessionSettings: session.SessionOptions = {
    store: new PgSession({
      pool: pool as any, // Conversion de type nécessaire pour la compatibilité
      tableName: 'session', // Le nom de la table pour stocker les sessions
      createTableIfMissing: true // Créer la table si elle n'existe pas
    }),
    secret: process.env.SESSION_SECRET || createId(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // Activer en production, désactiver en développement
      httpOnly: true, // Toujours activé pour empêcher l'accès via JavaScript
      maxAge: 24 * 60 * 60 * 1000, // 1 jour
      sameSite: isProduction ? 'strict' : 'lax', // Plus sécurisé en production
      path: '/',
    }
  };

  // Initialiser la session et Passport
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configurer la stratégie d'authentification locale
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Journalisation réduite en production
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Tentative de connexion pour l'utilisateur: ${username}`);
        }
        
        const user = await authService.validateUser(username, password);
        if (!user) {
          // Toujours journaliser les échecs d'authentification pour des raisons de sécurité
          console.log(`Échec d'authentification pour l'utilisateur: ${username}`);
          return done(null, false, { message: "Identifiants incorrects" });
        }
        
        // Convertir l'utilisateur en objet de session
        const sessionUser: SessionUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role as UserRoleType,
          therapistId: user.therapistId || undefined,
          isActive: user.isActive
        };
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Authentification réussie pour l'utilisateur: ${username}, ID: ${user.id}, Rôle: ${user.role}`);
        }
        return done(null, sessionUser);
      } catch (error) {
        console.error(`Erreur lors de l'authentification:`, error);
        return done(error);
      }
    })
  );

  // Sérialisation de l'utilisateur pour la session
  passport.serializeUser((user: SessionUser, done) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Sérialisation de l'utilisateur ID:${user.id} pour la session`);
    }
    done(null, user.id);
  });

  // Désérialisation de l'utilisateur à partir de la session
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Journalisation limitée en production
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Tentative de désérialisation pour l'utilisateur ID:${id}`);
      }
      
      const user = await authService.getUser(id);
      if (!user) {
        console.log(`Utilisateur ID:${id} non trouvé lors de la désérialisation`);
        return done(null, false);
      }
      if (!user.isActive) {
        console.log(`Utilisateur ID:${id} inactif lors de la désérialisation`);
        return done(null, false);
      }
      
      // Convertir l'utilisateur en objet de session
      const sessionUser: SessionUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role as UserRoleType,
        therapistId: user.therapistId || undefined,
        isActive: user.isActive
      };
      
      // Journalisation limitée en production
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Désérialisation réussie pour l'utilisateur ID:${id}, Rôle:${user.role}`);
      }
      
      done(null, sessionUser);
    } catch (error) {
      console.error(`Erreur lors de la désérialisation de l'utilisateur ID:${id}:`, error);
      done(error);
    }
  });

  // Routes d'authentification
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    // Cette fonction ne sera exécutée que si l'authentification réussit
    const user = req.user as SessionUser;
    console.log(`Login réussi - réponse à la requête pour l'utilisateur ID:${user.id}, Cookie de session présent:`, !!req.cookies['connect.sid']);
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      therapistId: user.therapistId,
    });
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.json({ message: "Déconnecté avec succès" });
    });
  });
  
  // Route pour récupérer la liste des utilisateurs (admin uniquement)
  app.get("/api/auth/users", isAdmin, async (req, res) => {
    try {
      const users = await authService.getAllUsers();
      
      // Ne pas envoyer les mots de passe hashés
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        therapistId: user.therapistId,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        isActive: user.isActive
      }));
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs" });
    }
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Non authentifié" });
    }
    
    const user = req.user as SessionUser;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      therapistId: user.therapistId,
    });
  });
  
  // Route pour changer le mot de passe d'un utilisateur connecté
  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = (req.user as SessionUser).id;
      
      // Vérifier que les données requises sont présentes
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: "Tous les champs sont requis" });
      }
      
      // Vérifier que les mots de passe correspondent
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Les nouveaux mots de passe ne correspondent pas" });
      }
      
      // Récupérer l'utilisateur pour vérifier le mot de passe actuel
      const user = await authService.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }
      
      // Vérifier le mot de passe actuel
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Mot de passe actuel incorrect" });
      }
      
      // Mettre à jour le mot de passe
      await authService.updateUser(userId, { password: newPassword });
      
      res.json({ success: true, message: "Mot de passe modifié avec succès" });
    } catch (error) {
      console.error("Erreur lors du changement de mot de passe:", error);
      res.status(500).json({ error: "Erreur lors du changement de mot de passe" });
    }
  });
  
  // Route pour désactiver un compte utilisateur (admin uniquement)
  app.post("/api/auth/deactivate-user/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Vérifier que l'utilisateur existe
      const user = await authService.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }
      
      // Empêcher la désactivation de son propre compte
      if (userId === (req.user as SessionUser).id) {
        return res.status(400).json({ error: "Vous ne pouvez pas désactiver votre propre compte" });
      }
      
      // Désactiver l'utilisateur
      const success = await authService.deactivateUser(userId);
      
      if (success) {
        res.json({ success: true, message: "Compte utilisateur désactivé avec succès" });
      } else {
        res.status(500).json({ error: "Erreur lors de la désactivation du compte" });
      }
    } catch (error) {
      console.error("Erreur lors de la désactivation du compte:", error);
      res.status(500).json({ error: "Erreur lors de la désactivation du compte" });
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      // Vérifier que l'utilisateur est autorisé à créer un autre utilisateur (admin uniquement)
      if (req.isAuthenticated() && req.user && (req.user as SessionUser).role !== UserRole.ADMIN) {
        return res.status(403).json({ error: "Seuls les administrateurs peuvent créer de nouveaux utilisateurs" });
      }
      
      const { username, password, email, role, therapistId } = req.body;
      
      const newUser = await authService.createUser({
        username,
        password,
        email,
        role,
        therapistId,
        isActive: true,
      });
      
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        therapistId: newUser.therapistId,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        next(error);
      }
    }
  });
}