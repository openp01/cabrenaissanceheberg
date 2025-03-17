import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieParser from "cookie-parser";
import { loginRateLimiter } from "./rateLimit";
import { csrfApiProtection, handleCsrfError, setupCsrfRoutes } from "./csrf";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/images', express.static('public/images'));

// Protection contre les attaques par force brute
app.use(loginRateLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Configurer les routes CSRF
  setupCsrfRoutes(app);
  
  // Appliquer la protection CSRF pour les routes API
  app.use('/api', csrfApiProtection);
  
  // Gestionnaire d'erreurs CSRF
  app.use(handleCsrfError);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Toujours consigner l'erreur complète pour le débogage
    console.error('Erreur serveur:', err);
    
    // En production, envoyer un message générique
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Déterminer le statut HTTP approprié
    const status = err.status || err.statusCode || 500;
    
    // Personnaliser la réponse en fonction du type d'erreur
    if (err.name === 'ValidationError' || err.name === 'ZodError') {
      return res.status(400).json({ 
        error: "Données d'entrée invalides", 
        details: isProduction ? undefined : err.errors 
      });
    }
    
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({ error: "Accès non autorisé" });
    }
    
    // Erreur par défaut, générique en production
    const errorMessage = isProduction 
      ? "Une erreur est survenue lors du traitement de votre demande" 
      : err.message || "Erreur interne du serveur";
    
    res.status(status).json({ error: errorMessage });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
