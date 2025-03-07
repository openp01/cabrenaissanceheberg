import { MailService } from '@sendgrid/mail';
import { InvoiceWithDetails } from '@shared/schema';

// Initialiser le service SendGrid avec la clé API
const initSendGrid = (): MailService => {
  // Vérifier que la clé API SendGrid est disponible
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('La variable d\'environnement SENDGRID_API_KEY doit être définie');
  }

  // Créer une instance du service mail
  const mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  
  return mailService;
};

/**
 * Envoie une notification par email lorsqu'une facture est téléchargée
 * @param invoice Détails de la facture téléchargée
 * @returns Informations sur l'email envoyé
 */
export async function sendInvoiceDownloadNotification(invoice: InvoiceWithDetails): Promise<{ success: boolean; error?: any }> {
  try {
    // Initialiser le service SendGrid
    const mailService = initSendGrid();

    // L'adresse destinataire - à configurer selon vos besoins
    const recipientEmail = 'jarviswriting01@gmail.com';
    
    // Adresse d'expéditeur vérifiée sur SendGrid (utiliser l'adresse avec laquelle vous avez créé votre compte)
    // Dans un environnement de production, assurez-vous que cette adresse est vérifiée dans SendGrid
    const senderEmail = 'jarviswriting01@gmail.com';

    // Préparer le contenu de l'email
    const emailContent = `
      <h1>Notification de téléchargement de facture</h1>
      <p>Une facture a été téléchargée par un utilisateur du système.</p>
      <h2>Détails de la facture</h2>
      <ul>
        <li><strong>Numéro de facture:</strong> ${invoice.invoiceNumber}</li>
        <li><strong>Date d'émission:</strong> ${invoice.issueDate}</li>
        <li><strong>Patient:</strong> ${invoice.patientName}</li>
        <li><strong>Orthophoniste:</strong> ${invoice.therapistName}</li>
        <li><strong>Montant:</strong> ${invoice.totalAmount}€</li>
        <li><strong>Statut:</strong> ${invoice.status}</li>
      </ul>
      <p>Ce message est automatique, merci de ne pas y répondre.</p>
    `;

    // Configuration de l'email
    const msg = {
      to: recipientEmail,
      from: senderEmail,
      subject: `Téléchargement de facture ${invoice.invoiceNumber}`,
      text: `Notification de téléchargement de facture: ${invoice.invoiceNumber} pour ${invoice.patientName}`,
      html: emailContent,
    };

    // Envoyer l'email
    await mailService.send(msg);

    console.log(`Notification d'email envoyée pour la facture ${invoice.invoiceNumber}`);
    console.log(`Email envoyé à: ${recipientEmail}`);

    return {
      success: true
    };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de notification:', error);
    return {
      success: false,
      error
    };
  }
}