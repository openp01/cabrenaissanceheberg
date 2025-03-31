const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Routes API de base
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir les fichiers statiques
app.use(express.static(path.join(process.cwd(), 'client/dist/public')));

// Route de fallback pour SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client/dist/public/index.html'));
});

// Démarrage simple du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Railway server running on port ${PORT}`);
}); 