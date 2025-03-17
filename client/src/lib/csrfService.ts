// Token CSRF stocké en mémoire
let csrfToken: string | null = null;

/**
 * Récupère un token CSRF depuis le serveur
 * @returns Le token CSRF
 */
export async function fetchCsrfToken(): Promise<string> {
  try {
    // Si nous avons déjà un token, le retourner
    if (csrfToken) {
      return csrfToken;
    }
    
    // Sinon, en demander un nouveau au serveur
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    csrfToken = data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Erreur lors de la récupération du token CSRF:', error);
    throw new Error('Impossible de récupérer le token CSRF');
  }
}

/**
 * Ajoute le token CSRF aux en-têtes d'une requête
 * @param headers En-têtes existants
 * @returns En-têtes avec le token CSRF ajouté
 */
export async function withCsrfToken(headers: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await fetchCsrfToken();
  return {
    ...headers,
    'X-CSRF-Token': token
  };
}

/**
 * Réinitialise le token CSRF (à utiliser après une déconnexion ou une erreur CSRF)
 */
export function resetCsrfToken(): void {
  csrfToken = null;
}