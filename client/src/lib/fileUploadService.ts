/**
 * Service de simulation d'upload de fichiers
 * 
 * Dans une implémentation réelle, ce service interagirait avec un serveur
 * pour télécharger les fichiers et récupérer leurs URLs.
 */

/**
 * Génère une URL simulée pour un fichier
 * @param file Fichier à télécharger
 * @param prefix Préfixe pour l'URL (par défaut: 'receipts')
 * @returns URL simulée du fichier
 */
export async function uploadFile(file: File, prefix: string = 'receipts'): Promise<string> {
  // Simuler un délai pour le téléchargement
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Générer un identifiant unique pour éviter les collisions de noms
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  
  // Simuler une URL avec le nom du fichier
  const fileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const fileUrl = `https://storage.example.com/${prefix}/${uniqueId}_${fileName}`;
  
  console.log(`Fichier téléchargé (simulé): ${fileUrl}`);
  
  return fileUrl;
}

/**
 * Simule la suppression d'un fichier stocké
 * @param fileUrl URL du fichier à supprimer
 * @returns true si la suppression a réussi
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  // Simuler un délai pour la suppression
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`Fichier supprimé (simulé): ${fileUrl}`);
  
  return true;
}

/**
 * Extrait le nom du fichier à partir de son URL
 * @param fileUrl URL du fichier
 * @returns Nom du fichier
 */
export function getFileNameFromUrl(fileUrl: string): string {
  if (!fileUrl) return '';
  
  const urlParts = fileUrl.split('/');
  const fileName = urlParts[urlParts.length - 1];
  
  // Supprimer l'identifiant unique du nom du fichier
  const nameWithoutId = fileName.indexOf('_') > 0 
    ? fileName.substring(fileName.indexOf('_') + 1) 
    : fileName;
  
  // Remplacer les caractères spéciaux par des espaces
  return nameWithoutId.replace(/_/g, ' ');
}

/**
 * Vérifie si l'extension du fichier est une image
 * @param fileName Nom du fichier
 * @returns true si le fichier est une image
 */
export function isImageFile(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
}

/**
 * Vérifie si l'extension du fichier est un PDF
 * @param fileName Nom du fichier
 * @returns true si le fichier est un PDF
 */
export function isPdfFile(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension === 'pdf';
}