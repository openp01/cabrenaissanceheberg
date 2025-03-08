import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { authService } from "./authService";
import { SessionUser } from "./authMiddleware";
import { UserRole, UserRoleType, User } from "@shared/schema";
import { createId } from "@paralleldrive/cuid2";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

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
      secure: false, // Désactivé pour assurer la compatibilité avec l'environnement de déploiement
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 jour
      sameSite: 'lax', // Permettre les requêtes cross-site pour faciliter le développement
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
        const user = await authService.validateUser(username, password);
        if (!user) {
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
        
        return done(null, sessionUser);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Sérialisation de l'utilisateur pour la session
  passport.serializeUser((user: SessionUser, done) => {
    done(null, user.id);
  });

  // Désérialisation de l'utilisateur à partir de la session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await authService.getUser(id);
      if (!user) {
        return done(null, false);
      }
      if (!user.isActive) {
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
      
      done(null, sessionUser);
    } catch (error) {
      done(error);
    }
  });

  // Routes d'authentification
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    // Cette fonction ne sera exécutée que si l'authentification réussit
    const user = req.user as SessionUser;
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