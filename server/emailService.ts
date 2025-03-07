import nodemailer from 'nodemailer';
import { InvoiceWithDetails } from '@shared/schema';

// Création d'un transporteur pour l'envoi d'emails
// Note: En environnement de production, vous utiliserez un service SMTP réel
// Pour le développement, nous utilisons le service Ethereal qui capture les emails
// sans les envoyer réellement (sandbox)
export async function getEmailTransporter() {
  // Créer un compte de test Ethereal
  const testAccount = await nodemailer.createTestAccount();

  // Créer un transporteur réutilisable utilisant le service par défaut SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true pour 465, false pour les autres ports
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return {
    transporter,
    previewUrl: (messageId: string) => {
      const url = nodemailer.getTestMessageUrl({ id: messageId } as any);
      return typeof url === 'string' ? url : undefined;
    },
    testAccount
  };
}

/**
 * Envoie une notification par email lorsqu'une facture est téléchargée
 * @param invoice Détails de la facture téléchargée
 * @returns Informations sur l'email envoyé
 */
export async function sendInvoiceDownloadNotification(invoice: InvoiceWithDetails): Promise<{ success: boolean; messageUrl?: string; error?: any }> {
  try {
    // Créer le transporteur d'email
    const { transporter, previewUrl } = await getEmailTransporter();

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

    // Envoyer l'email
    const info = await transporter.sendMail({
      from: '"Cabinet Orthophonie" <notifications@orthophonie-cabinet.fr>',
      to: 'jarviswriting01@gmail.com',
      subject: `Téléchargement de facture ${invoice.invoiceNumber}`,
      text: `Notification de téléchargement de facture: ${invoice.invoiceNumber} pour ${invoice.patientName}`,
      html: emailContent,
    });

    console.log('Message envoyé: %s', info.messageId);
    
    // En environnement de développement, obtenir l'URL de prévisualisation
    const messageUrl = previewUrl(info.messageId);
    if (messageUrl) {
      console.log('URL de prévisualisation: %s', messageUrl);
    }

    return {
      success: true,
      messageUrl: messageUrl || undefined
    };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de notification:', error);
    return {
      success: false,
      error
    };
  }
}